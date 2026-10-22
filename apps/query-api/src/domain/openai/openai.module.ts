import { Module } from '@nestjs/common';
import { OpenAiJsonClient } from './openai-json.client';

@Module({
  providers: [OpenAiJsonClient],
  exports: [OpenAiJsonClient],
})
export class OpenAiModule {}
