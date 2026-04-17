// Applies pending migrations. Run with: npm run db:migrate
// Reads DATABASE_URL from .env.local automatically via dotenv-flow-free inline loader.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

function loadEnvLocal() {
  try {
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
  } catch {
    // no .env.local is fine if DATABASE_URL is set some other way
  }
}

async function main() {
  loadEnvLocal();
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL not set. Add it to .env.local.');
    process.exit(1);
  }
  const client = postgres(url, { prepare: false, max: 1 });
  const db = drizzle(client);
  console.log('Running migrations…');
  await migrate(db, { migrationsFolder: './drizzle/migrations' });
  console.log('✓ migrations applied');
  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
