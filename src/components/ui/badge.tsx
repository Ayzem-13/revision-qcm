import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center overflow-hidden rounded-full border border-transparent font-semibold whitespace-nowrap tabular-nums transition-[background-color,color] duration-300 ease-emphasized [&>svg]:pointer-events-none [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        muted: "bg-muted text-muted-foreground",
        success:
          "bg-success/15 text-foreground dark:bg-success/20 [&>svg]:text-success",
        destructive:
          "bg-destructive/10 text-foreground dark:bg-destructive/15 [&>svg]:text-destructive",
        outline: "border-border text-foreground",
      },
      size: {
        default:
          "h-7 gap-1.5 px-3 text-xs [&>svg:not([class*='size-'])]:size-4",
        lg: "h-11 gap-2 rounded-xl px-4 font-mono text-sm [&>svg:not([class*='size-'])]:size-4.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      data-size={size}
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
