'use client'

import { useRef, useState } from 'react'

interface LoginFormProps {
  // Server action passed down from the (server) login page.
  signIn: (formData: FormData) => Promise<void>
  message?: string
}

// Client wrapper around the email/password login. Disables the submit button
// while the sign-in request is in flight so rapid double-clicks can't fire
// multiple auth requests. The ref is a synchronous lock: `loading` state only
// applies after a re-render, so a same-tick second submit would otherwise slip
// through.
export function LoginForm({ signIn, message }: LoginFormProps) {
  const [loading, setLoading] = useState(false)
  const isSubmittingRef = useRef(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true
    setLoading(true)

    try {
      await signIn(new FormData(e.currentTarget))
    } finally {
      // On success the action redirects and this component unmounts, so this
      // mainly resets the lock when authentication fails and we stay on the page.
      isSubmittingRef.current = false
      setLoading(false)
    }
  }

  return (
    <form
      className="flex w-full flex-1 flex-col justify-center gap-2 text-foreground animate-in"
      onSubmit={handleSubmit}
    >
      <label className="text-md" htmlFor="email">
        Email
      </label>
      <input
        className="mb-6 rounded-md border bg-inherit px-4 py-2"
        name="email"
        placeholder="you@example.com"
        required
      />
      <label className="text-md" htmlFor="password">
        Password
      </label>
      <input
        className="mb-6 rounded-md border bg-inherit px-4 py-2"
        type="password"
        name="password"
        placeholder="••••••••"
        required
      />
      <button
        type="submit"
        disabled={loading}
        aria-disabled={loading}
        className="mb-2 rounded-md bg-green-700 px-4 py-2 text-foreground disabled:opacity-60"
      >
        {loading ? 'Signing In...' : 'Sign In'}
      </button>
      {message && (
        <p className="mt-4 bg-foreground/10 p-4 text-center text-foreground">
          {message}
        </p>
      )}
    </form>
  )
}
