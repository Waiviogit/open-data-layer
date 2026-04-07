import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { CreateChallengeService } from '../domain/challenge/create-challenge.service';
import { HivesignerCallbackService } from '../domain/callback/hivesigner-callback.service';
import { LogoutService } from '../domain/session/logout.service';
import { RefreshSessionService } from '../domain/session/refresh-session.service';
import { VerifyHiveAuthService } from '../domain/verify/verify-hiveauth.service';
import { VerifyKeychainService } from '../domain/verify/verify-keychain.service';
import { ZodBodyPipe } from '../pipes';
import {
  challengeBodySchema,
  logoutBodySchema,
  refreshBodySchema,
  type ChallengeBody,
  type LogoutBody,
  type RefreshBody,
  type VerifyHiveAuthBody,
  type VerifyKeychainBody,
  verifyHiveAuthBodySchema,
  verifyKeychainBodySchema,
} from './auth.schemas';

@Controller({ version: '1' })
export class AuthController {
  constructor(
    private readonly createChallenge: CreateChallengeService,
    private readonly verifyKeychain: VerifyKeychainService,
    private readonly verifyHiveAuth: VerifyHiveAuthService,
    private readonly hivesignerCallback: HivesignerCallbackService,
    private readonly refreshSession: RefreshSessionService,
    private readonly logout: LogoutService,
  ) {}

  @Post('challenge')
  async challenge(
    @Body(new ZodBodyPipe(challengeBodySchema)) body: ChallengeBody,
    @Req() req: Request,
  ) {
    return this.createChallenge.execute({
      provider: body.provider,
      username: body.username,
      ip: req.ip,
      userAgent: typeof req.headers['user-agent'] === 'string'
        ? req.headers['user-agent']
        : undefined,
    });
  }

  @Post('verify/keychain')
  async verifyKeychainRoute(
    @Body(new ZodBodyPipe(verifyKeychainBodySchema)) body: VerifyKeychainBody,
    @Req() req: Request,
  ) {
    return this.verifyKeychain.execute({
      challengeId: body.challengeId,
      username: body.username,
      signature: body.signature,
      signedMessage: body.signedMessage,
      ip: req.ip,
      userAgent: typeof req.headers['user-agent'] === 'string'
        ? req.headers['user-agent']
        : undefined,
    });
  }

  @Post('verify/hiveauth')
  async verifyHiveAuthRoute(
    @Body(new ZodBodyPipe(verifyHiveAuthBodySchema)) body: VerifyHiveAuthBody,
    @Req() req: Request,
  ) {
    return this.verifyHiveAuth.execute({
      challengeId: body.challengeId,
      username: body.username,
      authData: body.authData,
      ip: req.ip,
      userAgent: typeof req.headers['user-agent'] === 'string'
        ? req.headers['user-agent']
        : undefined,
    });
  }

  @Get('callback/hivesigner')
  async hivesignerCallbackRoute(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
  ) {
    return this.hivesignerCallback.execute({
      code,
      state,
      ip: req.ip,
      userAgent: typeof req.headers['user-agent'] === 'string'
        ? req.headers['user-agent']
        : undefined,
    });
  }

  @Post('refresh')
  async refresh(
    @Body(new ZodBodyPipe(refreshBodySchema)) body: RefreshBody,
    @Req() req: Request,
  ) {
    return this.refreshSession.execute(
      body.refreshToken,
      req.ip,
      typeof req.headers['user-agent'] === 'string'
        ? req.headers['user-agent']
        : undefined,
    );
  }

  @Post('logout')
  async logoutRoute(@Body(new ZodBodyPipe(logoutBodySchema)) body: LogoutBody) {
    return this.logout.execute(body.refreshToken);
  }
}
