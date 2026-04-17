// Normalizes raw Serper results into clean ProspectCandidate[] using Claude.
// Per-user: takes the user's Anthropic key, not a global env var.

import type { ProspectCandidate } from '../types';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-4-6';

const CLIENT_SYSTEM_PROMPT = `You normalize Google search results (LinkedIn profiles) into JSON.

You receive: a target company/fund name + up to 10 raw search results.
You output: a JSON array of real individual people at that target.

Schema:
[
  {
    "fullName": string,
    "title": string,
    "company": string,
    "linkedin": string,
    "confidence": "high" | "medium" | "low"
  }
]

Rules:
- Drop company pages, job posts, articles.
- Drop people who don't currently work at the target (watch for "Former", "Ex-").
- Drop duplicates (same linkedin slug).
- Drop if you cannot extract name + title with confidence.
- Return [] if nothing qualifies.
- Output ONLY the JSON. No prose, no markdown fences.`;

const INVESTOR_SYSTEM_PROMPT = `You normalize Google search results into JSON, specifically looking for VC PARTNERS or ANGEL INVESTORS at a target venture firm.

You receive: a target firm OR a named angel investor + up to 10 raw search results.
You output: a JSON array of individuals who are ACTIVELY INVESTING at the target.

Schema:
[
  {
    "fullName": string,
    "title": string,
    "company": string,
    "linkedin": string,
    "confidence": "high" | "medium" | "low"
  }
]

STRICT acceptance rules — only include someone if ALL are true:
- Their CURRENT title contains one of: "Partner", "Managing Partner", "General Partner", "Founding Partner", "Venture Partner", "Principal", "Managing Director", "Investor", "Angel", "Scout" (when clearly a scout investor).
- Their CURRENT company IS the target firm, or they are the named angel target.
- They are not "Former" / "Ex-" / "Previously".

REJECT (return nothing for these):
- Startup founders and operators mentioning the target as an investor.
- Portfolio-company CEOs/employees.
- Limited partners, advisors, consultants unless they have an operating investing title.
- Associates at law firms, banks, or general consulting firms.
- People whose title is "CEO" or "Founder" of a company NOT matching the target.
- Anyone with "forming" / "on leave" / "taking a break".

If the target is a NAMED INDIVIDUAL (e.g., "Scott Belsky", "Elad Gil", "Naval Ravikant"):
- Only return results where fullName matches AND the title indicates active investing (Partner/Advisor/Angel/Scout/Solo-GP).
- If multiple people share the name, only keep the one whose profile matches the tech-investor pattern.

Drop duplicates (same linkedin slug).
Drop company pages, job posts, articles.
Output ONLY the JSON array. No prose, no markdown fences. If nothing qualifies, return [].`;

export class NormalizerError extends Error {
  constructor(message: string, public status?: number, public body?: string) {
    super(message);
    this.name = 'NormalizerError';
  }
}

export async function normalizeCandidates(opts: {
  apiKey: string;
  targetName: string;
  rawResults: Array<{ title?: string; link?: string; snippet?: string }>;
  model?: string;
  kind?: 'client' | 'investor' | 'custom';
}): Promise<ProspectCandidate[]> {
  if (!opts.apiKey) throw new NormalizerError('missing anthropic api key');
  if (!opts.rawResults?.length) return [];

  const items = opts.rawResults.map((r, i) =>
    `#${i + 1}\nTITLE: ${r.title || ''}\nLINK: ${r.link || ''}\nSNIPPET: ${r.snippet || ''}`
  ).join('\n\n');
  const user = `Target: ${opts.targetName}\n\nRaw results:\n\n${items}`;

  const system = opts.kind === 'investor' ? INVESTOR_SYSTEM_PROMPT : CLIENT_SYSTEM_PROMPT;

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': opts.apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: opts.model ?? DEFAULT_MODEL,
      max_tokens: 3000,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new NormalizerError(`anthropic ${res.status}`, res.status, body);
  }
  const data = await res.json();
  const text = data?.content?.[0]?.text ?? '';
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');

  let parsed: unknown;
  try { parsed = JSON.parse(trimmed); } catch { throw new NormalizerError(`non-JSON reply: ${text.slice(0, 200)}`); }
  if (!Array.isArray(parsed)) throw new NormalizerError(`non-array reply: ${String(parsed).slice(0, 200)}`);

  return (parsed as Array<Record<string, unknown>>)
    .filter(p => typeof p.fullName === 'string' && typeof p.title === 'string' && typeof p.linkedin === 'string')
    .map(p => ({
      name: String(p.fullName),
      title: String(p.title),
      company: String(p.company ?? opts.targetName),
      linkedin: String(p.linkedin),
      rawNotes: { confidence: p.confidence },
      recentPosts: [],
    }));
}
