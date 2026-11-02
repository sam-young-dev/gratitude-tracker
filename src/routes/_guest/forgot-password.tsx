import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { AuthLayout } from '@/components/auth-layout'
import { FormField } from '@/components/form-field'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'
import { EMAIL_PROBLEM, authErrorMessage, isEmail } from '@/lib/auth-errors'

export const Route = createFileRoute('/_guest/forgot-password')({
  head: () => ({ meta: [{ title: 'Reset your password · Gratitude Tracker' }] }),
  component: ForgotPassword,
})

function ForgotPassword() {
  const [pending, setPending] = useState(false)
  const [sentTo, setSentTo] = useState<string>()
  const [emailError, setEmailError] = useState<string>()
  const [formError, setFormError] = useState<string>()

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const email = String(
      new FormData(event.currentTarget).get('email') ?? '',
    ).trim()

    const nextError = isEmail(email) ? undefined : EMAIL_PROBLEM
    setEmailError(nextError)
    setFormError(undefined)
    if (nextError) return

    setPending(true)
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: '/reset-password',
    })
    setPending(false)
    if (error) {
      setFormError(authErrorMessage(error))
      return
    }
    setSentTo(email)
  }

  const back = (
    <Link
      to="/sign-in"
      className="font-medium text-primary underline-offset-4 hover:underline"
    >
      Back to sign in
    </Link>
  )

  if (sentTo) {
    return (
      <AuthLayout
        title="Check your email"
        description={`If ${sentTo} has an account, we've sent a link to choose a new password. It can take a few minutes to arrive.`}
        footer={back}
      >
        <p className="text-sm text-muted-foreground">
          Nothing there? Check your spam folder, or go back and try a different
          address.
        </p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Reset your password"
      description="Enter your email and we'll send you a link to choose a new one."
      footer={back}
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <FormField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          error={emailError}
        />
        {formError ? (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        ) : null}
        <Button type="submit" size="lg" className="h-11" disabled={pending}>
          {pending ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
    </AuthLayout>
  )
}
