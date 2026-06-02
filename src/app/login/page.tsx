import Link from 'next/link'
import { headers, cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase'
import { LoginForm } from '@/components/LoginForm'

export default async function Login({
  searchParams,
}: {
  searchParams: { message: string }
}) {
  // Check if user is already authenticated
  const cookieStore = cookies()
  const supabase = createServerClient(cookieStore)

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If session exists, redirect based on user type
  if (session) {
    const user = session.user

    // If user has email, they're an admin user
    if (user.email) {
      redirect('/admin')
    } else {
      // Otherwise they're a regular user authenticated with phone
      redirect('/rezervacije')
    }
  }

  // Rest of the login page code remains the same
  const signIn = async (formData: FormData) => {
    'use server'

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const cookieStore = cookies()
    const supabase = createServerClient(cookieStore)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        data: {
          is_admin: true,
        },
      },
    })

    if (error) {
      return redirect('/login?message=Could not authenticate user')
    }

    return redirect('/admin')
  }

  return (
    <div className="mx-auto flex h-full w-screen flex-1 flex-col justify-center gap-2 px-8 sm:max-w-md">
      <Link
        href="/"
        className="bg-btn-background hover:bg-btn-background-hover group absolute left-8 top-8 flex items-center rounded-md px-4 py-2 text-sm text-foreground no-underline"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>{' '}
        Back
      </Link>

      <LoginForm signIn={signIn} message={searchParams?.message} />
    </div>
  )
}
