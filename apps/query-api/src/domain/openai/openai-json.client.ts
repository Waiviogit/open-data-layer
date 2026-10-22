import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { DEFAULT_OPENAI_MODEL } from './openai.constants';
import type { OpenAiJsonSchema, OpenAiJsonSchemaResult } from './openai.types';

@Injectable()
export class OpenAiJsonClient {
  private readonly logger = new Logger(OpenAiJsonClient.name);

  constructor(private readonly config: ConfigService) {}

  async promptWithJsonSchema<T = unknown>(input: {
    prompt: string;
    jsonSchema: OpenAiJsonSchema;
  }): Promise<OpenAiJsonSchemaResult<T>> {
    const apiKey = this.config.get<string>('openai.apiKey')?.trim();
    if (!apiKey) {
      return { error: 'OPENAI_API_KEY is not configured' };
    }

    const model = this.config.get<string>('openai.model')?.trim() || DEFAULT_OPENAI_MODEL;
    const timeout = this.config.get<number>('openai.requestTimeoutMs') ?? 12_000;

    try {
      const client = new OpenAI({ apiKey, timeout });
      const response = await client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: input.prompt }],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: input.jsonSchema.name,
            schema: input.jsonSchema.schema,
            strict: false,
          },
        },
      });
      const content = response.choices[0]?.message?.content;
      if (!content) {
        return { error: 'OpenAI returned an empty completion' };
      }
      return { result: JSON.parse(content) as T };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OpenAI request failed';
      this.logger.warn(message);
      return { error: message };
    }
  }
}
