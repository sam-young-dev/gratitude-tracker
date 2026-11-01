import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/moments')({ component: Moments })

function Moments() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-3xl font-semibold tracking-tight">
        Moments
      </h1>
      <p className="max-w-[65ch] text-muted-foreground">
        You haven&rsquo;t written a moment yet. Once you do, you can search and
        filter them here.
      </p>
    </div>
  )
}
