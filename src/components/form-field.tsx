import { CircleAlert } from 'lucide-react'
import { useId } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type FormFieldProps = Omit<React.ComponentProps<'input'>, 'id'> & {
  label: string
  error?: string
  hint?: string
}

// Error state uses three signals: red border (aria-invalid), icon, and text.
export function FormField({
  label,
  error,
  hint,
  ...inputProps
}: FormFieldProps) {
  const id = useId()
  const messageId = `${id}-message`
  const message = error ?? hint

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        className="h-11"
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        {...inputProps}
      />
      {message ? (
        <p
          id={messageId}
          role={error ? 'alert' : undefined}
          className={
            error
              ? 'flex items-start gap-1.5 text-sm text-destructive'
              : 'text-sm text-muted-foreground'
          }
        >
          {error ? (
            <CircleAlert
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
          ) : null}
          {message}
        </p>
      ) : null}
    </div>
  )
}
