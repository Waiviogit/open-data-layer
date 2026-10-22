import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { InstacartRecipePayload } from './instacart-ingredients';

@Injectable()
export class InstacartIdpClient {
  private readonly logger = new Logger(InstacartIdpClient.name);

  constructor(private readonly config: ConfigService) {}

  async createRecipe(
    payload: InstacartRecipePayload,
  ): Promise<{ url: string } | { error: string }> {
    const apiKey = this.config.get<string>('instacart.apiKey')?.trim();
    const host = this.config.get<string>('instacart.host')?.trim();
    if (!apiKey || !host) {
      return { error: 'INSTACART_KEY is not configured' };
    }
    const timeoutMs = this.config.get<number>('instacart.requestTimeoutMs') ?? 12_000;
    const url = `https://${host}/idp/v1/products/recipe`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) {
        let errorBody: unknown;
        try {
          errorBody = await response.json();
        } catch {
          errorBody = await response.text();
        }
        return { error: `HTTP ${response.status}: ${JSON.stringify(errorBody)}` };
      }
      const data = (await response.json()) as { products_link_url?: unknown };
      if (typeof data.products_link_url !== 'string' || !data.products_link_url.trim()) {
        return { error: 'Instacart IDP returned no products_link_url' };
      }
      return { url: data.products_link_url.trim() };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Instacart IDP request failed';
      this.logger.warn(message);
      return { error: message };
    }
  }
}
