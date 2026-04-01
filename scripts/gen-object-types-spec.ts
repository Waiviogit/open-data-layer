import fs from 'fs';
import path from 'path';

import {
  OBJECT_TYPE_REGISTRY,
  type ObjectTypeDefinition,
} from '../libs/core/src/object-type-registry';

const ROOT = path.resolve(__dirname, '..');
const SPEC_DIR = path.join(ROOT, 'generated/object-types');
const OBJECT_UPDATES_SPEC = '../object-updates';

function examplePayload(objectType: string): string {
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

function mdDoc(
  objectType: string,
  def: ObjectTypeDefinition,
): string {
  const supportedList = def.supported_updates.length
    ? def.supported_updates
        .slice()
        .sort()
        .map((u) => `[\`${u}\`](${OBJECT_UPDATES_SPEC}/${u}.md)`)
        .join('\n')
    : '(none)';

  const supposedList =
    def.supposed_updates.length > 0
      ? [...def.supposed_updates]
          .sort((a, b) => a.update_type.localeCompare(b.update_type))
          .map((s) => {
            const values = Array.isArray(s.values)
              ? s.values.map((v) => JSON.stringify(v)).join(', ')
              : String(s.values);
            return `\`${s.update_type}\`: ${values}`;
          })
          .join('\n')
      : '(none)';

  const purposeLine = def.description ? def.description : '(none)';

  return `# ${objectType}

- **Object type name:** \`${objectType}\`
- **Object description:** ${purposeLine}

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
  if (!fs.existsSync(SPEC_DIR)) {
    fs.mkdirSync(SPEC_DIR, { recursive: true });
  }

  const entries: { objectType: string; file: string }[] = [];

  for (const [objectType, def] of Object.entries(OBJECT_TYPE_REGISTRY)) {
    const mdPath = path.join(SPEC_DIR, `${objectType}.md`);
    const mdContent = mdDoc(objectType, def);
    fs.writeFileSync(mdPath, mdContent, 'utf8');
    entries.push({ objectType, file: `${objectType}.md` });
  }

  const readme = `# Object types

Specification for each ODL object type (supported/supposed updates, create payload example).

| Object type | Spec |
|-------------|------|
${entries
  .sort((a, b) => a.objectType.localeCompare(b.objectType))
  .map((e) => `| \`${e.objectType}\` | [${e.objectType}.md](${e.file}) |`)
  .join('\n')}
`;

  fs.writeFileSync(path.join(SPEC_DIR, 'README.md'), readme, 'utf8');
  // eslint-disable-next-line no-console
  console.log(
    'Generated',
    entries.length,
    'object-type spec files + README.md in generated/object-types/',
  );
}

main();

