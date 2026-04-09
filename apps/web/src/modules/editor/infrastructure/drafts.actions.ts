'use server';

import type {
  BulkDeleteDraftsApiResponse,
  UserPostDraftApiView,
} from './user-post-draft-api.types';
import {
  fetchUserDraftListServer,
  queryApiDraftsFetch,
  type QueryApiDraftError,
} from './query-api-drafts.server';
import type { Result } from '@/shared/domain/result';

function draftsPath(author: string, query: Record<string, string | number | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== '') {
      q.set(k, String(v));
    }
  }
  const qs = q.toString();
  return `/query/v1/users/${encodeURIComponent(author)}/drafts${qs ? `?${qs}` : ''}`;
}

export async function listUserDraftsAction(
  author: string,
  options: { limit?: number; cursor?: string | null } = {},
) {
  return fetchUserDraftListServer(author, options);
}

export async function createUserDraftAction(
  author: string,
  body: {
    title?: string;
    body?: string;
    jsonMetadata?: unknown;
    parentAuthor?: string;
    parentPermlink?: string;
    permlink?: string | null;
    beneficiaries?: unknown;
  },
): Promise<Result<UserPostDraftApiView, QueryApiDraftError>> {
  return queryApiDraftsFetch<UserPostDraftApiView>(
    draftsPath(author, {}),
    { method: 'POST', body: JSON.stringify(body) },
  );
}

export async function patchUserDraftAction(
  author: string,
  query: { draftId: string } | { permlink: string },
  body: {
    title?: string;
    body?: string;
    jsonMetadata?: unknown;
    parentAuthor?: string;
    parentPermlink?: string;
    permlink?: string | null;
    beneficiaries?: unknown;
  },
): Promise<Result<UserPostDraftApiView, QueryApiDraftError>> {
  const q =
    'draftId' in query
      ? { draftId: query.draftId }
      : { permlink: query.permlink };
  return queryApiDraftsFetch<UserPostDraftApiView>(
    draftsPath(author, q),
    { method: 'PATCH', body: JSON.stringify(body) },
  );
}

export async function deleteUserDraftAction(
  author: string,
  query: { draftId: string } | { permlink: string },
): Promise<Result<void, QueryApiDraftError>> {
  const q =
    'draftId' in query
      ? { draftId: query.draftId }
      : { permlink: query.permlink };
  return queryApiDraftsFetch<void>(
    draftsPath(author, q),
    { method: 'DELETE' },
  );
}

export async function bulkDeleteUserDraftsAction(
  author: string,
  draftIds: string[],
): Promise<Result<BulkDeleteDraftsApiResponse, QueryApiDraftError>> {
  return queryApiDraftsFetch<BulkDeleteDraftsApiResponse>(
    `/query/v1/users/${encodeURIComponent(author)}/drafts/bulk-delete`,
    { method: 'POST', body: JSON.stringify({ draftIds }) },
  );
}
