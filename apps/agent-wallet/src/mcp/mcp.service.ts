import { Injectable, Logger } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Request, Response } from 'express';

import { HiveBroadcastService, WalletAccountsService, WalletStatusService } from '../domain/hive-broadcast.service';
import { HasSessionService } from '../domain/has-session.service';
import { HivePostBuildService } from '../domain/hive-post-build.service';
import { IpfsUploadService } from '../domain/ipfs-upload.service';
import { NotificationsSocketService } from '../domain/notifications-socket.service';
import { OslMessagingService } from '../domain/osl-messaging.service';
import { WaivioAuthOrchestratorService } from '../domain/waivio-auth-orchestrator.service';
import { HiveEngineDepositBuildService } from '../domain/hive-engine-deposit-build.service';
import { WalletDelegationBuildService } from '../domain/wallet-delegation-build.service';
import { HiveAccountGenerateService } from '../domain/hive-account-generate.service';
import { HivePostingAuthorityGrantBuildService } from '../domain/hive-posting-authority-grant-build.service';
import { AGENT_WALLET_MCP_INSTRUCTIONS } from './mcp-instructions';
import { registerAgentWalletTools } from './register-agent-wallet-tools';

@Injectable()
export class McpService {
  private readonly logger = new Logger(McpService.name);

  constructor(
    private readonly hasSession: HasSessionService,
    private readonly hivePostBuild: HivePostBuildService,
    private readonly broadcast: HiveBroadcastService,
    private readonly walletStatus: WalletStatusService,
    private readonly walletAccounts: WalletAccountsService,
    private readonly waivioAuth: WaivioAuthOrchestratorService,
    private readonly ipfsUpload: IpfsUploadService,
    private readonly oslMessaging: OslMessagingService,
    private readonly notificationsSocket: NotificationsSocketService,
    private readonly walletDelegationBuild: WalletDelegationBuildService,
    private readonly hiveEngineDepositBuild: HiveEngineDepositBuildService,
    private readonly postingAuthorityGrantBuild: HivePostingAuthorityGrantBuildService,
    private readonly hiveAccountGenerate: HiveAccountGenerateService,
  ) {}

  private createServer(): McpServer {
    const server = new McpServer(
      { name: 'agent-wallet', version: '1.0.0' },
      {
        capabilities: { tools: {} },
        instructions: AGENT_WALLET_MCP_INSTRUCTIONS,
      },
    );

    registerAgentWalletTools(server, {
      hasSession: this.hasSession,
      hivePostBuild: this.hivePostBuild,
      broadcast: this.broadcast,
      walletStatus: this.walletStatus,
      walletAccounts: this.walletAccounts,
      waivioAuth: this.waivioAuth,
      ipfsUpload: this.ipfsUpload,
      oslMessaging: this.oslMessaging,
      notificationsSocket: this.notificationsSocket,
      walletDelegationBuild: this.walletDelegationBuild,
      hiveEngineDepositBuild: this.hiveEngineDepositBuild,
      postingAuthorityGrantBuild: this.postingAuthorityGrantBuild,
      hiveAccountGenerate: this.hiveAccountGenerate,
    });
    return server;
  }

  async handle(req: Request, res: Response): Promise<void> {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    const server = this.createServer();

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      const message = (error as Error).message;
      this.logger.error(`MCP error: ${message}`);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal error' },
          id: null,
        });
      }
    } finally {
      await transport.close().catch(() => undefined);
      await server.close().catch(() => undefined);
    }
  }
}
