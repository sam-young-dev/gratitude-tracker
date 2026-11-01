import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/insights')({ component: Insights })

function Insights() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-3xl font-semibold tracking-tight">
        Insights
      </h1>
      <p className="max-w-[65ch] text-muted-foreground">
        Your heat map and the themes you notice most will appear here after your
        first moment.
      </p>
    </div>
  )
}
