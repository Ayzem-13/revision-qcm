import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import { cn } from "@/lib/utils"

const cardVariants = cva(
  "group/card relative isolate flex flex-col gap-(--card-spacing) overflow-hidden rounded-3xl py-(--card-spacing) text-base",
  {
    variants: {
      tone: {
        default: "bg-card text-card-foreground",
        popover: "bg-popover text-popover-foreground",
        muted: "bg-muted text-foreground",
        primary: "bg-primary/15 text-foreground dark:bg-primary/20",
        tertiary: "bg-tertiary/15 text-foreground dark:bg-tertiary/20",
        success: "bg-success/15 text-foreground dark:bg-success/20",
      },
      size: {
        default:
          "[--card-spacing:--spacing(5)] sm:[--card-spacing:--spacing(6)]",
        sm: "[--card-spacing:--spacing(4)]",
        lg: "rounded-4xl [--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]",
      },
      interactive: {
        true: "transition-[border-radius] duration-300 ease-emphasized outline-none after:pointer-events-none after:absolute after:inset-0 after:-z-10 after:rounded-[inherit] after:bg-foreground after:opacity-0 after:transition-opacity after:duration-200 hover:rounded-2xl hover:after:opacity-6 focus-visible:ring-3 focus-visible:ring-ring/50 active:rounded-xl active:after:opacity-10",
        false: "",
      },
    },
    defaultVariants: {
      tone: "default",
      size: "default",
      interactive: false,
    },
  }
)

function Card({
  className,
  tone = "default",
  size = "default",
  interactive = false,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof cardVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "div"

  return (
    <Comp
      data-slot="card"
      data-tone={tone}
      data-size={size}
      className={cn(cardVariants({ tone, size, interactive }), className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "grid auto-rows-min items-start gap-1 px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="card-title"
      className={cn("text-xl leading-snug font-medium", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-(--card-spacing)", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  cardVariants,
}
