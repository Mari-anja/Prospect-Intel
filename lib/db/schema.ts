// Drizzle schema for Prospect Intel SaaS.
//
// Supabase Auth owns the users table (auth.users). We don't replicate it —
// every user-scoped row just stores user_id (uuid) referencing auth.users.id.
//
// Row-level security is handled by the Supabase service role on the server
// (we never let the browser talk to the DB directly in v0).

import {
  pgTable, uuid, text, timestamp, integer, jsonb, pgEnum, index, unique,
} from 'drizzle-orm/pg-core';

// ---------- enums ----------

export const apiProviderEnum = pgEnum('api_provider', ['serper', 'anthropic', 'apollo']);

export const outreachStatusEnum = pgEnum('outreach_status', [
  'pending',
  'drafted',
  'contacted',
  'sent',
  'replied',
  'followup_due',
  'dead',
]);

// ---------- campaigns ----------
//
// One campaign == one ICP. A user can have many (e.g. "brand clients",
// "pre-seed investors", "agency partners"). Brief + ICP + voice live here.

export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  kind: text('kind').notNull().default('custom'), // 'client' | 'investor' | 'custom'
  briefMd: text('brief_md').notNull().default(''),
  icpConfig: jsonb('icp_config').notNull().default({}),        // title weights, category weights, min score
  priorityTargets: jsonb('priority_targets').notNull().default([]), // seed list of companies or funds
  voiceRules: text('voice_rules').notNull().default(''),       // founder voice overrides beyond the brief
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdIdx: index('campaigns_user_id_idx').on(t.userId),
}));

// ---------- api_keys ----------
//
// Bring-your-own-keys. Values are AES-256-GCM encrypted at rest with a
// server-side master key (KEY_ENCRYPTION_MASTER_KEY). Unique (user, provider).

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  provider: apiProviderEnum('provider').notNull(),
  // Encrypted blob, format: base64(iv) + ':' + base64(ciphertext) + ':' + base64(authTag)
  encryptedValue: text('encrypted_value').notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userProviderUniq: unique('api_keys_user_provider_uniq').on(t.userId, t.provider),
}));

// ---------- prospects ----------
//
// A prospect is the output of a search against a campaign's ICP.

export const prospects = pgTable('prospects', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').notNull(),
  userId: uuid('user_id').notNull(),       // denormalized for fast user-scoped queries
  name: text('name').notNull(),
  title: text('title').notNull().default(''),
  company: text('company').notNull().default(''),
  linkedin: text('linkedin').notNull().default(''),
  email: text('email').notNull().default(''),
  emailSource: text('email_source'),       // 'apollo' | 'manual' | null
  score: integer('score').notNull().default(0),
  why: text('why').notNull().default(''),
  // Raw normalizer payload — the confidence, extra fields from Serper, etc.
  rawNotes: jsonb('raw_notes').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  campaignIdx: index('prospects_campaign_idx').on(t.campaignId),
  userScoreIdx: index('prospects_user_score_idx').on(t.userId, t.score),
  // Don't dedupe across campaigns — same person can be in two ICPs — but dedupe within.
  campaignLinkedinUniq: unique('prospects_campaign_linkedin_uniq').on(t.campaignId, t.linkedin),
}));

// ---------- outreach_state ----------
//
// One row per prospect. Statuses, drafts, timeline, notes.

export const outreachState = pgTable('outreach_state', {
  prospectId: uuid('prospect_id').primaryKey(),
  userId: uuid('user_id').notNull(),       // denormalized for user-scoped queries
  status: outreachStatusEnum('status').notNull().default('pending'),
  note: text('note').notNull().default(''),
  // drafts: { linkedin?: MessageDraft, email?: MessageDraft }
  drafts: jsonb('drafts').notNull().default({}),
  // timeline: TimelineEvent[]
  timeline: jsonb('timeline').notNull().default([]),
  followupDue: text('followup_due'), // YYYY-MM-DD
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userIdIdx: index('outreach_user_id_idx').on(t.userId),
  statusIdx: index('outreach_status_idx').on(t.status),
}));

// ---------- runs ----------
//
// Audit trail: each search run records which campaign, when, how many prospects,
// which adapter, and any error. Useful for quota warnings and debugging.

export const runs = pgTable('runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').notNull(),
  userId: uuid('user_id').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  status: text('status').notNull().default('running'), // 'running' | 'ok' | 'error'
  adapter: text('adapter').notNull().default('serper'),
  prospectsFound: integer('prospects_found').notNull().default(0),
  prospectsKept: integer('prospects_kept').notNull().default(0),
  error: text('error'),
  log: text('log').notNull().default(''),
}, (t) => ({
  campaignIdx: index('runs_campaign_idx').on(t.campaignId),
}));

// ---------- inferred types ----------

export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;
export type Prospect = typeof prospects.$inferSelect;
export type NewProspect = typeof prospects.$inferInsert;
export type OutreachRow = typeof outreachState.$inferSelect;
export type ApiKeyRow = typeof apiKeys.$inferSelect;
export type RunRow = typeof runs.$inferSelect;
