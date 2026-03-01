import OpenAI from 'openai';
import BaseEmbedding from '../../base/embedding';
import { Chunk } from '@/lib/types';

type OpenAIConfig = {
  apiKey: string;
  model: string;
  baseURL?: string;
};

class OpenAIEmbedding extends BaseEmbedding<OpenAIConfig> {
  openAIClient: OpenAI;
  private isNvidia: boolean;

  constructor(protected config: OpenAIConfig) {
    super(config);

    this.openAIClient = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });

    this.isNvidia = !!(
      config.baseURL && config.baseURL.includes('nvidia.com')
    );
  }

  private async createEmbedding(
    input: string[],
    inputType: 'query' | 'passage',
  ): Promise<number[][]> {
    const params: any = {
      model: this.config.model,
      input,
    };

    if (this.isNvidia) {
      params.extra_body = { input_type: inputType };
    }

    const response = await this.openAIClient.embeddings.create(params);
    return response.data.map((embedding) => embedding.embedding);
  }

  async embedText(texts: string[]): Promise<number[][]> {
    return this.createEmbedding(texts, 'query');
  }

  async embedChunks(chunks: Chunk[]): Promise<number[][]> {
    return this.createEmbedding(
      chunks.map((c) => c.content),
      'passage',
    );
  }
}

export default OpenAIEmbedding;
