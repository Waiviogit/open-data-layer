import fs from 'fs';
import path from 'path';
import { z, toJSONSchema } from 'zod';

import {
  UPDATE_REGISTRY,
  type UpdateDefinition,
} from '../libs/core/src/update-registry';

const ROOT = path.resolve(__dirname, '..');
const SPEC_DIR = path.join(ROOT, 'spec/object-updates');

function payloadField(kind: UpdateDefinition['value_kind']): string {
  if (kind === 'text') return 'value_text';
  if (kind === 'geo') return 'value_geo';
  return 'value_json';
}

function examplePayload(
  valueKind: UpdateDefinition['value_kind'],
  updateType: string,
): string {
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

function schemaToMarkdown(def: UpdateDefinition): string {
  if (!def.schema || !(def.schema instanceof z.ZodType)) {
    return '// schema not available';
  }

  try {
    const jsonSchema = toJSONSchema(def.schema, { reused: 'inline' });
    return JSON.stringify(jsonSchema, null, 2);
  } catch {
    return '// schema not serializable to JSON Schema';
  }
}

function mdDoc(
  updateType: string,
  def: UpdateDefinition,
  schemaBlock: string,
): string {
  const card = def.cardinality === 'multi' ? 'multi' : 'single';
  const kind = def.value_kind;
  const purposeLine = def.description || '(none)';

  return `# ${updateType}

- **Update type:** \`${updateType}\`
- **Update description:** ${purposeLine}
- **Cardinality:** ${card}
- **Payload kind:** ${kind}
- **Payload validation requirements (JSON Schema derived from Zod):**

\`\`\`json
${schemaBlock || '// schema not available'}
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
  if (!fs.existsSync(SPEC_DIR)) {
    fs.mkdirSync(SPEC_DIR, { recursive: true });
  }

  const entries: { updateType: string; file: string }[] = [];

  // UPDATE_REGISTRY keys are the concrete update type strings, e.g. 'address'.
  for (const [updateType, def] of Object.entries(UPDATE_REGISTRY)) {
    const schemaBlock = schemaToMarkdown(def);
    const mdPath = path.join(SPEC_DIR, `${updateType}.md`);
    const content = mdDoc(updateType, def, schemaBlock);
    fs.writeFileSync(mdPath, content, 'utf8');
    entries.push({ updateType, file: `${updateType}.md` });
  }

  const readme = `# Object updates

Specification for each ODL object update type (payload shape, validation, broadcast example).

| Update type | Spec |
|-------------|------|
${entries
  .sort((a, b) => a.updateType.localeCompare(b.updateType))
  .map((e) => `| \`${e.updateType}\` | [${e.updateType}.md](${e.file}) |`)
  .join('\n')}
`;

  fs.writeFileSync(path.join(SPEC_DIR, 'README.md'), readme, 'utf8');
  // eslint-disable-next-line no-console
  console.log(
    'Generated',
    entries.length,
    'spec files + README.md in spec/object-updates/',
  );
}

main();

