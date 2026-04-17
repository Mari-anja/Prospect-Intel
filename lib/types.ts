export type OutreachStatus =
  | 'pending' | 'drafted' | 'contacted' | 'sent' | 'replied' | 'followup_due' | 'dead';

export type Channel = 'linkedin' | 'email';
export type Provider = 'serper' | 'anthropic' | 'apollo';

export interface MessageDraft {
  channel: Channel;
  subject?: string;
  body: string;
  generatedAt: string;
  model: string;
}

export type TimelineEventKind =
  | 'status-change' | 'drafted' | 'sent-linkedin' | 'sent-email'
  | 'replied' | 'note' | 'enriched' | 'followup-scheduled';

export interface TimelineEvent {
  at: string;
  kind: TimelineEventKind;
  summary: string;
  data?: Record<string, unknown>;
}

// ---------- ICP config ----------
//
// User-editable JSON. Stored on campaigns.icp_config. These drive scoring.

export interface TitleWeight {
  match: string;  // case-insensitive substring
  weight: number; // 1–4 recommended
}

export interface CompanyCategoryWeights {
  priority: number;       // match against priority_targets list (weight when found)
  softMatch: number;      // keyword match against ICP company_keywords
  unknown: number;
}

export interface IcpConfig {
  // Titles the user wants (buyer personas).
  titleWeights: TitleWeight[];
  // Company/fund keywords to look for (e.g. "furniture", "lighting", "proptech").
  companyKeywords: string[];
  // Weights applied based on category classification.
  companyCategoryWeights: CompanyCategoryWeights;
  // Bonus weights for live signals in scraped posts (e.g. "salone del mobile").
  signalKeywords: string[];
  signalBonus: number;
  // Hard gate + cap.
  minScore: number;
  scoreCap: number;
  // Search query tuning.
  searchQueryTemplate?: string; // defaults to a sensible one
}

export interface PriorityTarget {
  name: string;         // "Flexform" or "Accel"
  category?: string;    // user-defined label
  notes?: string;
  signals?: string[];   // user-asserted flags (e.g. "salone_exhibitor")
}

export const DEFAULT_ICP: IcpConfig = {
  titleWeights: [
    { match: 'head of pr', weight: 4 },
    { match: 'communications manager', weight: 4 },
    { match: 'marketing director', weight: 4 },
    { match: 'press office', weight: 4 },
    { match: 'brand manager', weight: 3 },
    { match: 'marketing manager', weight: 3 },
  ],
  companyKeywords: [],
  companyCategoryWeights: { priority: 3, softMatch: 2, unknown: 0 },
  signalKeywords: [],
  signalBonus: 2,
  minScore: 5,
  scoreCap: 10,
};

// ---------- search results ----------

export interface ProspectCandidate {
  name: string;
  title: string;
  company: string;
  linkedin: string;
  email?: string;
  rawNotes?: Record<string, unknown>;
  recentPosts?: string[];
}

// ---------- scoring output ----------

export interface ScoredProspect extends ProspectCandidate {
  score: number;
  why: string;
  passed: boolean;
}
