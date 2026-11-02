import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { AuthLayout } from '@/components/auth-layout'
import { FormField } from '@/components/form-field'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'
import {
  EMAIL_PROBLEM,
  PASSWORD_PROBLEM,
  authErrorMessage,
  isEmail,
} from '@/lib/auth-errors'

export const Route = createFileRoute('/_guest/sign-up')({
  head: () => ({ meta: [{ title: 'Create your account · Gratitude Tracker' }] }),
  component: SignUp,
})

function SignUp() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [errors, setErrors] = useState<{
    name?: string
    email?: string
    password?: string
  }>({})
  const [formError, setFormError] = useState<string>()

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') ?? '').trim()
    const email = String(data.get('email') ?? '').trim()
    const password = String(data.get('password') ?? '')

    const next = {
      name: name ? undefined : 'Enter the name you want us to use.',
      email: isEmail(email) ? undefined : EMAIL_PROBLEM,
      password: password.length >= 8 ? undefined : PASSWORD_PROBLEM,
    }
    setErrors(next)
    setFormError(undefined)
    if (next.name || next.email || next.password) return

    setPending(true)
    const { error } = await authClient.signUp.email({ name, email, password })
    if (error) {
      setFormError(authErrorMessage(error))
      setPending(false)
      return
    }
    await router.invalidate()
    await router.navigate({ to: '/' })
  }

  return (
    <AuthLayout
      title="Create your account"
      description="A private place to write down when you see God at work. Only you can read it."
      footer={
        <>
          Already have an account?{' '}
          <Link
            to="/sign-in"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
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
          label="Your name"
          name="name"
          autoComplete="name"
          error={errors.name}
        />
        <FormField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          error={errors.email}
        />
        <FormField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          error={errors.password}
        />
        {formError ? (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        ) : null}
        <Button type="submit" size="lg" className="h-11" disabled={pending}>
          {pending ? 'Creating your account…' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  )
}
