'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/dashboard',  label: 'Campaigns', hint: 'your ICPs' },
  { href: '/settings',   label: 'Settings',  hint: 'API keys' },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav className="px-3 flex-1">
      <ul className="space-y-1">
        {NAV.map(item => {
          const active = pathname?.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={
                  'block rounded-md px-3 py-2 text-sm transition-colors ' +
                  (active ? 'bg-ink-900 text-white' : 'text-ink-700 hover:bg-ink-100')
                }
              >
                <div className="font-medium">{item.label}</div>
                <div className={'text-xs ' + (active ? 'text-ink-200' : 'text-ink-400')}>{item.hint}</div>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
