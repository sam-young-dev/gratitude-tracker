import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/tags')({ component: Tags })

function Tags() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-3xl font-semibold tracking-tight">Tags</h1>
      <p className="max-w-[65ch] text-muted-foreground">
        Tags you add to moments will be listed here, where you can rename or
        delete them.
      </p>
    </div>
  )
}
