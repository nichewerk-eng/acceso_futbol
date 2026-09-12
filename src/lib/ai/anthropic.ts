import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';

/**
 * Acceso Anthropic wiring (same pattern as TecoBid):
 * - Packages: `ai` + `@ai-sdk/anthropic`
 * - Key: `ANTHROPIC_API_KEY` in env only — SDK reads it automatically
 * - No createAnthropic / no key in code
 */

export function anthropicEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

/** Default Haiku for radio polish + cable lines (cheap). Override via env. */
export function anthropicModel(): string {
  return process.env.ANTHROPIC_RADIO_MODEL?.trim() || 'claude-haiku-4-5';
}

export type AnthropicChatInput = {
  system: string;
  user: string;
  maxTokens: number;
  temperature?: number;
  /** Optional override — e.g. Sonnet for heavier beats. */
  model?: string;
};

/** Returns assistant text, or null on missing key / provider failure. */
export async function anthropicChat(
  input: AnthropicChatInput
): Promise<string | null> {
  if (!anthropicEnabled()) return null;

  try {
    const { text } = await generateText({
      model: anthropic(input.model ?? anthropicModel()),
      system: input.system,
      prompt: input.user,
      maxOutputTokens: input.maxTokens,
      temperature: input.temperature ?? 0.7,
    });
    const out = text?.trim();
    return out && out.length > 0 ? out : null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const cause =
      err instanceof Error && err.cause instanceof Error
        ? err.cause.message
        : err instanceof Error && err.cause && typeof err.cause === 'object' && 'code' in err.cause
          ? String((err.cause as { code?: string }).code)
          : '';
    console.error('anthropic_chat', msg.slice(0, 240), cause.slice(0, 120));
    return null;
  }
}
