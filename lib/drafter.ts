// Claude-powered message drafter.
// Takes the user's brief + voice rules from their campaign, not global constants.

import type { Channel, MessageDraft } from './types';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-4-6';

// Baseline founder-voice guardrails. Anything the user adds to campaign.voice_rules
// is appended on top.
const BASELINE_RULES = `
Voice:
- Founder-led. Peer-to-peer. Calm, confident, specific.
- Not a sales rep. Writes like someone who has lived the buyer's problem.

Never:
- Buzzwords: "revolutionary", "game-changing", "disruptive", "seamless", "best-in-class", "AI-powered" (unless explicitly in the brief).
- Em-dashes as a stylistic tic. Use commas or short sentences.
- Talk the recipient's own products/portfolio back to them.
- Corporate, formal, or over-explained tone.
- Bullet lists or numbered lists in conversational outreach.
- Pricing in the first message.
- Request meetings longer than 10–15 minutes.

Always:
- One concrete proof point per message.
- A specific hook in the first sentence that proves you know who the recipient is.
- A clear ask at the end.
`;

function stripEmDashes(s: string): string {
  return s
    .replace(/\s+[—–]\s+/g, '. ')
    .replace(/[—–]/g, ', ')
    .replace(/\.\s+\./g, '.')
    .replace(/,\s+,/g, ',');
}

function buildSystemPrompt(opts: {
  channel: Channel;
  briefMd: string;
  voiceRules: string;
}): string {
  const channelRules = opts.channel === 'linkedin'
    ? `Channel: LinkedIn DM.
- Under 120 words. Shorter is better.
- No subject line.
- No "Hope you're well" or other generic opens.
- End with a concrete ask: "Worth 10 minutes?" or similar.
- No signature block, no links.`
    : `Channel: Email (cold first-touch).
- Subject: 4–8 words, specific to the recipient.
- Body: under 150 words, short paragraphs, plain text, no HTML.
- Sign off with the sender's name and company from the brief. One line each.`;

  const outputSchema = opts.channel === 'linkedin'
    ? `Return STRICT JSON only: { "body": "<message>" }`
    : `Return STRICT JSON only: { "subject": "<subject>", "body": "<body>" }`;

  return `You ghostwrite first-touch outreach messages on behalf of the author of the Sales Intelligence Brief below.

=== SALES INTELLIGENCE BRIEF ===
${opts.briefMd}
=== END BRIEF ===

${BASELINE_RULES}

${opts.voiceRules ? `Author-specific voice rules:\n${opts.voiceRules}\n` : ''}

${channelRules}

${outputSchema}

No prose, no markdown fences.`;
}

export interface DraftInput {
  channel: Channel;
  briefMd: string;
  voiceRules: string;
  apiKey: string;
  recipient: {
    name: string;
    title?: string;
    company?: string;
    fund?: string;
    why: string;
  };
  model?: string;
}

export async function draftMessage(opts: DraftInput): Promise<MessageDraft> {
  if (!opts.apiKey) throw new Error('missing anthropic api key');

  const system = buildSystemPrompt({
    channel: opts.channel,
    briefMd: opts.briefMd,
    voiceRules: opts.voiceRules,
  });

  const org = opts.recipient.company ?? opts.recipient.fund ?? '(unknown)';
  const role = opts.recipient.title ?? '(unknown role)';
  const user = `Recipient:
- Name: ${opts.recipient.name}
- Role: ${role}
- Organization: ${org}
- Why they matter (internal): ${opts.recipient.why}

Write the message. Open with something specific about their role, not their company's products.`;

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': opts.apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: opts.model ?? DEFAULT_MODEL,
      max_tokens: 700,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`anthropic ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data?.content?.[0]?.text ?? '';
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed = JSON.parse(trimmed) as { subject?: string; body?: string };

  if (typeof parsed.body !== 'string') {
    throw new Error(`drafter returned invalid shape: ${text.slice(0, 200)}`);
  }

  return {
    channel: opts.channel,
    subject: opts.channel === 'email' ? stripEmDashes(parsed.subject ?? '') : undefined,
    body: stripEmDashes(parsed.body),
    generatedAt: new Date().toISOString(),
    model: opts.model ?? DEFAULT_MODEL,
  };
}
