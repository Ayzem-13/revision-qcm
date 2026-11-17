import * as React from "react"
import { cn } from "@/lib/utils"

function Spinner({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="spinner"
      aria-hidden="true"
      className={cn(
        "grid size-16 shrink-0 place-items-center rounded-full bg-primary/15",
        className
      )}
      {...props}
    >
      <span className="size-9 animate-shape-morph bg-primary" />
    </span>
  )
}

export { Spinner }
