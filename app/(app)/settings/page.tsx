import { requireUser } from '@/lib/supabase/server';
import { getKeyStatuses } from '@/lib/keyStore';
import { KeyForm } from '@/components/KeyForm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SettingsPage() {
  const user = await requireUser();
  const status = await getKeyStatuses(user.id);

  return (
    <div>
      <header className="border-b border-ink-200 bg-white px-8 pt-8 pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Settings</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-500">
          Bring your own API keys. Values are encrypted at rest (AES-256-GCM) and never shown back to you after saving.
        </p>
      </header>

      <div className="px-8 py-8 max-w-2xl space-y-8">
        <KeyForm
          provider="serper"
          label="Serper"
          required
          configured={status.serper}
          description="Web search for LinkedIn profiles. Cheapest reliable source. Get a key at serper.dev (free tier includes 2,500 queries)."
          placeholder="Your Serper API key"
        />
        <KeyForm
          provider="anthropic"
          label="Anthropic (Claude)"
          required
          configured={status.anthropic}
          description="Used to normalize search results + draft personalized outreach in your voice. Get a key at console.anthropic.com."
          placeholder="sk-ant-api03-…"
        />
        <KeyForm
          provider="apollo"
          label="Apollo (optional)"
          configured={status.apollo}
          description="Email enrichment for prospects. Optional — if you skip this, you'll still get LinkedIn URLs but no email addresses."
          placeholder="Your Apollo API key"
        />
      </div>
    </div>
  );
}
