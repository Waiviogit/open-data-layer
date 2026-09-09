import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { HiveBroadcastService, WalletAccountsService, WalletStatusService } from '../domain/hive-broadcast.service';
import { HasSessionService } from '../domain/has-session.service';
import { HivePostBuildService } from '../domain/hive-post-build.service';
import { HivePostingAuthorityGrantBuildService } from '../domain/hive-posting-authority-grant-build.service';
import { IpfsUploadService } from '../domain/ipfs-upload.service';
import { NotificationsSocketService } from '../domain/notifications-socket.service';
import { OslMessagingService } from '../domain/osl-messaging.service';
import { WaivioAuthOrchestratorService } from '../domain/waivio-auth-orchestrator.service';
import { WalletDelegationBuildService } from '../domain/wallet-delegation-build.service';
import { jsonToolResult, toolError } from './mcp-tool.helpers';

export function registerAgentWalletTools(
  server: McpServer,
  deps: {
    hasSession: HasSessionService;
    hivePostBuild: HivePostBuildService;
    broadcast: HiveBroadcastService;
    walletStatus: WalletStatusService;
    walletAccounts: WalletAccountsService;
    waivioAuth: WaivioAuthOrchestratorService;
    ipfsUpload: IpfsUploadService;
    oslMessaging: OslMessagingService;
    notificationsSocket: NotificationsSocketService;
    walletDelegationBuild: WalletDelegationBuildService;
    postingAuthorityGrantBuild: HivePostingAuthorityGrantBuildService;
  },
): void {
  server.registerTool(
    'wallet_accounts',
    {
      description:
        'List configured local accounts with key readiness, Waivio auth, and notifications connection status. No secrets.',
      inputSchema: z.object({}),
    },
    async () => jsonToolResult(deps.walletAccounts.getAccounts()),
  );

  server.registerTool(
    'wallet_status',
    {
      description:
        'Return wallet readiness: signing mode, HAS session, Waivio auth, local keys. No secrets.',
      inputSchema: z.object({}),
    },
    async () => jsonToolResult(deps.walletStatus.getStatus()),
  );

  server.registerTool(
    'waivio_auth_start',
    {
      description:
        'Start Waivio JWT auth for a registry account. Local signing uses that account posting key; HAS mode requires an active HAS session for the same account and phone approval for the challenge.',
      inputSchema: z.object({
        account: z
          .string()
          .optional()
          .describe('Hive account for Waivio auth (defaults to configured/default account)'),
      }),
    },
    async (args) => {
      try {
        const result = deps.waivioAuth.authStart(args.account);
        return jsonToolResult(result);
      } catch (error) {
        return toolError((error as Error).message);
      }
    },
  );

  server.registerTool(
    'waivio_auth_status',
    {
      description: 'Poll Waivio auth status for a requestId from waivio_auth_start.',
      inputSchema: z.object({
        requestId: z.string().min(1),
      }),
    },
    async (args) => jsonToolResult(deps.waivioAuth.authStatus(args.requestId)),
  );

  server.registerTool(
    'waivio_auth_logout',
    {
      description: 'Revoke Waivio refresh token and clear local Waivio auth session.',
      inputSchema: z.object({
        account: z
          .string()
          .optional()
          .describe('Hive account to log out (defaults to configured/default account)'),
      }),
    },
    async (args) => {
      try {
        const result = await deps.waivioAuth.authLogout(args.account);
        return jsonToolResult(result);
      } catch (error) {
        return toolError((error as Error).message);
      }
    },
  );

  server.registerTool(
    'ipfs_upload_image',
    {
      description:
        'Upload a local image to IPFS via Waivio gateway. Requires active Waivio auth. For avatars prepare 1:1 up to 1024px before upload. Returns { cid, contentUrl, url? }.',
      inputSchema: z.object({
        filePath: z.string().min(1).describe('Absolute or relative path to a local image file (max 50 MiB)'),
        account: z
          .string()
          .optional()
          .describe('Hive account whose Waivio auth token is used for upload'),
      }),
    },
    async (args) => {
      try {
        const result = await deps.ipfsUpload.uploadImage(args.filePath, args.account);
        return jsonToolResult(result);
      } catch (error) {
        return toolError((error as Error).message);
      }
    },
  );

  server.registerTool(
    'ipfs_upload_file',
    {
      description:
        'Upload a generic file or inline JSON to IPFS via Waivio gateway POST /upload/file (max 10 MiB). Requires active Waivio auth. Provide exactly one of filePath or content. Returns { cid, contentUrl, url? }.',
      inputSchema: z.object({
        filePath: z
          .string()
          .optional()
          .describe('Path to a local file (max 10 MiB)'),
        content: z
          .string()
          .optional()
          .describe('Inline UTF-8 content (e.g. ODL envelope JSON from odl_build_* when requiresIpfsBatch)'),
        filename: z
          .string()
          .optional()
          .describe('Optional filename for the IPFS entry (default from path or upload.bin)'),
        account: z
          .string()
          .optional()
          .describe('Hive account whose Waivio auth token is used for upload'),
      }),
    },
    async (args) => {
      try {
        const result = await deps.ipfsUpload.uploadFile(args);
        return jsonToolResult(result);
      } catch (error) {
        return toolError((error as Error).message);
      }
    },
  );

  server.registerTool(
    'wallet_broadcast',
    {
      description:
        'Broadcast ops using the configured signing mode (HAS or local keys). Pass account to choose the signer; defaults to the first configured account or active HAS session per signingMode tie-break. Poll wallet_broadcast_status.',
      inputSchema: z.object({
        ops: z.array(z.unknown()).min(1),
        keyType: z.enum(['posting', 'active']).default('posting'),
        account: z
          .string()
          .optional()
          .describe('Hive account that signs the transaction'),
      }),
    },
    async (args) => {
      try {
        const result = await deps.broadcast.broadcastStart(args);
        return jsonToolResult(result);
      } catch (error) {
        return toolError((error as Error).message);
      }
    },
  );

  server.registerTool(
    'wallet_broadcast_status',
    {
      description: 'Poll wallet_broadcast status for a requestId. On expired, verify on chain before retrying the same ops.',
      inputSchema: z.object({
        requestId: z.string().min(1),
      }),
    },
    async (args) => jsonToolResult(deps.broadcast.broadcastStatus(args.requestId)),
  );

  server.registerTool(
    'has_login_start',
    {
      description:
        'Start HAS login for a Hive account. Send the returned webLink to the user verbatim, in its own message, within 10 seconds — do not parse it, do not pipe it through a terminal, do not wrap it in a code fence. The login window is about 60 seconds. If alreadyActive is true no login is needed. Poll has_login_status until active. Calling this again for the same account reuses the pending request instead of invalidating the link already sent.',
      inputSchema: z.object({
        account: z.string().min(1).describe('Hive account name (with or without @)'),
      }),
    },
    async (args) => {
      try {
        const result = await deps.hasSession.loginStart(args.account);
        return jsonToolResult(result);
      } catch (error) {
        return toolError((error as Error).message);
      }
    },
  );

  server.registerTool(
    'has_login_status',
    {
      description:
        'Poll login status for a requestId from has_login_start. Poll every 3 seconds until active, rejected or expired.',
      inputSchema: z.object({
        requestId: z.string().min(1),
      }),
    },
    async (args) => {
      const status = deps.hasSession.loginStatus(args.requestId);
      return jsonToolResult(status);
    },
  );

  server.registerTool(
    'has_login_qr',
    {
      description:
        'Fallback artefacts for a pending login: terminal QR, PNG QR path and the raw has:// deep link. Use only for a terminal or a second device. Never send qrAscii or deepLink into a chat — the deep link is base64 of JSON, so it starts with eyJ and chat clients redact it as a leaked JWT.',
      inputSchema: z.object({
        requestId: z.string().min(1),
      }),
    },
    async (args) => {
      const artifacts = deps.hasSession.loginArtifacts(args.requestId);
      if (!artifacts) {
        return toolError('No pending login for this requestId');
      }
      return jsonToolResult(artifacts);
    },
  );

  server.registerTool(
    'has_session',
    {
      description:
        'Return current HAS session metadata (account, expiresAt). No secrets.',
      inputSchema: z.object({}),
    },
    async () => {
      const session = deps.hasSession.getSessionInfo();
      return jsonToolResult({ active: session != null, session });
    },
  );

  server.registerTool(
    'has_logout',
    {
      description: 'Clear local HAS session and persisted session file.',
      inputSchema: z.object({}),
    },
    async () => {
      await deps.hasSession.logout();
      return jsonToolResult({ ok: true });
    },
  );

  server.registerTool(
    'odl_build_object_create',
    {
      description:
        'Build ODL object_create custom_json ops for NEW objects only. Always includes object_create. Do not use when the object already exists. When requiresIpfsBatch is true, upload envelopeJson via ipfs_upload_file then odl_build_batch_import. Returns perOpBytes, warnings, suggestIpfsBatch (soft HAS hint), and requiresIpfsBatch (hard >8192 bytes or >5 ops).',
      inputSchema: z.object({
        objectType: z.string().min(1),
        objectId: z.string().optional(),
        creator: z.string().min(1),
        fields: z.array(
          z.object({
            updateType: z.string().min(1),
            value: z.unknown(),
            locale: z.string().optional(),
          }),
        ),
        language: z.string().optional(),
      }),
    },
    async (args) => {
      try {
        const result = deps.hasSession.buildObjectCreate(args);
        return jsonToolResult(result);
      } catch (error) {
        return toolError((error as Error).message);
      }
    },
  );

  server.registerTool(
    'odl_build_update_create',
    {
      description:
        'Build a single update_create custom_json op for an EXISTING object (avatar image, title, description, etc.). Do not use for new objects. When requiresIpfsBatch is true (payload >8192 bytes), upload envelopeJson via ipfs_upload_file then odl_build_batch_import — do not broadcast the oversize op. Indexer auto-approves creator validity — do not broadcast update_vote for the same update.',
      inputSchema: z.object({
        objectId: z.string().min(1),
        creator: z.string().min(1),
        updateType: z.string().min(1),
        value: z.unknown(),
        locale: z.string().optional(),
        language: z.string().optional(),
      }),
    },
    async (args) => {
      try {
        const result = deps.hasSession.buildUpdateCreate(args);
        return jsonToolResult(result);
      } catch (error) {
        return toolError((error as Error).message);
      }
    },
  );

  server.registerTool(
    'odl_build_batch_import',
    {
      description:
        'Build a batch_import custom_json op referencing an IPFS CID (from ipfs_upload_file). Broadcast via wallet_broadcast after uploading the envelope.',
      inputSchema: z.object({
        account: z.string().min(1).describe('Hive account in required_posting_auths'),
        cid: z.string().min(1).describe('IPFS CID from ipfs_upload_file'),
      }),
    },
    async (args) => {
      try {
        const result = deps.hasSession.buildBatchImport(args);
        return jsonToolResult(result);
      } catch (error) {
        return toolError((error as Error).message);
      }
    },
  );

  server.registerTool(
    'odl_build_gallery_item',
    {
      description:
        'Build imageGalleryItem custom_json op for an EXISTING object. Ensures album exists when missing from existingGalleryAlbumNames. Indexer auto-approves creator validity — do not broadcast update_vote for the same update.',
      inputSchema: z.object({
        objectId: z.string().min(1),
        creator: z.string().min(1),
        itemValue: z.unknown().describe('{ album, cid } or { album, url }'),
        existingGalleryAlbumNames: z.array(z.string()).optional(),
      }),
    },
    async (args) => {
      try {
        const result = deps.hasSession.buildGalleryItem(args);
        return jsonToolResult(result);
      } catch (error) {
        return toolError((error as Error).message);
      }
    },
  );

  server.registerTool(
    'hive_build_post',
    {
      description:
        'Build Hive root post ops (comment + comment_options). Optional linked objects and beneficiaries (omit beneficiaries unless user requests — no default). Warns when tags lack WAIV-eligible tag. author may be another account that delegated posting authority to the wallet identity; verify first via query-api get_user_authority_grantors. Broadcast via wallet_broadcast / has_broadcast after user approval.',
      inputSchema: z.object({
        author: z.string().min(1),
        title: z.string().min(1),
        body: z.string().min(1),
        permlink: z.string().optional(),
        tags: z.array(z.string()).optional(),
        objects: z
          .array(
            z.object({
              object_id: z.string().min(1),
              percent: z.number(),
            }),
          )
          .optional(),
        beneficiaries: z
          .array(
            z.object({
              account: z.string().min(1),
              weight: z.number().int(),
            }),
          )
          .optional(),
        rewardMode: z
          .enum(['fifty_fifty', 'hive_power', 'declined'])
          .optional(),
        parentPermlink: z.string().optional(),
        app: z.string().optional(),
        host: z.string().optional(),
      }),
    },
    async (args) => {
      try {
        const result = deps.hivePostBuild.buildPost(args);
        return jsonToolResult(result);
      } catch (error) {
        return toolError((error as Error).message);
      }
    },
  );

  server.registerTool(
    'has_broadcast',
    {
      description:
        'Request HAS signature for ops. Requires active session. Signs as the configured wallet identity only (HAS session username); there is no account argument. To act on behalf of another account, put that account name inside the ops. Poll has_broadcast_status.',
      inputSchema: z.object({
        ops: z.array(z.unknown()).min(1),
        keyType: z.enum(['posting', 'active']).default('posting'),
      }),
    },
    async (args) => {
      try {
        const result = await deps.hasSession.broadcastStart({
          ops: args.ops,
          keyType: args.keyType,
        });
        return jsonToolResult(result);
      } catch (error) {
        return toolError((error as Error).message);
      }
    },
  );

  server.registerTool(
    'has_broadcast_status',
    {
      description:
        'Poll broadcast status for a requestId from has_broadcast. On expired, verify on chain (resolve_object) before retrying the same ops — tx may have signed despite expired status.',
      inputSchema: z.object({
        requestId: z.string().min(1),
      }),
    },
    async (args) => {
      const status = deps.hasSession.broadcastStatus(args.requestId);
      return jsonToolResult(status);
    },
  );

  server.registerTool(
    'osl_build_channel_create',
    {
      description:
        'Build OSL channel_create custom_json op for a new group or object channel. Broadcast via wallet_broadcast (local) or has_broadcast.',
      inputSchema: z.object({
        kind: z.enum(['group', 'object']),
        creator: z.string().min(1),
        channelId: z.string().optional(),
        members: z.array(z.string()).optional(),
        objectId: z.string().optional(),
        title: z.string().optional(),
      }),
    },
    async (args) => {
      try {
        const result = deps.oslMessaging.buildChannelCreate(args);
        return jsonToolResult(result);
      } catch (error) {
        return toolError((error as Error).message);
      }
    },
  );

  server.registerTool(
    'osl_build_message_create',
    {
      description:
        'Build plaintext OSL message_create custom_json op. Use channelId or peer for DM bootstrap.',
      inputSchema: z.object({
        creator: z.string().min(1),
        channelId: z.string().optional(),
        peer: z.string().optional(),
        body: z.string().min(1),
        originalCreatedAtUnix: z.number().int().optional(),
        replyTo: z.string().optional(),
        quoteJson: z
          .object({
            author: z.string().min(1),
            body: z.string(),
          })
          .optional(),
      }),
    },
    async (args) => {
      try {
        const result = deps.oslMessaging.buildMessageCreate(args);
        return jsonToolResult(result);
      } catch (error) {
        return toolError((error as Error).message);
      }
    },
  );

  server.registerTool(
    'osl_build_message_update',
    {
      description:
        'Build OSL message_update custom_json op (author-only full body replace).',
      inputSchema: z.object({
        creator: z.string().min(1),
        channelId: z.string().min(1),
        messageId: z.string().min(1),
        body: z.string().min(1).max(65535),
      }),
    },
    async (args) => {
      try {
        const result = deps.oslMessaging.buildMessageUpdate(args);
        return jsonToolResult(result);
      } catch (error) {
        return toolError((error as Error).message);
      }
    },
  );

  server.registerTool(
    'osl_build_message_delete',
    {
      description: 'Build OSL message_delete custom_json op (author-only).',
      inputSchema: z.object({
        creator: z.string().min(1),
        channelId: z.string().min(1),
        messageId: z.string().min(1),
      }),
    },
    async (args) => {
      try {
        const result = deps.oslMessaging.buildMessageDelete(args);
        return jsonToolResult(result);
      } catch (error) {
        return toolError((error as Error).message);
      }
    },
  );

  server.registerTool(
    'osl_build_encrypted_message_create',
    {
      description:
        'Encrypt with the registry account memo key and build OSL message_create. Requires memoReady for that account. Broadcast via wallet_broadcast only.',
      inputSchema: z.object({
        creator: z.string().min(1),
        channelId: z.string().optional(),
        peer: z.string().optional(),
        recipient: z.string().min(1),
        plaintext: z.string().min(1),
        mode: z.enum(['memo', 'ephemeral']).default('memo'),
      }),
    },
    async (args) => {
      try {
        const result = await deps.oslMessaging.buildEncryptedMessageCreate(args);
        return jsonToolResult(result);
      } catch (error) {
        return toolError((error as Error).message);
      }
    },
  );

  server.registerTool(
    'osl_memo_encrypt',
    {
      description:
        'Encrypt plaintext with recipient memo public key. memo mode requires the registry account memo key; ephemeral is one-way to recipient.',
      inputSchema: z.object({
        recipientMemoPublic: z.string().min(1),
        plaintext: z.string().min(1),
        mode: z.enum(['memo', 'ephemeral']).default('memo'),
        account: z
          .string()
          .optional()
          .describe('Hive account whose memo key encrypts the message'),
      }),
    },
    async (args) => {
      try {
        const result = await deps.oslMessaging.memoEncrypt(args);
        return jsonToolResult(result);
      } catch (error) {
        return toolError((error as Error).message);
      }
    },
  );

  server.registerTool(
    'osl_memo_decrypt',
    {
      description:
        'Decrypt Hive memo ciphertext with the registry account memo key. Requires memoReady for that account.',
      inputSchema: z.object({
        ciphertext: z.string().min(1),
        account: z
          .string()
          .optional()
          .describe('Hive account whose memo key decrypts the message'),
      }),
    },
    async (args) => {
      try {
        const plaintext = deps.oslMessaging.memoDecrypt(args);
        return jsonToolResult({ plaintext });
      } catch (error) {
        return toolError((error as Error).message);
      }
    },
  );

  server.registerTool(
    'notifications_pull',
    {
      description:
        'Drain buffered messaging notifications from the notifications WS bridge (message_direct, message_group, bell_object_message). Requires active Waivio auth.',
      inputSchema: z.object({
        limit: z.number().int().min(1).max(100).optional(),
        waitMs: z.number().int().min(0).max(60_000).optional(),
        types: z.array(z.string()).optional(),
        account: z
          .string()
          .optional()
          .describe('Filter notifications to this Hive account'),
      }),
    },
    async (args) => {
      try {
        const result = await deps.notificationsSocket.pull(args);
        return jsonToolResult(result);
      } catch (error) {
        return toolError((error as Error).message);
      }
    },
  );

  server.registerTool(
    'notifications_status',
    {
      description:
        'Notifications WS bridge status: connection, buffered count, account. No secrets or tokens.',
      inputSchema: z.object({
        account: z
          .string()
          .optional()
          .describe('Hive account to inspect (defaults to configured/default account)'),
      }),
    },
    async (args) => jsonToolResult(deps.notificationsSocket.getStatus(args.account)),
  );

  server.registerTool(
    'hive_build_posting_authority_grant',
    {
      description:
        'Grant or revoke posting authority by rebuilding the grantor posting.account_auths from a live get_accounts snapshot; all existing key_auths and account_auths are preserved. Returns keyType active and signerAccount = the grantor. If signerAccount is the wallet identity and an active key is configured, broadcast with wallet_broadcast({ keyType: "active" }). If HAS session is the grantor, broadcast with has_broadcast({ keyType: "active" }) (phone approval). Otherwise the returned ops are a payload for the grantor to sign elsewhere. Ask user approval before any grant or revoke.',
      inputSchema: z.object({
        account: z.string().min(1).describe('Grantor account whose posting authority is changed'),
        grantee: z.string().min(1).describe('Grantee account to add or remove from posting.account_auths'),
        action: z.enum(['add', 'remove']),
      }),
    },
    async (args) => {
      try {
        const result =
          await deps.postingAuthorityGrantBuild.buildPostingAuthorityGrant(args);
        return jsonToolResult(result);
      } catch (error) {
        return toolError((error as Error).message);
      }
    },
  );

  server.registerTool(
    'hive_build_hp_delegation',
    {
      description:
        'Build delegate_vesting_shares op for HP delegation or undelegation. Undelegate with amountHp 0. Returns keyType active — pass to wallet_broadcast({ ops, keyType: "active" }). HP returns over ~5 days (check expirations via query-api).',
      inputSchema: z.object({
        delegator: z.string().min(1),
        delegatee: z.string().min(1),
        amountHp: z.number().optional(),
        vestingShares: z.string().optional(),
      }),
    },
    async (args) => {
      try {
        const result = await deps.walletDelegationBuild.buildHpDelegation(args);
        return jsonToolResult(result);
      } catch (error) {
        return toolError((error as Error).message);
      }
    },
  );

  server.registerTool(
    'hive_build_rc_delegation',
    {
      description:
        'Build delegate_rc custom_json (id rc, posting auth). Set maxRc 0 to remove delegation. Returns keyType posting — pass to wallet_broadcast({ ops, keyType: "posting" }). Verify via get_user_hive_rc_delegations.',
      inputSchema: z.object({
        from: z.string().min(1),
        delegatees: z.array(z.string().min(1)).min(1).max(100),
        maxRc: z.number().int().min(0),
      }),
    },
    async (args) => {
      try {
        const result = deps.walletDelegationBuild.buildRcDelegation(args);
        return jsonToolResult(result);
      } catch (error) {
        return toolError((error as Error).message);
      }
    },
  );

  server.registerTool(
    'engine_build_token_delegation',
    {
      description:
        'Build Hive Engine tokens delegate/undelegate custom_json. Returns keyType active — pass to wallet_broadcast({ ops, keyType: "active" }). Verify via get_user_engine_token_delegations.',
      inputSchema: z.object({
        account: z.string().min(1),
        symbol: z.string().min(1),
        quantity: z.string().min(1),
        action: z.enum(['delegate', 'undelegate']),
        to: z.string().optional(),
        from: z.string().optional(),
      }),
    },
    async (args) => {
      try {
        const result = deps.walletDelegationBuild.buildEngineDelegation(args);
        return jsonToolResult(result);
      } catch (error) {
        return toolError((error as Error).message);
      }
    },
  );
}