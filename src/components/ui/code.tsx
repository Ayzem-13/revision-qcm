import * as React from "react"
import { cn } from "@/lib/utils"

function Code({ className, ...props }: React.ComponentProps<"code">) {
  return (
    <code
      data-slot="code"
      className={cn(
        "rounded-sm bg-foreground/10 px-1 py-0.5 font-mono text-[0.9em] wrap-break-word",
        className
      )}
      {...props}
    />
  )
}

function CodeBlock({
  code,
  label = "Extrait de code",
  className,
  ...props
}: Omit<React.ComponentProps<"pre">, "children"> & {
  code: string
  label?: string
}) {
  return (
    <pre
      data-slot="code-block"
      tabIndex={0}
      aria-label={label}
      className={cn(
        "[scrollbar-width:thin] overflow-x-auto rounded-xl border bg-background px-4 py-3 font-mono text-sm leading-6 text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
      {...props}
    >
      <code>{code}</code>
    </pre>
  )
}

export { Code, CodeBlock }
