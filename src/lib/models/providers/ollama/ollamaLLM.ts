import z from 'zod';
import BaseLLM from '../../base/llm';
import {
  GenerateObjectInput,
  GenerateOptions,
  GenerateTextInput,
  GenerateTextOutput,
  StreamTextOutput,
} from '../../types';
import { Ollama, Tool as OllamaTool, Message as OllamaMessage } from 'ollama';
import { parse } from 'partial-json';
import crypto from 'crypto';
import { Message } from '@/lib/types';
import { repairJson } from '@toolsycc/json-repair';

function zodToJsonSchema(schema: z.ZodType): Record<string, any> {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, any> = {};
    const required: string[] = [];
    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToJsonSchema(value as z.ZodType);
      if (!(value instanceof z.ZodOptional)) {
        required.push(key);
      }
    }
    return { type: 'object', properties, ...(required.length > 0 ? { required } : {}) };
  } else if (schema instanceof z.ZodArray) {
    return { type: 'array', items: zodToJsonSchema(schema.element) };
  } else if (schema instanceof z.ZodString) {
    return { type: 'string' };
  } else if (schema instanceof z.ZodNumber) {
    return { type: 'number' };
  } else if (schema instanceof z.ZodBoolean) {
    return { type: 'boolean' };
  } else if (schema instanceof z.ZodEnum) {
    return { type: 'string', enum: schema.options };
  } else if (schema instanceof z.ZodOptional) {
    return zodToJsonSchema(schema.unwrap());
  } else if (schema instanceof z.ZodNullable) {
    return zodToJsonSchema(schema.unwrap());
  }
  return { type: 'string' };
}

type OllamaConfig = {
  baseURL: string;
  model: string;
  options?: GenerateOptions;
};

const reasoningModels = [
  'gpt-oss',
  'deepseek-r1',
  'qwen3',
  'deepseek-v3.1',
  'magistral',
  'nemotron-3-nano',
];

class OllamaLLM extends BaseLLM<OllamaConfig> {
  ollamaClient: Ollama;

  constructor(protected config: OllamaConfig) {
    super(config);

    this.ollamaClient = new Ollama({
      host: this.config.baseURL || 'http://localhost:11434',
    });
  }

  convertToOllamaMessages(messages: Message[]): OllamaMessage[] {
    return messages.map((msg) => {
      if (msg.role === 'tool') {
        return {
          role: 'tool',
          tool_name: msg.name,
          content: msg.content,
        } as OllamaMessage;
      } else if (msg.role === 'assistant') {
        return {
          role: 'assistant',
          content: msg.content,
          tool_calls:
            msg.tool_calls?.map((tc, i) => ({
              function: {
                index: i,
                name: tc.name,
                arguments: tc.arguments,
              },
            })) || [],
        };
      }

      return msg;
    });
  }

  async generateText(input: GenerateTextInput): Promise<GenerateTextOutput> {
    const ollamaTools: OllamaTool[] = [];

    input.tools?.forEach((tool) => {
      ollamaTools.push({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: zodToJsonSchema(tool.schema).properties,
        },
      });
    });

    const res = await this.ollamaClient.chat({
      model: this.config.model,
      messages: this.convertToOllamaMessages(input.messages),
      tools: ollamaTools.length > 0 ? ollamaTools : undefined,
      ...(reasoningModels.find((m) => this.config.model.includes(m))
        ? { think: false }
        : {}),
      options: {
        top_p: input.options?.topP ?? this.config.options?.topP,
        temperature:
          input.options?.temperature ?? this.config.options?.temperature ?? 0.7,
        num_predict: input.options?.maxTokens ?? this.config.options?.maxTokens,
        num_ctx: 32000,
        frequency_penalty:
          input.options?.frequencyPenalty ??
          this.config.options?.frequencyPenalty,
        presence_penalty:
          input.options?.presencePenalty ??
          this.config.options?.presencePenalty,
        stop:
          input.options?.stopSequences ?? this.config.options?.stopSequences,
      },
    });

    return {
      content: res.message.content,
      toolCalls:
        res.message.tool_calls?.map((tc) => ({
          id: crypto.randomUUID(),
          name: tc.function.name,
          arguments: tc.function.arguments,
        })) || [],
      additionalInfo: {
        reasoning: res.message.thinking,
      },
    };
  }

  async *streamText(
    input: GenerateTextInput,
  ): AsyncGenerator<StreamTextOutput> {
    const ollamaTools: OllamaTool[] = [];

    input.tools?.forEach((tool) => {
      ollamaTools.push({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: zodToJsonSchema(tool.schema) as any,
        },
      });
    });

    const stream = await this.ollamaClient.chat({
      model: this.config.model,
      messages: this.convertToOllamaMessages(input.messages),
      stream: true,
      ...(reasoningModels.find((m) => this.config.model.includes(m))
        ? { think: false }
        : {}),
      tools: ollamaTools.length > 0 ? ollamaTools : undefined,
      options: {
        top_p: input.options?.topP ?? this.config.options?.topP,
        temperature:
          input.options?.temperature ?? this.config.options?.temperature ?? 0.7,
        num_ctx: 32000,
        num_predict: input.options?.maxTokens ?? this.config.options?.maxTokens,
        frequency_penalty:
          input.options?.frequencyPenalty ??
          this.config.options?.frequencyPenalty,
        presence_penalty:
          input.options?.presencePenalty ??
          this.config.options?.presencePenalty,
        stop:
          input.options?.stopSequences ?? this.config.options?.stopSequences,
      },
    });

    for await (const chunk of stream) {
      yield {
        contentChunk: chunk.message.content,
        toolCallChunk:
          chunk.message.tool_calls?.map((tc, i) => ({
            id: crypto
              .createHash('sha256')
              .update(
                `${i}-${tc.function.name}`,
              ) /* Ollama currently doesn't return a tool call ID so we're creating one based on the index and tool call name */
              .digest('hex'),
            name: tc.function.name,
            arguments: tc.function.arguments,
          })) || [],
        done: chunk.done,
        additionalInfo: {
          reasoning: chunk.message.thinking,
        },
      };
    }
  }

  async generateObject<T>(input: GenerateObjectInput): Promise<T> {
    const response = await this.ollamaClient.chat({
      model: this.config.model,
      messages: this.convertToOllamaMessages(input.messages),
      format: zodToJsonSchema(input.schema),
      ...(reasoningModels.find((m) => this.config.model.includes(m))
        ? { think: false }
        : {}),
      options: {
        top_p: input.options?.topP ?? this.config.options?.topP,
        temperature:
          input.options?.temperature ?? this.config.options?.temperature ?? 0.7,
        num_predict: input.options?.maxTokens ?? this.config.options?.maxTokens,
        frequency_penalty:
          input.options?.frequencyPenalty ??
          this.config.options?.frequencyPenalty,
        presence_penalty:
          input.options?.presencePenalty ??
          this.config.options?.presencePenalty,
        stop:
          input.options?.stopSequences ?? this.config.options?.stopSequences,
      },
    });

    try {
      return input.schema.parse(
        JSON.parse(
          repairJson(response.message.content, {
            extractJson: true,
          }) as string,
        ),
      ) as T;
    } catch (err) {
      throw new Error(`Error parsing response from Ollama: ${err}`);
    }
  }

  async *streamObject<T>(input: GenerateObjectInput): AsyncGenerator<T> {
    let recievedObj: string = '';

    const stream = await this.ollamaClient.chat({
      model: this.config.model,
      messages: this.convertToOllamaMessages(input.messages),
      format: zodToJsonSchema(input.schema),
      stream: true,
      ...(reasoningModels.find((m) => this.config.model.includes(m))
        ? { think: false }
        : {}),
      options: {
        top_p: input.options?.topP ?? this.config.options?.topP,
        temperature:
          input.options?.temperature ?? this.config.options?.temperature ?? 0.7,
        num_predict: input.options?.maxTokens ?? this.config.options?.maxTokens,
        frequency_penalty:
          input.options?.frequencyPenalty ??
          this.config.options?.frequencyPenalty,
        presence_penalty:
          input.options?.presencePenalty ??
          this.config.options?.presencePenalty,
        stop:
          input.options?.stopSequences ?? this.config.options?.stopSequences,
      },
    });

    for await (const chunk of stream) {
      recievedObj += chunk.message.content;

      try {
        yield parse(recievedObj) as T;
      } catch (err) {
        console.log('Error parsing partial object from Ollama:', err);
        yield {} as T;
      }
    }
  }
}

export default OllamaLLM;
