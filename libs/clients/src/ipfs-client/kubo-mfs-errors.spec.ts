import {
  isKuboMfsEntryAlreadyExists,
  kuboApiErrorMessage,
} from './kubo-mfs-errors';

describe('kuboApiErrorMessage', () => {
  it('reads Message from Kubo JSON body', () => {
    expect(
      kuboApiErrorMessage(
        '{"Message":"cp: directory already has entry by that name","Code":0}',
      ),
    ).toBe('cp: directory already has entry by that name');
  });
});

describe('isKuboMfsEntryAlreadyExists', () => {
  it('detects duplicate MFS entry on 500', () => {
    expect(
      isKuboMfsEntryAlreadyExists(
        500,
        '{"Message":"cp: cannot put node in path /images/foo.webp: directory already has entry by that name"}',
      ),
    ).toBe(true);
  });

  it('returns false for other errors', () => {
    expect(isKuboMfsEntryAlreadyExists(404, '{"Message":"not found"}')).toBe(
      false,
    );
  });
});
