import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Prospect Intel',
  description: 'Founder-built prospect research and outreach. Bring your own brief, your own keys, own your data.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
