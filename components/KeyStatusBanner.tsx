import Link from 'next/link';
import type { Provider } from '@/lib/types';

export function KeyStatusBanner({ keyStatus }: { keyStatus: Record<Provider, boolean> }) {
  const missing: string[] = [];
  if (!keyStatus.serper) missing.push('Serper');
  if (!keyStatus.anthropic) missing.push('Anthropic');
  if (!missing.length) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm text-amber-900">
          <span className="font-medium">API keys needed:</span>{' '}
          {missing.join(' + ')} before you can run a search.
        </div>
        <Link
          href="/settings"
          className="shrink-0 rounded-md bg-amber-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800"
        >
          Add keys →
        </Link>
      </div>
    </div>
  );
}
