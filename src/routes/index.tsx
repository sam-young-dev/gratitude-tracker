import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-3xl font-semibold tracking-tight">
        Remember what God has done
      </h1>
      <p className="max-w-[65ch] text-muted-foreground">
        Your moments will show up here. Soon you will be able to write your
        first one and see it on your heat map.
      </p>
    </div>
  )
}
