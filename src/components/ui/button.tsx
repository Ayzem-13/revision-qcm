import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center border border-transparent bg-clip-padding font-semibold whitespace-nowrap transition-[border-radius,background-color,color,box-shadow,opacity] duration-300 ease-emphasized outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary",
        tertiary:
          "bg-tertiary text-tertiary-foreground hover:bg-tertiary/90 hover:shadow-md",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted",
        ghost: "hover:bg-muted hover:text-foreground aria-expanded:bg-muted",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/15 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/15 dark:hover:bg-destructive/20",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-11 gap-2 rounded-xl px-5 text-sm active:rounded-md [&_svg:not([class*='size-'])]:size-4.5",
        lg: "h-14 gap-2 rounded-3xl px-7 text-base active:rounded-xl [&_svg:not([class*='size-'])]:size-5",
        icon: "size-11 rounded-xl active:rounded-md [&_svg:not([class*='size-'])]:size-5",
        tile: "h-12 w-full rounded-lg font-mono text-sm tabular-nums active:rounded-md aria-[current=step]:rounded-2xl aria-[current=step]:ring-2 aria-[current=step]:ring-primary",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
