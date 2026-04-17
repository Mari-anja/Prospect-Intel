// Server-side accessor for user BYO API keys. All values are encrypted at rest.

import { and, eq } from 'drizzle-orm';
import { getDb, schema } from './db';
import { encryptSecret, decryptSecret } from './crypto';
import type { Provider } from './types';

export async function saveKey(userId: string, provider: Provider, plaintext: string): Promise<void> {
  const encrypted = encryptSecret(plaintext);
  const db = getDb();
  await db
    .insert(schema.apiKeys)
    .values({ userId, provider, encryptedValue: encrypted })
    .onConflictDoUpdate({
      target: [schema.apiKeys.userId, schema.apiKeys.provider],
      set: { encryptedValue: encrypted },
    });
}

export async function deleteKey(userId: string, provider: Provider): Promise<void> {
  const db = getDb();
  await db
    .delete(schema.apiKeys)
    .where(and(eq(schema.apiKeys.userId, userId), eq(schema.apiKeys.provider, provider)));
}

export async function getKey(userId: string, provider: Provider): Promise<string | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.apiKeys)
    .where(and(eq(schema.apiKeys.userId, userId), eq(schema.apiKeys.provider, provider)))
    .limit(1);
  if (!rows.length) return null;
  return decryptSecret(rows[0].encryptedValue);
}

export async function getKeyStatuses(userId: string): Promise<Record<Provider, boolean>> {
  const db = getDb();
  const rows = await db
    .select({ provider: schema.apiKeys.provider })
    .from(schema.apiKeys)
    .where(eq(schema.apiKeys.userId, userId));
  const providers = new Set(rows.map(r => r.provider));
  return {
    serper: providers.has('serper'),
    anthropic: providers.has('anthropic'),
    apollo: providers.has('apollo'),
  };
}
