import type { IcpConfig, PriorityTarget, ProspectCandidate, ScoredProspect } from './types';

function scoreTitle(title: string, icp: IcpConfig): number {
  const t = (title || '').toLowerCase();
  let best = 0;
  for (const { match, weight } of icp.titleWeights) {
    if (match && t.includes(match.toLowerCase()) && weight > best) best = weight;
  }
  return best;
}

function scoreCompany(company: string, icp: IcpConfig, targets: PriorityTarget[]): {
  catWeight: number;
  sigWeight: number;
  priorityHit?: PriorityTarget;
} {
  const c = (company || '').toLowerCase();

  const priorityHit = targets.find(t => t.name && c.includes(t.name.toLowerCase()));
  if (priorityHit) {
    // Priority targets get the priority weight + any user-asserted signals.
    const sigWeight = (priorityHit.signals?.length ?? 0) > 0 ? 1 : 0;
    return { catWeight: icp.companyCategoryWeights.priority, sigWeight, priorityHit };
  }

  // Soft match via keywords.
  const keywordHit = icp.companyKeywords.some(kw => kw && c.includes(kw.toLowerCase()));
  if (keywordHit) {
    return { catWeight: icp.companyCategoryWeights.softMatch, sigWeight: 0 };
  }

  return { catWeight: icp.companyCategoryWeights.unknown, sigWeight: 0 };
}

function scoreSignals(recentPosts: string[] | undefined, icp: IcpConfig): { bonus: number; hit?: string } {
  if (!recentPosts?.length || !icp.signalKeywords.length) return { bonus: 0 };
  for (const post of recentPosts) {
    const lp = post.toLowerCase();
    for (const kw of icp.signalKeywords) {
      if (kw && lp.includes(kw.toLowerCase())) {
        return { bonus: icp.signalBonus, hit: kw };
      }
    }
  }
  return { bonus: 0 };
}

export function scoreProspect(
  p: ProspectCandidate,
  icp: IcpConfig,
  targets: PriorityTarget[],
): ScoredProspect {
  const titleW = scoreTitle(p.title, icp);
  const { catWeight, sigWeight, priorityHit } = scoreCompany(p.company, icp, targets);
  const { bonus, hit: signalHit } = scoreSignals(p.recentPosts, icp);

  const raw = titleW + catWeight + sigWeight + bonus;
  const score = Math.min(raw, icp.scoreCap);

  // Title fit is load-bearing. Zero title match → drop.
  const passed = titleW > 0 && score >= icp.minScore;

  const whyParts: string[] = [];
  if (titleW >= 4)      whyParts.push(`${p.title} is a primary buyer persona`);
  else if (titleW >= 3) whyParts.push(`${p.title} is in the buying-committee orbit`);
  if (priorityHit)      whyParts.push(`${p.company} is a priority target`);
  else if (catWeight)   whyParts.push(`${p.company} matches ICP company keywords`);
  if (sigWeight)        whyParts.push(`brand flagged as ${priorityHit?.signals?.join(', ')}`);
  if (signalHit)        whyParts.push(`recent signal: ${signalHit}`);

  return {
    ...p,
    score,
    why: whyParts.join('; ') || 'weak match',
    passed,
  };
}
