// One-off prospect CSV exporter. Reads DATABASE_URL from .env.local.
// Writes one CSV per campaign to ~/Downloads/<campaign-name>.csv

import { readFileSync } from 'node:fs';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, desc } from 'drizzle-orm';
import * as schema from '../lib/db/schema';

function loadEnv() {
  const text = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

function escCsv(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function safeFileName(s: string): string {
  return s.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

async function main() {
  loadEnv();
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL missing in .env.local');

  const client = postgres(url, { prepare: false, max: 1 });
  const db = drizzle(client, { schema });

  // Pull all campaigns. Single-user assumption (you).
  const campaigns = await db.select().from(schema.campaigns).orderBy(desc(schema.campaigns.updatedAt));
  if (!campaigns.length) {
    console.log('No campaigns found.');
    await client.end();
    return;
  }

  const outDir = join(homedir(), 'Downloads');
  await mkdir(outDir, { recursive: true });

  const allRows: string[][] = [];
  const headers = [
    'campaign', 'name', 'title', 'company', 'linkedin', 'email', 'score',
    'why', 'status', 'note', 'followup_due', 'last_updated',
  ];
  allRows.push(headers);

  for (const c of campaigns) {
    const rows = await db
      .select({ p: schema.prospects, o: schema.outreachState })
      .from(schema.prospects)
      .leftJoin(schema.outreachState, eq(schema.outreachState.prospectId, schema.prospects.id))
      .where(eq(schema.prospects.campaignId, c.id))
      .orderBy(desc(schema.prospects.score));

    if (!rows.length) {
      console.log(`[${c.name}] 0 prospects, skipping`);
      continue;
    }

    const perCampaign: string[][] = [headers];
    for (const r of rows) {
      const line = [
        c.name,
        r.p.name,
        r.p.title,
        r.p.company,
        r.p.linkedin,
        r.p.email,
        String(r.p.score),
        r.p.why,
        r.o?.status ?? 'pending',
        r.o?.note ?? '',
        r.o?.followupDue ?? '',
        r.o?.updatedAt?.toISOString() ?? '',
      ];
      perCampaign.push(line);
      allRows.push(line);
    }

    const fname = `prospect-intel--${safeFileName(c.name)}.csv`;
    const path = join(outDir, fname);
    const csv = perCampaign.map(row => row.map(escCsv).join(',')).join('\n') + '\n';
    await writeFile(path, csv, 'utf8');
    console.log(`[${c.name}] ${rows.length} rows → ${path}`);
  }

  // Combined file across all campaigns.
  const combinedPath = join(outDir, 'prospect-intel--ALL.csv');
  const combinedCsv = allRows.map(row => row.map(escCsv).join(',')).join('\n') + '\n';
  await writeFile(combinedPath, combinedCsv, 'utf8');
  console.log(`\n[ALL] ${allRows.length - 1} rows → ${combinedPath}`);

  await client.end();
}

main().catch(err => { console.error(err); process.exit(1); });
