/**
 * Shared AI transport — the ONE place where AI requests are made.
 *
 * Proxy-first architecture: the app calls the server-side aiProxy, which holds
 * the provider key in an environment variable (never in the browser). If the
 * proxy is unreachable, falls back to a direct provider call using a locally
 * stored key (if one exists in localStorage).
 *
 * All AI features (copilot chat, skills, coaching, agent engine) must import
 * `aiFetch` from here instead of writing their own fetch/retry logic.
 */

import { loadAiApiKey } from './storage';

export const AI_PROXY_URL =
  'https://vesper-a0e4cc96.base44.app/functions/aiProxy';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 5000;

/** Provider auto-detection for the direct-call fallback (xAI Grok OR Groq). */
export function getProvider(apiKey: string): {
  url: string;
  model: string;
  visionModel: string;
} {
  if (apiKey.startsWith('gsk_')) {
    // Groq (console.groq.com) — OpenAI-compatible endpoint
    return {
      url: 'https://api.groq.com/openai/v1/chat/completions',
      model: 'openai/gpt-oss-120b',
      visionModel: 'openai/gpt-oss-120b',
    };
  }
  // Default: xAI Grok (console.x.ai)
  return {
    url: 'https://api.x.ai/v1/chat/completions',
    model: 'grok-2-latest',
    visionModel: 'grok-2-vision-latest',
  };
}

/**
 * Sends a chat-completions request. Body shape:
 *   { messages, temperature?, max_tokens?, model? }
 * The proxy injects the right model server-side; a direct fallback remaps the
 * model locally. Returns the raw upstream Response (OpenAI-shaped JSON).
 * Retries a couple of times on 429 rate limits.
 */
export async function aiFetch(body: Record<string, unknown>): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // 1) Server-side proxy (key stays in the server environment)
    try {
      const response = await fetch(AI_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: body.messages,
          temperature: body.temperature,
          max_tokens: body.max_tokens,
          ...(Array.isArray(body.tools) && body.tools.length > 0
            ? { tools: body.tools, tool_choice: body.tool_choice ?? 'auto' }
            : {}),
        }),
      });
      if (response.status !== 429) return response;
      lastError = new Error(
        'AI service is temporarily busy. Try again in a moment.',
      );
    } catch {
      // 2) Proxy unreachable — direct call if a local key exists
      const apiKey = loadAiApiKey();
      if (apiKey) {
        const provider = getProvider(apiKey);
        const requestBody = {
          ...body,
          ...(apiKey.startsWith('gsk_') && typeof body.model === 'string'
            ? {
                model:
                  body.model.includes('vision')
                    ? provider.visionModel
                    : provider.model,
                // gpt-oss is a reasoning model: keep reasoning light so
                // coach replies stay fast and within the max_tokens budget
                reasoning_effort: 'low',
              }
            : {}),
        };
        const response = await fetch(provider.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(requestBody),
        });
        if (response.status !== 429) return response;
        lastError = new Error(
          'AI service is temporarily busy. Try again in a moment.',
        );
      } else {
        throw new Error(
          'AI service is temporarily unreachable. Try again in a moment.',
        );
      }
    }
    if (attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
  throw (
    lastError ??
    new Error('AI service is temporarily busy. Try again in a moment.')
  );
}
