// Orchestrates a full campaign search: for each priority target, query Serper,
// normalize with Claude, score, filter. Emits a progress stream via callback.

import type { IcpConfig, PriorityTarget, ScoredProspect } from '../types';
import { serperSearch, buildTargetQuery } from './serper';
import { normalizeCandidates } from './normalizer';
import { scoreProspect } from '../scoring';

const DEFAULT_SLEEP_MS = 600;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export interface RunProgressMessage {
  target: string;
  raw: number;
  kept: number;
  error?: string;
}

export async function runCampaignSearch(opts: {
  serperKey: string;
  anthropicKey: string;
  icp: IcpConfig;
  targets: PriorityTarget[];
  kind?: 'client' | 'investor' | 'custom';
  onProgress?: (msg: RunProgressMessage) => void;
  sleepMs?: number;
}): Promise<{ prospects: ScoredProspect[]; errors: Array<{ target: string; error: string }> }> {
  const prospects: ScoredProspect[] = [];
  const errors: Array<{ target: string; error: string }> = [];
  const sleepFor = opts.sleepMs ?? DEFAULT_SLEEP_MS;
  const kind = opts.kind ?? 'custom';

  for (const target of opts.targets) {
    if (!target.name) continue;
    const query = buildTargetQuery(target.name, opts.icp, kind);
    let raw: Array<{ title?: string; link?: string; snippet?: string }> = [];

    try {
      const res = await serperSearch(query, { apiKey: opts.serperKey, num: 20 });
      raw = Array.isArray(res.organic) ? res.organic : [];
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ target: target.name, error: `serper: ${msg}` });
      opts.onProgress?.({ target: target.name, raw: 0, kept: 0, error: msg });
      await sleep(sleepFor);
      continue;
    }

    if (!raw.length) {
      opts.onProgress?.({ target: target.name, raw: 0, kept: 0 });
      await sleep(sleepFor);
      continue;
    }

    let normalized: Awaited<ReturnType<typeof normalizeCandidates>>;
    try {
      normalized = await normalizeCandidates({
        apiKey: opts.anthropicKey,
        targetName: target.name,
        rawResults: raw,
        kind,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ target: target.name, error: `normalize: ${msg}` });
      opts.onProgress?.({ target: target.name, raw: raw.length, kept: 0, error: msg });
      await sleep(sleepFor);
      continue;
    }

    let kept = 0;
    for (const n of normalized) {
      const scored = scoreProspect(n, opts.icp, opts.targets);
      if (scored.passed) {
        prospects.push(scored);
        kept++;
      }
    }

    opts.onProgress?.({ target: target.name, raw: raw.length, kept });
    await sleep(sleepFor);
  }

  prospects.sort((a, b) => b.score - a.score);
  return { prospects, errors };
}
