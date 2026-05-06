import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function buildPrompt(text: string): string {
  return [
    'Summarize the following passage for an ADHD reader.',
    'Return only concise bullet points and no intro.',
    'Rules:',
    '- 5 to 7 bullets',
    '- each bullet <= 15 words',
    '- prioritize actionable clarity and key facts',
    '',
    text,
  ].join('\n');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = typeof body?.text === 'string' ? body.text.trim() : '';

    if (text.length < 50) {
      return NextResponse.json({ error: 'Text must be at least 50 characters.' }, { status: 400 });
    }

    const apiKey = getRequiredEnv('GEMINI_API_KEY');
    const preferredModel = process.env.GEMINI_MODEL;
    const modelCandidates = [
      preferredModel,
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
    ].filter((m, idx, arr): m is string => Boolean(m) && arr.indexOf(m as string) === idx);

    let data: GeminiResponse | null = null;
    let lastStatus = 500;
    let lastMessage = 'Gemini request failed.';

    for (const model of modelCandidates) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: buildPrompt(text) }],
            },
          ],
        }),
        cache: 'no-store',
      });

      const payload = await response.json();
      if (response.ok) {
        data = payload;
        break;
      }

      lastStatus = response.status;
      lastMessage = payload?.error?.message || `Gemini request failed for model ${model}.`;

      // Try next model only when model/version is unavailable.
      if (response.status !== 404) {
        return NextResponse.json({ error: lastMessage }, { status: response.status });
      }
    }

    if (!data) {
      return NextResponse.json({ error: lastMessage }, { status: lastStatus });
    }

    const summaryText = String(data?.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
    if (!summaryText) {
      return NextResponse.json({ error: 'No summary returned by Gemini.' }, { status: 502 });
    }

    const bullets = summaryText
      .split('\n')
      .map((line) => line.replace(/^[-*•]\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 7);

    return NextResponse.json({ summary: summaryText, bullets });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected summary error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
