import type { ObjectTypeDefinition } from '@opden-data-layer/core/object-type-registry';

const OBJECT_UPDATES_SPEC = '../object-updates';

export function objectTypeExamplePayload(objectType: string): string {
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

export function serializeObjectType(
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
${objectTypeExamplePayload(objectType)}
\`\`\`
`;
}
