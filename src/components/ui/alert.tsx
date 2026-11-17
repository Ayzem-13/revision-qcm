import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const alertVariants = cva(
  "group/alert relative grid w-full gap-1 rounded-3xl px-5 py-4 text-left text-base has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-3 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg:not([class*='size-'])]:size-6",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground *:[svg]:text-primary",
        destructive:
          "bg-destructive/10 text-foreground dark:bg-destructive/15 *:[svg]:text-destructive",
        success:
          "bg-success/15 text-foreground dark:bg-success/20 *:[svg]:text-success",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "text-lg leading-snug font-medium group-has-[>svg]/alert:col-start-2",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-base text-pretty group-has-[>svg]/alert:col-start-2 [&_p:not(:last-child)]:mb-3",
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
