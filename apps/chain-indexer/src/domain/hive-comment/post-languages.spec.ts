import { languagesFromEldScores } from './post-languages';

/**
 * Score fixtures mirror `eld/small` `getScores()` on sample paragraphs (Node ESM probe).
 * Jest cannot load `eld/small`, so we assert the policy on representative maps.
 */
describe('languagesFromEldScores', () => {
  it('keeps Spanish and English when both score in a dead heat (bilingual post)', () => {
    const scoresFromEldSmall = {
      es: 0.7192903660453627,
      en: 0.7070541363955941,
      pt: 0.6268656716417911,
      tl: 0.5640041855958187,
      ca: 0.5072920772566023,
    };

    expect(languagesFromEldScores(scoresFromEldSmall)).toEqual(['es', 'en']);
  });

  it('keeps only Spanish when other Romance languages trail clearly (monolingual Spanish)', () => {
    const scoresFromEldSmall = {
      es: 0.8056435358479701,
      pt: 0.6820536975977392,
      ca: 0.5730550284629982,
      it: 0.5602605593192183,
      tl: 0.42455242966751916,
      sq: 0.4225834046693328,
    };

    expect(languagesFromEldScores(scoresFromEldSmall)).toEqual(['es']);
  });

  it('keeps only Spanish when English loanwords lift en but not within tie of es', () => {
    const scoresFromEldSmall = {
      es: 0.7545317220543807,
      ca: 0.6133254015466983,
      en: 0.5712401055408971,
      ro: 0.5649263721552878,
      it: 0.5444989488437281,
    };

    expect(languagesFromEldScores(scoresFromEldSmall)).toEqual(['es']);
  });
});
