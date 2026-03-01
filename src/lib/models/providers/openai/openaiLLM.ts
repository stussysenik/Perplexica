import OpenAI from 'openai';
import BaseLLM from '../../base/llm';
import {
  GenerateObjectInput,
  GenerateOptions,
  GenerateTextInput,
  GenerateTextOutput,
  StreamTextOutput,
  ToolCall,
} from '../../types';
import { parse } from 'partial-json';
import z from 'zod';
import {
  ChatCompletionAssistantMessageParam,
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionToolMessageParam,
} from 'openai/resources/index.mjs';
import { Message } from '@/lib/types';
import { repairJson } from '@toolsycc/json-repair';
import { zodFunction, zodResponseFormat } from 'openai/helpers/zod';

type OpenAIConfig = {
  apiKey: string;
  model: string;
  baseURL?: string;
  options?: GenerateOptions;
};

function zodSchemaToDescription(schema: z.ZodTypeAny): any {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, any> = {};
    const required: string[] = [];
    for (const key in shape) {
      properties[key] = zodSchemaToDescription(shape[key]);
      if (!(shape[key] instanceof z.ZodOptional)) {
        required.push(key);
      }
    }
    return { type: 'object', properties, required };
  }
  if (schema instanceof z.ZodString) return { type: 'string', description: schema.description || '' };
  if (schema instanceof z.ZodNumber) return { type: 'number', description: schema.description || '' };
  if (schema instanceof z.ZodBoolean) return { type: 'boolean', description: schema.description || '' };
  if (schema instanceof z.ZodArray) return { type: 'array', items: zodSchemaToDescription(schema._def.type) };
  if (schema instanceof z.ZodEnum) return { type: 'string', enum: schema._def.values };
  if (schema instanceof z.ZodLiteral) return { type: typeof schema._def.value, const: schema._def.value };
  if (schema instanceof z.ZodOptional) return zodSchemaToDescription(schema._def.innerType);
  if (schema instanceof z.ZodNullable) return zodSchemaToDescription(schema._def.innerType);
  if (schema instanceof z.ZodDefault) return zodSchemaToDescription(schema._def.innerType);
  if (schema instanceof z.ZodEffects) return zodSchemaToDescription(schema._def.schema);
  if (schema.description) return { type: 'string', description: schema.description };
  return { type: 'string' };
}

class OpenAILLM extends BaseLLM<OpenAIConfig> {
  openAIClient: OpenAI;
  private isNonOpenAI: boolean;

  constructor(protected config: OpenAIConfig) {
    super(config);

    this.openAIClient = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL || 'https://api.openai.com/v1',
      timeout: 120000,
    });

    this.isNonOpenAI = !!(
      this.config.baseURL &&
      !this.config.baseURL.includes('api.openai.com')
    );
  }

  convertToOpenAIMessages(messages: Message[]): ChatCompletionMessageParam[] {
    return messages.map((msg) => {
      if (msg.role === 'tool') {
        return {
          role: 'tool',
          tool_call_id: msg.id,
          content: msg.content,
        } as ChatCompletionToolMessageParam;
      } else if (msg.role === 'assistant') {
        return {
          role: 'assistant',
          content: msg.content,
          ...(msg.tool_calls &&
            msg.tool_calls.length > 0 && {
              tool_calls: msg.tool_calls?.map((tc) => ({
                id: tc.id,
                type: 'function',
                function: {
                  name: tc.name,
                  arguments: JSON.stringify(tc.arguments),
                },
              })),
            }),
        } as ChatCompletionAssistantMessageParam;
      }

      return msg;
    });
  }

  private getToolParameters(schema: z.ZodTypeAny): any {
    try {
      const fn = zodFunction({ name: '_temp', parameters: schema });
      return fn.function.parameters;
    } catch {
      return zodSchemaToDescription(schema);
    }
  }

  private buildCompletionParams(input: GenerateTextInput, extra: Record<string, any> = {}) {
    const openaiTools: ChatCompletionTool[] = [];

    input.tools?.forEach((tool) => {
      openaiTools.push({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: this.getToolParameters(tool.schema),
        },
      });
    });

    const params: Record<string, any> = {
      model: this.config.model,
      messages: this.convertToOpenAIMessages(input.messages),
      temperature:
        input.options?.temperature ?? this.config.options?.temperature ?? 1.0,
      top_p: input.options?.topP ?? this.config.options?.topP,
      stop: input.options?.stopSequences ?? this.config.options?.stopSequences,
      frequency_penalty:
        input.options?.frequencyPenalty ??
        this.config.options?.frequencyPenalty,
      presence_penalty:
        input.options?.presencePenalty ?? this.config.options?.presencePenalty,
      ...extra,
    };

    if (openaiTools.length > 0) {
      params.tools = openaiTools;
    }

    const maxTokens = input.options?.maxTokens ?? this.config.options?.maxTokens;
    if (maxTokens) {
      if (this.isNonOpenAI) {
        params.max_tokens = maxTokens;
      } else {
        params.max_completion_tokens = maxTokens;
      }
    }

    return params;
  }

  async generateText(input: GenerateTextInput): Promise<GenerateTextOutput> {
    const params = this.buildCompletionParams(input);

    const response = await this.openAIClient.chat.completions.create(params);

    if (response.choices && response.choices.length > 0) {
      const msg = response.choices[0].message as any;
      const content = msg.content || msg.reasoning_content || '';
      return {
        content,
        toolCalls:
          msg.tool_calls
            ?.map((tc: any) => {
              if (tc.type === 'function') {
                return {
                  name: tc.function.name,
                  id: tc.id,
                  arguments: JSON.parse(tc.function.arguments),
                };
              }
            })
            .filter((tc: any) => tc !== undefined) || [],
        additionalInfo: {
          finishReason: response.choices[0].finish_reason,
        },
      };
    }

    throw new Error('No response from OpenAI');
  }

  async *streamText(
    input: GenerateTextInput,
  ): AsyncGenerator<StreamTextOutput> {
    const params = this.buildCompletionParams(input, { stream: true });

    const stream = await this.openAIClient.chat.completions.create(params);

    let recievedToolCalls: { name: string; id: string; arguments: string }[] =
      [];

    for await (const chunk of stream as any) {
      if (chunk.choices && chunk.choices.length > 0) {
        const delta = chunk.choices[0].delta;
        const toolCalls = delta.tool_calls;
        yield {
          contentChunk: delta.content || delta.reasoning_content || '',
          toolCallChunk:
            toolCalls?.map((tc: any) => {
              if (!recievedToolCalls[tc.index]) {
                const call = {
                  name: tc.function?.name!,
                  id: tc.id!,
                  arguments: tc.function?.arguments || '',
                };
                recievedToolCalls.push(call);
                return { ...call, arguments: parse(call.arguments || '{}') };
              } else {
                const existingCall = recievedToolCalls[tc.index];
                existingCall.arguments += tc.function?.arguments || '';
                return {
                  ...existingCall,
                  arguments: parse(existingCall.arguments),
                };
              }
            }) || [],
          done: chunk.choices[0].finish_reason !== null,
          additionalInfo: {
            finishReason: chunk.choices[0].finish_reason,
          },
        };
      }
    }
  }

  async generateObject<T>(input: GenerateObjectInput): Promise<T> {
    if (!this.isNonOpenAI) {
      const response = await this.openAIClient.chat.completions.parse({
        messages: this.convertToOpenAIMessages(input.messages),
        model: this.config.model,
        temperature:
          input.options?.temperature ?? this.config.options?.temperature ?? 1.0,
        top_p: input.options?.topP ?? this.config.options?.topP,
        max_completion_tokens:
          input.options?.maxTokens ?? this.config.options?.maxTokens,
        stop: input.options?.stopSequences ?? this.config.options?.stopSequences,
        frequency_penalty:
          input.options?.frequencyPenalty ??
          this.config.options?.frequencyPenalty,
        presence_penalty:
          input.options?.presencePenalty ?? this.config.options?.presencePenalty,
        response_format: zodResponseFormat(input.schema, 'object'),
      });

      if (response.choices && response.choices.length > 0) {
        return input.schema.parse(
          JSON.parse(
            repairJson(response.choices[0].message.content!, {
              extractJson: true,
            }) as string,
          ),
        ) as T;
      }
      throw new Error('No response from OpenAI');
    }

    const schemaDescription = JSON.stringify(zodSchemaToDescription(input.schema), null, 2);

    const messages: Message[] = [...input.messages];
    const lastMsg = messages[messages.length - 1];
    const jsonInstruction = `\n\nYou MUST respond with valid JSON only, no markdown, no code fences, no explanation. The JSON must conform to this schema:\n${schemaDescription}\n\nRespond ONLY with the raw JSON object.`;

    if (lastMsg && lastMsg.role === 'user') {
      messages[messages.length - 1] = {
        ...lastMsg,
        content: lastMsg.content + jsonInstruction,
      };
    } else {
      messages.push({
        role: 'user',
        content: jsonInstruction,
      });
    }

    const params: Record<string, any> = {
      model: this.config.model,
      messages: this.convertToOpenAIMessages(messages),
      temperature:
        input.options?.temperature ?? this.config.options?.temperature ?? 0.1,
      top_p: input.options?.topP ?? this.config.options?.topP,
      stop: input.options?.stopSequences ?? this.config.options?.stopSequences,
      frequency_penalty:
        input.options?.frequencyPenalty ??
        this.config.options?.frequencyPenalty,
      presence_penalty:
        input.options?.presencePenalty ?? this.config.options?.presencePenalty,
    };

    const maxTokens = input.options?.maxTokens ?? this.config.options?.maxTokens;
    if (maxTokens) {
      params.max_tokens = maxTokens;
    }

    const response = await this.openAIClient.chat.completions.create(params);

    if (response.choices && response.choices.length > 0) {
      try {
        return input.schema.parse(
          JSON.parse(
            repairJson(response.choices[0].message.content!, {
              extractJson: true,
            }) as string,
          ),
        ) as T;
      } catch (err) {
        throw new Error(`Error parsing response: ${err}\nRaw: ${response.choices[0].message.content}`);
      }
    }

    throw new Error('No response from LLM');
  }

  async *streamObject<T>(input: GenerateObjectInput): AsyncGenerator<T> {
    if (!this.isNonOpenAI) {
      const { zodTextFormat } = await import('openai/helpers/zod');
      let recievedObj: string = '';
      const stream = this.openAIClient.responses.stream({
        model: this.config.model,
        input: input.messages,
        temperature:
          input.options?.temperature ?? this.config.options?.temperature ?? 1.0,
        top_p: input.options?.topP ?? this.config.options?.topP,
        max_completion_tokens:
          input.options?.maxTokens ?? this.config.options?.maxTokens,
        stop: input.options?.stopSequences ?? this.config.options?.stopSequences,
        frequency_penalty:
          input.options?.frequencyPenalty ??
          this.config.options?.frequencyPenalty,
        presence_penalty:
          input.options?.presencePenalty ?? this.config.options?.presencePenalty,
        text: {
          format: zodTextFormat(input.schema, 'object'),
        },
      });

      for await (const chunk of stream) {
        if (chunk.type === 'response.output_text.delta' && chunk.delta) {
          recievedObj += chunk.delta;
          try {
            yield parse(recievedObj) as T;
          } catch (err) {
            console.log('Error parsing partial object:', err);
            yield {} as T;
          }
        } else if (chunk.type === 'response.output_text.done' && chunk.text) {
          try {
            yield parse(chunk.text) as T;
          } catch (err) {
            throw new Error(`Error parsing response: ${err}`);
          }
        }
      }
      return;
    }

    const schemaDescription = JSON.stringify(zodSchemaToDescription(input.schema), null, 2);

    const messages: Message[] = [...input.messages];
    const lastMsg = messages[messages.length - 1];
    const jsonInstruction = `\n\nYou MUST respond with valid JSON only, no markdown, no code fences, no explanation. The JSON must conform to this schema:\n${schemaDescription}\n\nRespond ONLY with the raw JSON object.`;

    if (lastMsg && lastMsg.role === 'user') {
      messages[messages.length - 1] = {
        ...lastMsg,
        content: lastMsg.content + jsonInstruction,
      };
    } else {
      messages.push({
        role: 'user',
        content: jsonInstruction,
      });
    }

    const params: Record<string, any> = {
      model: this.config.model,
      messages: this.convertToOpenAIMessages(messages),
      temperature:
        input.options?.temperature ?? this.config.options?.temperature ?? 0.1,
      top_p: input.options?.topP ?? this.config.options?.topP,
      stop: input.options?.stopSequences ?? this.config.options?.stopSequences,
      frequency_penalty:
        input.options?.frequencyPenalty ??
        this.config.options?.frequencyPenalty,
      presence_penalty:
        input.options?.presencePenalty ?? this.config.options?.presencePenalty,
      stream: true,
    };

    const maxTokens = input.options?.maxTokens ?? this.config.options?.maxTokens;
    if (maxTokens) {
      params.max_tokens = maxTokens;
    }

    let recievedObj = '';
    const stream = await this.openAIClient.chat.completions.create(params);

    for await (const chunk of stream as any) {
      if (chunk.choices && chunk.choices.length > 0) {
        const delta = chunk.choices[0].delta?.content || '';
        recievedObj += delta;

        if (recievedObj.trim()) {
          try {
            yield parse(recievedObj) as T;
          } catch {
            yield {} as T;
          }
        }

        if (chunk.choices[0].finish_reason === 'stop') {
          try {
            const repaired = repairJson(recievedObj, { extractJson: true }) as string;
            yield input.schema.parse(JSON.parse(repaired)) as T;
          } catch (err) {
            console.log('Error parsing final streamed object:', err);
          }
        }
      }
    }
  }
}

export default OpenAILLM;
