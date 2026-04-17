export function UserMenu({ email }: { email: string }) {
  return (
    <div className="border-t border-ink-200 p-4">
      <div className="truncate text-xs text-ink-500" title={email}>{email}</div>
      <form action="/auth/signout" method="post" className="mt-2">
        <button
          type="submit"
          className="text-xs font-medium text-ink-600 hover:text-ink-900 hover:underline"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
