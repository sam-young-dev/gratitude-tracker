export function AuthLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string
  description?: string
  children?: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-4 py-12">
      <p className="text-center font-serif text-xl font-semibold tracking-tight">
        Gratitude Tracker
      </p>
      <div className="flex flex-col gap-6 rounded-xl bg-card p-6 shadow-card sm:p-8">
        <div className="flex flex-col gap-2">
          <h1 className="font-serif text-2xl font-semibold tracking-tight">
            {title}
          </h1>
          {description ? (
            <p className="text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {children}
      </div>
      {footer ? (
        <p className="text-center text-sm text-muted-foreground">{footer}</p>
      ) : null}
    </main>
  )
}
