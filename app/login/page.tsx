import { login } from './actions'
import Link from 'next/link'
import { LogIn } from 'lucide-react'

export default async function LoginPage(props: {
  searchParams: Promise<{ error?: string, message?: string }>
}) {
  const searchParams = await props.searchParams;
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-8 flex flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900">
            <LogIn className="h-6 w-6 text-zinc-900 dark:text-zinc-100" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Enter your details to sign in to your account
          </p>
        </div>

        <form action={login} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="rounded-lg border border-zinc-300 bg-transparent px-4 py-2 text-sm placeholder-zinc-500 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-400 dark:focus:border-zinc-300"
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="rounded-lg border border-zinc-300 bg-transparent px-4 py-2 text-sm placeholder-zinc-500 focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:text-zinc-100 dark:placeholder-zinc-400 dark:focus:border-zinc-300"
            />
          </div>

          {searchParams?.error && (
            <p className="text-sm text-red-500 dark:text-red-400">{searchParams.error}</p>
          )}
          
          {searchParams?.message && (
            <p className="text-sm text-green-500 dark:text-green-400">{searchParams.message}</p>
          )}

          <button
            type="submit"
            className="mt-2 w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus:ring-white dark:focus:ring-offset-zinc-950"
          >
            Sign In
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-medium text-zinc-900 hover:underline dark:text-zinc-100">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  )
}
