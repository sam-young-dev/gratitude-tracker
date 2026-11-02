import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { AuthLayout } from '@/components/auth-layout'
import { FormField } from '@/components/form-field'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'
import { PASSWORD_PROBLEM, authErrorMessage } from '@/lib/auth-errors'

export const Route = createFileRoute('/reset-password')({
  head: () => ({
    meta: [{ title: 'Choose a new password · Gratitude Tracker' }],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : undefined,
    error: typeof search.error === 'string' ? search.error : undefined,
  }),
  component: ResetPassword,
})

function ResetPassword() {
  const { token, error: linkError } = Route.useSearch()
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [passwordError, setPasswordError] = useState<string>()
  const [formError, setFormError] = useState<string>()

  if (!token || linkError) {
    return (
      <AuthLayout
        title="This link isn’t working"
        description="Reset links expire after an hour and only work once."
      >
        <Button
          size="lg"
          className="h-11"
          onClick={() => router.navigate({ to: '/forgot-password' })}
        >
          Send a new link
        </Button>
      </AuthLayout>
    )
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || !token) return
    const password = String(
      new FormData(event.currentTarget).get('password') ?? '',
    )

    const nextError = password.length >= 8 ? undefined : PASSWORD_PROBLEM
    setPasswordError(nextError)
    setFormError(undefined)
    if (nextError) return

    setPending(true)
    const { error } = await authClient.resetPassword({
      newPassword: password,
      token,
    })
    if (error) {
      setFormError(authErrorMessage(error))
      setPending(false)
      return
    }
    await router.navigate({ to: '/sign-in' })
  }

  return (
    <AuthLayout
      title="Choose a new password"
      footer={
        <Link
          to="/sign-in"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      }
    >
      <form
        method="post"
        onSubmit={onSubmit}
        noValidate
        className="flex flex-col gap-5"
      >
        <FormField
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          error={passwordError}
        />
        {formError ? (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        ) : null}
        <Button type="submit" size="lg" className="h-11" disabled={pending}>
          {pending ? 'Saving…' : 'Save new password'}
        </Button>
      </form>
    </AuthLayout>
  )
}
