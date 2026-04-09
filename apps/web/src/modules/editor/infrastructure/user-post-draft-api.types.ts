/**
 * Shapes returned by query-api `UserPostDraftView` / list (JSON camelCase).
 */
export type UserPostDraftApiView = {
  draftId: string;
  author: string;
  title: string;
  body: string;
  jsonMetadata: unknown;
  parentAuthor: string;
  parentPermlink: string;
  permlink: string | null;
  beneficiaries: unknown;
  lastUpdated: number;
};

export type UserPostDraftListApiResponse = {
  items: UserPostDraftApiView[];
  cursor: string | null;
  hasMore: boolean;
};

export type BulkDeleteDraftsApiResponse = {
  deleted: number;
};
