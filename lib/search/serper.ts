// Serper.dev client + LinkedIn query builder, parameterized per-user.
//
// Input: the user's decrypted Serper key, a target company/fund name, and
// the title list from their ICP. Output: raw organic results.

import type { IcpConfig } from '../types';

const SERPER_URL = 'https://google.serper.dev/search';

export class SerperError extends Error {
  constructor(message: string, public status?: number, public body?: string) {
    super(message);
    this.name = 'SerperError';
  }
}

export async function serperSearch(query: string, opts: {
  apiKey: string;
  num?: number;
  gl?: string;
  hl?: string;
}) {
  if (!opts.apiKey) throw new SerperError('missing serper api key');
  const res = await fetch(SERPER_URL, {
    method: 'POST',
    headers: { 'X-API-KEY': opts.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: query, num: opts.num ?? 10, gl: opts.gl ?? 'us', hl: opts.hl ?? 'en' }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new SerperError(`serper ${res.status}`, res.status, text);
  }
  return res.json() as Promise<{
    organic?: Array<{ title?: string; link?: string; snippet?: string }>;
  }>;
}

export function buildTargetQuery(
  targetName: string,
  icp: IcpConfig,
  kind: 'client' | 'investor' | 'custom' = 'custom',
): string {
  // Investor mode uses a fixed VC-only title set. Reason: ICP title weights
  // often include "founder" which matches startup founders (massive noise)
  // rather than fund founders. Scoring still uses ICP weights; search is strict.
  if (kind === 'investor') {
    const vcTitles = [
      '"managing partner"',
      '"general partner"',
      '"founding partner"',
      '"venture partner"',
      '"managing director"',
      '"principal"',
      '"partner"',
      '"angel investor"',
      '"solo capitalist"',
    ].join(' OR ');
    return `site:linkedin.com/in "${targetName}" (${vcTitles})`;
  }

  // Client / custom: use ICP-configured title weights.
  const titleClauses = icp.titleWeights
    .filter(t => t.match && t.weight >= 3)
    .slice(0, 10)
    .map(t => `"${t.match}"`)
    .join(' OR ');

  if (icp.searchQueryTemplate) {
    return icp.searchQueryTemplate
      .replaceAll('{target}', `"${targetName}"`)
      .replaceAll('{titles}', titleClauses || '');
  }

  return titleClauses
    ? `site:linkedin.com/in "${targetName}" (${titleClauses})`
    : `site:linkedin.com/in "${targetName}"`;
}
