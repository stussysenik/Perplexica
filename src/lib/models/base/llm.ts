import z from 'zod';
import {
  GenerateObjectInput,
  GenerateOptions,
  GenerateTextInput,
  GenerateTextOutput,
  StreamTextOutput,
} from '../types';

abstract class BaseLLM<CONFIG> {
  constructor(protected config: CONFIG) {}
  abstract generateText(input: GenerateTextInput): Promise<GenerateTextOutput>;
  abstract streamText(
    input: GenerateTextInput,
  ): AsyncGenerator<StreamTextOutput>;
  abstract generateObject<T extends z.ZodType>(input: GenerateObjectInput): Promise<z.infer<T>>;
  abstract streamObject<T extends z.ZodType>(
    input: GenerateObjectInput,
  ): AsyncGenerator<Partial<z.infer<T>>>;
}

export default BaseLLM;
