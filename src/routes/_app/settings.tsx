import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'
import { exportFilename, toJson, toMarkdown } from '@/lib/export'
import { exportEntriesFn } from '@/lib/journal.functions'

export const Route = createFileRoute('/_app/settings')({ component: Settings })

type Theme = 'light' | 'dark' | 'system'
const THEMES: Array<{ value: Theme; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'Match device' },
]

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem('theme')
    return stored === 'light' || stored === 'dark' ? stored : 'system'
  } catch {
    return 'system'
  }
}

function applyTheme(theme: Theme) {
  try {
    if (theme === 'system') localStorage.removeItem('theme')
    else localStorage.setItem('theme', theme)
  } catch {}
  const dark =
    theme === 'system'
      ? matchMedia('(prefers-color-scheme: dark)').matches
      : theme === 'dark'
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.dataset.themePref = theme
}

function download(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function Settings() {
  const { user } = Route.useRouteContext()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const [theme, setTheme] = useState<Theme>('system')
  const [exporting, setExporting] = useState<'json' | 'md'>()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [password, setPassword] = useState('')
  const [deleteError, setDeleteError] = useState<string>()
  const [deleting, setDeleting] = useState(false)

  // The selected button is styled from <html data-theme-pref> (see styles.css) so
  // it is right on first paint; this state only keeps aria-checked in sync.
  useEffect(() => setTheme(readTheme()), [])

  function chooseTheme(next: Theme) {
    setTheme(next)
    applyTheme(next)
  }

  async function signOut() {
    if (signingOut) return
    setSigningOut(true)
    await authClient.signOut()
    await router.invalidate()
    await router.navigate({ to: '/sign-in' })
  }

  async function runExport(kind: 'json' | 'md') {
    if (exporting) return
    setExporting(kind)
    try {
      const { entries, exportedAt } = await exportEntriesFn()
      const day = exportedAt.slice(0, 10)
      if (kind === 'json') {
        download(
          exportFilename('json', day),
          toJson(entries, exportedAt),
          'application/json',
        )
      } else {
        download(
          exportFilename('md', day),
          toMarkdown(entries, exportedAt),
          'text/markdown',
        )
      }
    } catch {
      toast.error('We couldn’t export your moments. Try again.')
    } finally {
      setExporting(undefined)
    }
  }

  async function deleteAccount(event: React.FormEvent) {
    event.preventDefault()
    if (deleting) return
    if (!password) {
      setDeleteError('Enter your password to confirm.')
      return
    }
    setDeleting(true)
    setDeleteError(undefined)
    const { error } = await authClient.deleteUser({ password })
    if (error) {
      setDeleteError(
        error.status === 400
          ? 'That password isn’t right.'
          : 'We couldn’t delete your account. Try again.',
      )
      setDeleting(false)
      return
    }
    await router.invalidate()
    await router.navigate({ to: '/sign-in' })
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-serif text-3xl font-semibold tracking-tight">
        Settings
      </h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Account</h2>
        <p>
          {user.name}
          <span className="block text-muted-foreground">{user.email}</span>
        </p>
        <Button
          variant="outline"
          className="h-11 w-fit"
          onClick={signOut}
          disabled={signingOut}
        >
          {signingOut ? 'Signing out…' : 'Sign out'}
        </Button>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Theme</h2>
        <div
          role="radiogroup"
          aria-label="Theme"
          className="flex flex-wrap gap-3"
        >
          {THEMES.map((option) => (
            <Button
              key={option.value}
              role="radio"
              aria-checked={theme === option.value}
              variant="outline"
              data-theme-option={option.value}
              className="h-11"
              onClick={() => chooseTheme(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Your moments
        </h2>
        <p className="max-w-[65ch] text-muted-foreground">
          Download everything you&rsquo;ve written. Markdown is one file
          that&rsquo;s easy to read; JSON is for other tools.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            className="h-11"
            disabled={exporting !== undefined}
            onClick={() => runExport('md')}
          >
            {exporting === 'md' ? 'Preparing…' : 'Download as Markdown'}
          </Button>
          <Button
            variant="outline"
            className="h-11"
            disabled={exporting !== undefined}
            onClick={() => runExport('json')}
          >
            {exporting === 'json' ? 'Preparing…' : 'Download as JSON'}
          </Button>
        </div>
      </section>

      <Link
        to="/tags"
        className="min-h-11 w-fit rounded-lg py-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        Manage tags
      </Link>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Delete account
        </h2>
        <p className="max-w-[65ch] text-muted-foreground">
          This permanently deletes your account and every moment and tag in it.
          Download an export first if you want a copy.
        </p>
        <Button
          variant="destructive"
          className="h-11 w-fit"
          onClick={() => {
            setPassword('')
            setDeleteError(undefined)
            setConfirmingDelete(true)
          }}
        >
          Delete my account and all my moments
        </Button>
      </section>

      <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <AlertDialogContent>
          <form onSubmit={deleteAccount} className="flex flex-col gap-4">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                Your account, moments and tags will be gone for good. This
                can&rsquo;t be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex flex-col gap-2">
              <label htmlFor="delete-password" className="text-sm font-medium">
                Your password
              </label>
              <input
                id="delete-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={deleteError ? true : undefined}
                aria-describedby={deleteError ? 'delete-error' : undefined}
                className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm dark:bg-input/30"
              />
              {deleteError ? (
                <p
                  id="delete-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {deleteError}
                </p>
              ) : null}
            </div>
            <AlertDialogFooter className="gap-6 sm:justify-between">
              <AlertDialogCancel className="h-11" disabled={deleting}>
                Keep my account
              </AlertDialogCancel>
              <Button
                type="submit"
                variant="destructive"
                className="h-11"
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete everything'}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
