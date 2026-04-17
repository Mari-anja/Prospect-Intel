// Claude-powered message drafter.
// Takes the user's brief + voice rules from their campaign, not global constants.

import type { Channel, MessageDraft } from './types';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-4-6';

// Baseline founder-voice guardrails. Anything the user adds to campaign.voice_rules
// is appended on top. Uses few-shot good/bad examples because abstract rules
// alone don't reliably shape LLM output — examples do.
const BASELINE_RULES = `
VOICE (non-negotiable):
- Write in FIRST PERSON ("I", never "we"). You are the founder, writing personally. Not a sales rep, not a team, not "the company".
- Short sentences. Punchy. Skip throat-clearing.
- Drop one specific, real observation about the problem — don't lecture the recipient about their own job.
- Treat the reader as a peer, not a prospect.

NEVER (these patterns make the message sound fake):
- "We built X for exactly this moment" / "Our platform lets you" / any corporate-royal-we phrasing.
- "[Their title] for a brand like [their company] means you're constantly thinking about..." — condescending, tells them what they already know.
- "Heading [department] at [company], you [verb]..." — same thing in another costume.
- Naming the recipient's company in the CTA ("Worth a coffee to see how Flexform could fit into that?"). Drop the brand from the ask.
- Buzzwords: revolutionary, game-changing, disruptive, seamless, best-in-class, AI-powered, cutting-edge.
- Em-dashes or en-dashes. Use periods, commas, or short sentences.
- Bullet lists, numbered lists, or headers in conversational outreach.
- Pricing, roadmap features, or future product plans in first message.
- Requests longer than 10-15 minutes.
- "Hope this finds you well" and similar filler.

ALWAYS:
- Lead with an honest, concrete fact. The best hook proves you've lived the problem.
- ONE proof point, chosen to match the recipient's stake in the problem.
- Close with a concrete ask that does not name the recipient's company.

SHAPE:
- LinkedIn DM: 60-90 words, no more.
- Email body: 100-140 words.
- 3 short paragraphs max. Usually 2.

--- EXAMPLES OF HOW MARI SOUNDS (follow this shape) ---

BAD (DO NOT WRITE LIKE THIS):
"Raffaela, heading PR and communications for a brand like Flexform means you're constantly thinking about where the product shows up and how it's experienced before someone buys it. We built Arqio for exactly that moment. Over 3,000 designers are already using it to place furniture into real client spaces and generate photorealistic renders in 30 seconds, live in the meeting. Worth a coffee to see how Flexform could fit into that?"
Problems: lectures her about her job, "we built", over-explains the product, names Flexform in CTA.

GOOD (WRITE LIKE THIS):
"Raffaela, I'm Mari, founder of Arqio. I spent five years as an interior architect before this. The thing I kept losing: clients who couldn't picture the room fast enough, so the deal stalled. Arqio puts real products into real rooms in 30 seconds. 3,000+ designers on it. I'll be at Salone the week of the 21st. Worth 10 minutes while I'm there?"

GOOD (investor, cold):
"Zach, I'm Mari, founder of Arqio. Ex-interior architect. The specification market is broken because no one can visualize fast enough in the meeting, so designers default to whatever's easy to show, not what's best. Arqio fixes that. 3,000+ designers, first brand contracts closing. Raising pre-seed. Any chance you're open to 15 minutes?"

GOOD (email, longer but same voice):
Subject: a 30-second render problem
"Raffaela,

I'm Mari, founder of Arqio. Five years in interior architecture before this. I left because every project I ran, the visualization step killed momentum with clients.

Arqio drops a photo of a real client room, places real products from real catalogs, and renders in 30 seconds. Architecturally accurate. 3,000+ designers use it daily.

I'll be at Salone April 21-26. Worth 10 minutes over espresso?

Mari
Founder, Arqio
arqio.ai"
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
- Why they matter (internal note, do NOT quote this back to them): ${opts.recipient.why}

Write the message in MARI'S VOICE. Use first person "I", never "we".

Open with Mari's identity in one sentence ("I'm Mari, founder of Arqio. Was an interior architect for 5 years before this.") then jump to the real problem — the thing Mari lived. Don't explain the recipient's job to them. Don't say "we built Arqio for you" or similar.

Close with a concrete ask. If investor, ask for 15 min. If client/brand contact, ask for 10 min. Don't name the recipient's company in the ask.`;

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
