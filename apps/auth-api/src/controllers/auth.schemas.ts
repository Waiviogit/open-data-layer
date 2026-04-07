import { z } from 'zod';

export const challengeBodySchema = z.object({
  provider: z.enum(['keychain', 'hiveauth', 'hivesigner']),
  username: z.string().min(1),
});

export const verifyKeychainBodySchema = z.object({
  challengeId: z.string().uuid(),
  username: z.string().min(1),
  signature: z.string().min(1),
  signedMessage: z.string().min(1),
});

export const verifyHiveAuthBodySchema = z.object({
  challengeId: z.string().uuid(),
  username: z.string().min(1),
  authData: z.string().min(1),
});

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(1),
});

export const logoutBodySchema = z.object({
  refreshToken: z.string().min(1),
});

export type ChallengeBody = z.infer<typeof challengeBodySchema>;
export type VerifyKeychainBody = z.infer<typeof verifyKeychainBodySchema>;
export type VerifyHiveAuthBody = z.infer<typeof verifyHiveAuthBodySchema>;
export type RefreshBody = z.infer<typeof refreshBodySchema>;
export type LogoutBody = z.infer<typeof logoutBodySchema>;
