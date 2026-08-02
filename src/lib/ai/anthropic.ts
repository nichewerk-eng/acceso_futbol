/** Shared Anthropic Messages API helper for Acceso Radio + cable copy. */

export function anthropicEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

export function anthropicModel(): string {
  return process.env.ANTHROPIC_RADIO_MODEL?.trim() || 'claude-haiku-4-5-20251001';
}

export type AnthropicChatInput = {
  system: string;
  user: string;
  maxTokens: number;
  temperature?: number;
};

/** Returns assistant text, or null on missing key / HTTP / parse failure. */
export async function anthropicChat(input: AnthropicChatInput): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) return null;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: anthropicModel(),
        max_tokens: input.maxTokens,
        temperature: input.temperature ?? 0.7,
        system: input.system,
        messages: [{ role: 'user', content: input.user }],
      }),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      content?: { type?: string; text?: string }[];
    };
    const text = data.content?.find((b) => b.type === 'text')?.text?.trim();
    return text && text.length > 0 ? text : null;
  } catch {
    return null;
  }
}
