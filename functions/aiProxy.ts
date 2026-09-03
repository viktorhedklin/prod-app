// AI proxy — keeps the AI provider API key server-side (environment variable).
// The app calls this function; the key never reaches the browser.
// Transparent passthrough: returns upstream OpenAI-shaped JSON (success + errors),
// so the app's existing response parsing and 429-retry logic work unchanged.
// Supports OpenAI-style function/tool calling: `tools` + `tool_choice` are
// validated and forwarded, and messages may carry tool_calls / tool results.

const MAX_TOKENS_CAP = 4000;
const MAX_MESSAGES = 80;
const MAX_TOOLS = 24;

Deno.serve(async (req) => {
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: { message: 'Method not allowed' } }),
      { status: 405, headers: corsHeaders },
    );
  }

  const apiKey = Deno.env.get('AI_API_KEY');
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: { message: 'AI key not configured on server' } }),
      { status: 500, headers: corsHeaders },
    );
  }

  let body: {
    messages?: unknown;
    temperature?: unknown;
    max_tokens?: unknown;
    tools?: unknown;
    tool_choice?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: { message: 'Invalid JSON body' } }),
      { status: 400, headers: corsHeaders },
    );
  }

  const messages = body?.messages;
  if (
    !Array.isArray(messages) ||
    messages.length === 0 ||
    messages.length > MAX_MESSAGES ||
    !messages.every(
      (m: any) =>
        m &&
        typeof m === 'object' &&
        typeof m.role === 'string' &&
        // plain content: string or multimodal array
        ((typeof m.content === 'string' || Array.isArray(m.content)) ||
          // assistant tool_calls message (content may be null)
          (Array.isArray(m.tool_calls) && m.tool_calls.length > 0) ||
          // tool result message
          (m.role === 'tool' && typeof m.content === 'string')),
    )
  ) {
    return new Response(
      JSON.stringify({ error: { message: 'Invalid messages payload' } }),
      { status: 400, headers: corsHeaders },
    );
  }

  const temperature =
    typeof body?.temperature === 'number' &&
    body.temperature >= 0 &&
    body.temperature <= 2
      ? body.temperature
      : 0.7;
  const maxTokens =
    typeof body?.max_tokens === 'number' && body.max_tokens > 0
      ? Math.min(Math.floor(body.max_tokens), MAX_TOKENS_CAP)
      : 1200;

  // Tool calling (function calling) — validated passthrough
  const tools =
    Array.isArray(body?.tools) &&
    (body.tools as unknown[]).length > 0 &&
    (body.tools as unknown[]).length <= MAX_TOOLS &&
    (body.tools as any[]).every(
      (t: any) =>
        t &&
        t.type === 'function' &&
        t.function &&
        typeof t.function.name === 'string' &&
        typeof t.function.description === 'string' &&
        typeof t.function.parameters === 'object',
    )
      ? (body.tools as unknown[])
      : undefined;
  const toolChoice =
    tools && (typeof body?.tool_choice === 'string' || (body?.tool_choice && typeof body.tool_choice === 'object'))
      ? (body.tool_choice as unknown)
      : undefined;

  // Provider auto-detection from the env key
  const isGroq = apiKey.startsWith('gsk_');
  const url = isGroq
    ? 'https://api.groq.com/openai/v1/chat/completions'
    : 'https://api.x.ai/v1/chat/completions';
  const payload: Record<string, unknown> = {
    model: isGroq ? 'openai/gpt-oss-120b' : 'grok-2-latest',
    messages,
    temperature,
    max_tokens: maxTokens,
  };
  if (tools) {
    payload.tools = tools;
    payload.tool_choice = toolChoice ?? 'auto';
  }
  if (isGroq) {
    // gpt-oss is a reasoning model: keep reasoning light for fast coach replies
    payload.reasoning_effort = 'low';
  }

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    return new Response(
      JSON.stringify({
        error: { message: 'AI provider is temporarily unreachable' },
      }),
      { status: 502, headers: corsHeaders },
    );
  }

  const upstreamText = await upstream.text();
  return new Response(upstreamText, {
    status: upstream.status,
    headers: corsHeaders,
  });
});
