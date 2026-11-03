import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { AuthLayout } from '@/components/auth-layout'
import { FormField } from '@/components/form-field'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'
import { forgetSession } from '@/lib/auth.functions'
import { EMAIL_PROBLEM, authErrorMessage, isEmail } from '@/lib/auth-errors'

export const Route = createFileRoute('/_guest/sign-in')({
  head: () => ({ meta: [{ title: 'Sign in · Gratitude Tracker' }] }),
  component: SignIn,
})

function SignIn() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [emailError, setEmailError] = useState<string>()
  const [passwordError, setPasswordError] = useState<string>()
  const [formError, setFormError] = useState<string>()

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const data = new FormData(event.currentTarget)
    const email = String(data.get('email') ?? '').trim()
    const password = String(data.get('password') ?? '')

    const nextEmailError = isEmail(email) ? undefined : EMAIL_PROBLEM
    const nextPasswordError = password ? undefined : 'Enter your password.'
    setEmailError(nextEmailError)
    setPasswordError(nextPasswordError)
    setFormError(undefined)
    if (nextEmailError || nextPasswordError) return

    setPending(true)
    const { error } = await authClient.signIn.email({ email, password })
    if (error) {
      setFormError(authErrorMessage(error))
      setPending(false)
      return
    }
    forgetSession()
    await router.invalidate()
    await router.navigate({ to: '/' })
  }

  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in to see the moments you’ve written down."
      footer={
        <>
          New here?{' '}
          <Link
            to="/sign-up"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form
        method="post"
        onSubmit={onSubmit}
        noValidate
        className="flex flex-col gap-5"
      >
        <FormField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          error={emailError}
        />
        <FormField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          error={passwordError}
        />
        {formError ? (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        ) : null}
        <Button type="submit" size="lg" className="h-11" disabled={pending}>
          {pending ? 'Signing in…' : 'Sign in'}
        </Button>
        <Link
          to="/forgot-password"
          className="min-h-11 self-center py-3 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Forgot your password?
        </Link>
      </form>
    </AuthLayout>
  )
}
