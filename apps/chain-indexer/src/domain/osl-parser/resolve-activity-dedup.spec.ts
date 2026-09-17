import { resolveDupGroupId } from './resolve-activity-dedup';

describe('resolveDupGroupId', () => {
  const sortTime = 1_700_000_000;

  it('returns own id when no fingerprint signal is present', () => {
    expect(
      resolveDupGroupId({
        messageId: 'new-1',
        incoming: {
          fingerprintV: 1,
          textSimhash: null,
          imagePhashes: [],
          sourceTimeUnix: sortTime,
        },
        candidates: [],
      }),
    ).toBe('new-1');
  });

  it('joins an existing cluster root', () => {
    expect(
      resolveDupGroupId({
        messageId: 'new-1',
        incoming: {
          fingerprintV: 1,
          textSimhash: BigInt('0x0f0f0f0f0f0f0f0f'),
          imagePhashes: [],
          sourceTimeUnix: sortTime,
        },
        candidates: [
          {
            message_id: 'member-2',
            dup_group_id: 'root-1',
            text_simhash: BigInt('0x0f0f0f0f0f0f0f0f'),
            image_phashes: [],
            sort_time_unix: sortTime,
            event_seq: BigInt(10),
          },
        ],
      }),
    ).toBe('root-1');
  });

  it('picks the earliest cluster when several match', () => {
    expect(
      resolveDupGroupId({
        messageId: 'new-1',
        incoming: {
          fingerprintV: 1,
          textSimhash: BigInt('0x0f0f0f0f0f0f0f0f'),
          imagePhashes: [],
          sourceTimeUnix: sortTime,
        },
        candidates: [
          {
            message_id: 'root-b',
            dup_group_id: 'root-b',
            text_simhash: BigInt('0x0f0f0f0f0f0f0f0f'),
            image_phashes: [],
            sort_time_unix: sortTime,
            event_seq: BigInt(20),
          },
          {
            message_id: 'root-a',
            dup_group_id: 'root-a',
            text_simhash: BigInt('0x0f0f0f0f0f0f0f0f'),
            image_phashes: [],
            sort_time_unix: sortTime,
            event_seq: BigInt(10),
          },
        ],
      }),
    ).toBe('root-a');
  });
});
