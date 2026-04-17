const APOLLO_URL = 'https://api.apollo.io/api/v1/people/match';

export interface ApolloHit {
  email: string | null;
  emailStatus: string | null;
  apolloId: string | null;
  title?: string;
  linkedinUrl?: string;
}

export async function apolloMatch(opts: {
  apiKey: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  organizationName?: string;
  linkedinUrl?: string;
}): Promise<ApolloHit | null> {
  if (!opts.apiKey) throw new Error('missing apollo api key');

  let firstName = opts.firstName;
  let lastName = opts.lastName;
  if (!firstName && !lastName && opts.name) {
    const parts = opts.name.trim().split(/\s+/);
    firstName = parts[0];
    lastName = parts.slice(1).join(' ');
  }

  const body: Record<string, unknown> = { reveal_personal_emails: false };
  if (firstName) body.first_name = firstName;
  if (lastName) body.last_name = lastName;
  if (opts.organizationName) body.organization_name = opts.organizationName;
  if (opts.linkedinUrl) body.linkedin_url = opts.linkedinUrl;

  const res = await fetch(APOLLO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', 'x-api-key': opts.apiKey },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`apollo ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  const person = data?.person;
  if (!person) return null;
  return {
    email: typeof person.email === 'string' ? person.email : null,
    emailStatus: person.email_status ?? null,
    apolloId: person.id ?? null,
    title: person.title,
    linkedinUrl: person.linkedin_url,
  };
}
