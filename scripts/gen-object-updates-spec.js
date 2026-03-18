/**
 * Generates spec/object-updates/*.md from libs/core update definitions.
 * Run from repo root: node scripts/gen-object-updates-spec.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const UPDATE_TYPES_PATH = path.join(ROOT, 'libs/core/src/update-registry/update-types.ts');
const UPDATES_DIR = path.join(ROOT, 'libs/core/src/update-registry/updates');
const SPEC_DIR = path.join(ROOT, 'spec/object-updates');

// Parse UPDATE_TYPES to get KEY -> string value (e.g. ADD_ON -> 'add_on')
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

// Extract schema snippet from file content (full chain e.g. z.string().min(1) or z.object({...}))
function extractSchemaSnippet(content) {
  const idx = content.indexOf('schema:');
  if (idx === -1) return '';
  // schema: z.xxx(...) or schema: z\n    .object(...) or schema: varName - find start of value
  const fromSchema = content.slice(idx);
  const zMatch = fromSchema.match(/\bz\s*\./);
  let start = zMatch ? idx + zMatch.index : -1;
  if (start === -1) {
    // Variable reference (e.g. geoPointSchema) - find const x = z.... and extract to matching "});"
    const varMatch = content.match(/schema:\s*(\w+)/);
    if (varMatch) {
      const name = varMatch[1];
      const constIdx = content.indexOf('const ' + name + ' =');
      if (constIdx !== -1) {
        const zStart = content.indexOf('z.', constIdx);
        if (zStart !== -1) {
          let depth = 0;
          for (let i = zStart; i < content.length; i++) {
            const c = content[i];
            if (c === '(' || c === '{' || c === '[') depth++;
            else if (c === ')' || c === '}' || c === ']') depth--;
            if (depth === 0 && c === ')') {
              return content.slice(zStart, i + 1).trim();
            }
          }
        }
      }
    }
    return '';
  }
  // Find end of schema value: at depth 0, stop at comma (before next key) or at "});" / "}),"
  const afterSchema = content.slice(start);
  let depth = 0;
  let end = 0;
  let inString = false;
  let stringChar = null;
  for (let i = 0; i < afterSchema.length; i++) {
    const c = afterSchema[i];
    if (inString) {
      if (c === '\\') { i++; continue; }
      if (c === stringChar) inString = false;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { inString = true; stringChar = c; continue; }
    if (c === '(' || c === '{' || c === '[') depth++;
    else if (c === ')' || c === '}' || c === ']') depth--;
    if (depth === 0) {
      if (c === ',') { end = i; break; }
      if (c === '}' && afterSchema.slice(i, i + 3) === '});') { end = i + 3; break; }
      if (c === '}' && afterSchema.slice(i, i + 3) === '}),') { end = i + 3; break; }
    }
  }
  let snippet = (end > 0 ? afterSchema.slice(0, end) : afterSchema).trim();
  // If we cut at comma but schema has .refine(...), extend to "});"
  if (snippet.includes('.refine(') && !snippet.includes('});')) {
    const refineEnd = afterSchema.indexOf('});', snippet.length);
    if (refineEnd !== -1) snippet = afterSchema.slice(0, refineEnd + 3).trim();
  }
  return snippet;
}

function extractDefinition(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const typeKeyMatch = content.match(/update_type:\s*UPDATE_TYPES\.(\w+)/);
  const valueKindMatch = content.match(/value_kind:\s*'(\w+)'/);
  const cardinalityMatch = content.match(/cardinality:\s*'(\w+)'/);
  if (!typeKeyMatch || !valueKindMatch || !cardinalityMatch) return null;
  const descMatch = content.match(/description:\s*['"]([^'"]*)['"]/);
  const description = descMatch ? descMatch[1] : '';
  const schemaSnippet = extractSchemaSnippet(content);
  return {
    typeKey: typeKeyMatch[1],
    valueKind: valueKindMatch[1],
    cardinality: cardinalityMatch[1],
    description,
    schemaSnippet,
  };
}

function payloadField(kind) {
  if (kind === 'text') return 'value_text';
  if (kind === 'geo') return 'value_geo';
  return 'value_json';
}

function examplePayload(valueKind, updateType) {
  const field = payloadField(valueKind);
  const valueExample =
    valueKind === 'text'
      ? '"<string>"'
      : valueKind === 'geo'
        ? '{ "type": "Point", "coordinates": [lon, lat] }'
        : '{}  // or [] — valid JSON per schema';
  return `{
  object_id,
  update_type: '${updateType}',
  locale: 'en-US',
  ${field}: ${valueExample}
}`;
}

function mdDoc(updateType, def, schemaSnippet) {
  const card = def.cardinality === 'multi' ? 'multi' : 'single';
  const kind = def.valueKind;
  const purposeLine = def.description || '(none)';
  return `# ${updateType}

- **Update type name:** \`${updateType}\`
- **Update purpose:** ${purposeLine}
- **Cardinality:** ${card}
- **Payload kind:** ${kind}
- **Payload validation requirements (Zod schema):**

\`\`\`ts
${schemaSnippet || '—'}
\`\`\`

- **Example payload for broadcast:**

\`\`\`js
[
  'custom_json',
  {
    required_auths: [],
    required_posting_auths: [account],
    id: 'odl-mainnet',
    json: JSON.stringify({
      events: [
        {
          action: 'object_update',
          v: 1,
          payload: ${examplePayload(kind, updateType).replace(/\n/g, '\n          ')}
        }
      ]
    }),
  },
]
\`\`\`
`;
}

function main() {
  const typeMap = parseUpdateTypes();
  if (!fs.existsSync(SPEC_DIR)) {
    fs.mkdirSync(SPEC_DIR, { recursive: true });
  }

  const files = fs.readdirSync(UPDATES_DIR).filter((f) => f.endsWith('.ts'));
  const entries = [];

  for (const file of files.sort()) {
    const def = extractDefinition(path.join(UPDATES_DIR, file));
    if (!def) continue;
    const updateType = typeMap[def.typeKey];
    if (!updateType) {
      console.warn('Unknown type key:', def.typeKey, 'in', file);
      continue;
    }
    const mdPath = path.join(SPEC_DIR, `${updateType}.md`);
    const content = mdDoc(updateType, def, def.schemaSnippet);
    fs.writeFileSync(mdPath, content, 'utf8');
    entries.push({ updateType, file: `${updateType}.md` });
  }

  const readme = `# Object updates

Specification for each ODL object update type (payload shape, validation, broadcast example).

| Update type | Spec |
|-------------|------|
${entries.map((e) => `| \`${e.updateType}\` | [${e.updateType}.md](${e.file}) |`).join('\n')}
`;
  fs.writeFileSync(path.join(SPEC_DIR, 'README.md'), readme, 'utf8');
  console.log('Generated', entries.length, 'spec files + README.md in spec/object-updates/');
}

main();
