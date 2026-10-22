export type OpenAiJsonSchema = {
  name: string;
  schema: Record<string, unknown>;
};

export type OpenAiJsonSchemaResult<T = unknown> =
  | { result: T; error?: undefined }
  | { result?: undefined; error: string };
