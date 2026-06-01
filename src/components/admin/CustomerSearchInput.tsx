'use client'

import { useRef, useState } from 'react'

export type CustomerUser = {
  id: number
  user_id: string
  name: string
  phone_number: string
}

interface CustomerSearchInputProps {
  /** Registered customers to search through. */
  users: CustomerUser[]
  /** Current typed name (also the walk-in value). */
  name: string
  /** Fired when the admin types — the name is no longer a linked customer. */
  onNameChange: (value: string) => void
  /**
   * Fired on selection. A `CustomerUser` links the appointment to that
   * customer; `null` means "use the typed text as-is" (walk-in).
   */
  onSelectUser: (user: CustomerUser | null) => void
}

export default function CustomerSearchInput({
  users,
  name,
  onNameChange,
  onSelectUser,
}: CustomerSearchInputProps) {
  const [open, setOpen] = useState(false)
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const query = name.trim().toLowerCase()
  const matches =
    query.length > 0
      ? users.filter(
          (user) =>
            user.name.toLowerCase().includes(query) ||
            user.phone_number.toLowerCase().includes(query),
        )
      : []

  const handleSelectWalkIn = () => {
    onSelectUser(null)
    setOpen(false)
  }

  const handleSelectUser = (user: CustomerUser) => {
    onSelectUser(user)
    setOpen(false)
  }

  return (
    <div className="relative mb-6">
      <input
        className="w-full rounded-md border bg-inherit px-4 py-2"
        name="name"
        placeholder="Sinbad Mehic"
        value={name}
        autoComplete="off"
        onChange={(e) => {
          onNameChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => {
          if (blurTimeout.current) clearTimeout(blurTimeout.current)
          if (name.trim().length > 0) setOpen(true)
        }}
        onBlur={() => {
          // Delay so a click on a dropdown row registers before we close.
          blurTimeout.current = setTimeout(() => setOpen(false), 150)
        }}
      />

      {open && query.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-background shadow-md">
          <li>
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-muted"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleSelectWalkIn}
            >
              <span>
                Koristi &quot;<span className="font-medium">{name}</span>&quot;
              </span>
              <span className="text-xs text-muted-foreground">novi unos</span>
            </button>
          </li>

          {matches.map((user) => (
            <li key={user.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-muted"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelectUser(user)}
              >
                <span className="font-medium">{user.name}</span>
                <span className="text-sm text-muted-foreground">
                  {user.phone_number}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
