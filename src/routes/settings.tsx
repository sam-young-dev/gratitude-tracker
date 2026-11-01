import { Link, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/settings')({ component: Settings })

function Settings() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-3xl font-semibold tracking-tight">
        Settings
      </h1>
      <p className="max-w-[65ch] text-muted-foreground">
        Theme, export and account options will live here.
      </p>
      <Link
        to="/tags"
        className="min-h-11 w-fit rounded-lg py-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        Manage tags
      </Link>
    </div>
  )
}
