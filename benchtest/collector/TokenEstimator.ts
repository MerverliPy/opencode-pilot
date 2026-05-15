/**
 * TokenEstimator — estimates token counts from character lengths.
 *
 * DeepSeek (Qwen2Tokenizer): ~1.8 chars/token for English code/text
 * Fallback: ~4 chars/token (rough BPE estimate)
 *
 * These are estimates. Actual token counts come from n9router API usage fields.
 */

const AVG_CHARS_PER_TOKEN: Record<string, number> = {
  'ds/deepseek-v4-flash': 1.8,
  'ds/deepseek-chat': 1.8,
  'ds/deepseek-reasoner': 1.8,
  'scout': 1.8,
  'build-fixer': 1.8,
  'docs-updater': 1.8,
  'e2e-runner': 1.8,
};

const DEFAULT_CHARS_PER_TOKEN = 4;

export class TokenEstimator {
  private modelRatio: Record<string, number>;

  constructor(customRatios?: Record<string, number>) {
    this.modelRatio = { ...AVG_CHARS_PER_TOKEN, ...customRatios };
  }

  /** Estimate tokens from text for a given model */
  estimateTokens(text: string, modelID: string): number {
    const ratio = this.modelRatio[modelID] ?? DEFAULT_CHARS_PER_TOKEN;
    return Math.ceil(text.length / ratio);
  }

  /** Estimate input + output tokens from tool call */
  estimateToolTokens(
    inputText: string,
    outputText: string,
    modelID: string,
  ): { input: number; output: number; total: number } {
    const input = this.estimateTokens(inputText, modelID);
    const output = this.estimateTokens(outputText, modelID);
    return { input, output, total: input + output };
  }
}
