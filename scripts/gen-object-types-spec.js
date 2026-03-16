/**
 * Generates spec/object-types/*.md from libs/core object-type-registry definitions.
 * Run from repo root: node scripts/gen-object-types-spec.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OBJECT_TYPES_PATH = path.join(ROOT, 'libs/core/src/object-type-registry/object-types.ts');
const UPDATE_TYPES_PATH = path.join(ROOT, 'libs/core/src/update-registry/update-types.ts');
const OBJECT_TYPES_DIR = path.join(ROOT, 'libs/core/src/object-type-registry/object-types');
const SPEC_DIR = path.join(ROOT, 'spec/object-types');
const OBJECT_UPDATES_SPEC = '../object-updates';

function parseObjectTypes() {
  const content = fs.readFileSync(OBJECT_TYPES_PATH, 'utf8');
  const map = {};
  const re = /^\s+([A-Z_0-9]+):\s*'([^']*)'/gm;
  let m;
  while ((m = re.exec(content)) !== null) {
    map[m[1]] = m[2];
  }
  return map;
}

function parseUpdateTypes() {
  const content = fs.readFileSync(UPDATE_TYPES_PATH, 'utf8');
  const map = {};
  const re = /^\s+([A-Z_0-9]+):\s*'([^']+)'/gm;
  let m;
  while ((m = re.exec(content)) !== null) {
    map[m[1]] = m[2];
  }
  return map;
}

function extractObjectType(content, objectTypesMap) {
  const m = content.match(/object_type:\s*OBJECT_TYPES\.(\w+)/);
  if (!m) return null;
  return objectTypesMap[m[1]] || null;
}

function extractSupportedUpdates(content, updateTypesMap) {
  const start = content.indexOf('supported_updates: [');
  if (start === -1) return [];
  const bracketStart = start + 'supported_updates: ['.length;
  let depth = 1; // already inside the [
  let end = bracketStart;
  for (let i = bracketStart; i < content.length; i++) {
    const c = content[i];
    if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const block = content.slice(bracketStart, end);
  const result = [];
  const re = /UPDATE_TYPES\.(\w+)|'([^']*)'|"([^"]*)"/g;
  let match;
  while ((match = re.exec(block)) !== null) {
    if (match[1]) result.push(updateTypesMap[match[1]] || match[1]);
    else if (match[2] !== undefined) result.push(match[2]);
    else if (match[3] !== undefined) result.push(match[3]);
  }
  return result;
}

function extractSupposedUpdates(content, updateTypesMap) {
  const start = content.indexOf('supposed_updates: [');
  if (start === -1) return [];
  const bracketStart = start + 'supposed_updates: ['.length;
  if (content.slice(bracketStart, bracketStart + 20).match(/^\s*\]/)) return [];
  let depth = 1;
  let end = bracketStart;
  for (let i = bracketStart; i < content.length; i++) {
    const c = content[i];
    if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const block = content.slice(bracketStart, end);
  const result = [];
  const re = /\{\s*update_type:\s*(?:UPDATE_TYPES\.(\w+)|'([^']*)'|"([^"]*)"),\s*values:\s*(\[[\s\S]*?\])\s*,?\s*\}/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    const updateType = m[1] ? (updateTypesMap[m[1]] || m[1]) : (m[2] !== undefined ? m[2] : m[3]);
    let valuesStr = m[4];
    try {
      const values = JSON.parse(valuesStr.replace(/'/g, '"'));
      result.push({ update_type: updateType, values });
    } catch {
      result.push({ update_type: updateType, values: valuesStr });
    }
  }
  return result;
}

function examplePayload(objectType) {
  const safeId = objectType.replace(/&/g, '');
  return `[
  'custom_json',
  {
    required_auths: [],
    required_posting_auths: [account],
    id: 'odl-mainnet',
    json: JSON.stringify({
      events: [
        {
          action: 'object_create',
          v: 1,
          payload: {
            object_id: '${safeId}1',
            object_type: '${objectType}'
          }
        }
      ]
    }),
  },
]
`;
}

function mdDoc(objectType, supportedUpdates, supposedUpdates) {
  const supportedList = supportedUpdates.length
    ? supportedUpdates
        .map((u) => `[\`${u}\`](${OBJECT_UPDATES_SPEC}/${u}.md)`)
        .join('\n')
    : '(none)';
  const supposedList =
    supposedUpdates.length > 0
      ? [...supposedUpdates]
          .sort((a, b) => a.update_type.localeCompare(b.update_type))
          .map(
            (s) =>
              `\`${s.update_type}\`: ${Array.isArray(s.values) ? s.values.map((v) => JSON.stringify(v)).join(', ') : s.values}`
          )
          .join('\n')
      : '(none)';

  return `# ${objectType}

- **Object type name:** \`${objectType}\`
- **Object purpose:**

- **supported_updates**

${supportedList}

- **supposed_updates**

${supposedList}

- **Example payload for broadcast**

\`\`\`js
${examplePayload(objectType)}
\`\`\`
`;
}

function main() {
  const objectTypesMap = parseObjectTypes();
  const updateTypesMap = parseUpdateTypes();

  if (!fs.existsSync(SPEC_DIR)) {
    fs.mkdirSync(SPEC_DIR, { recursive: true });
  }

  const files = fs.readdirSync(OBJECT_TYPES_DIR).filter((f) => f.endsWith('.ts'));
  const entries = [];

  for (const file of files.sort()) {
    const content = fs.readFileSync(path.join(OBJECT_TYPES_DIR, file), 'utf8');
    const objectType = extractObjectType(content, objectTypesMap);
    if (!objectType) {
      console.warn('Could not extract object_type from', file);
      continue;
    }
    const supportedUpdates = extractSupportedUpdates(content, updateTypesMap);
    const supposedUpdates = extractSupposedUpdates(content, updateTypesMap);

    const mdPath = path.join(SPEC_DIR, `${objectType}.md`);
    const mdContent = mdDoc(objectType, supportedUpdates, supposedUpdates);
    fs.writeFileSync(mdPath, mdContent, 'utf8');
    entries.push({ objectType, file: `${objectType}.md` });
  }

  const readme = `# Object types

Specification for each ODL object type (supported/supposed updates, create payload example).

| Object type | Spec |
|-------------|------|
${entries.map((e) => `| \`${e.objectType}\` | [${e.objectType}.md](${e.file}) |`).join('\n')}
`;
  fs.writeFileSync(path.join(SPEC_DIR, 'README.md'), readme, 'utf8');
  console.log('Generated', entries.length, 'object-type spec files + README.md in spec/object-types/');
}

main();
