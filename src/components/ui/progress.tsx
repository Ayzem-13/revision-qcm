import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Progress as ProgressPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

const progressVariants = cva("group/progress relative w-full", {
  variants: {
    variant: {
      default: "flex h-2 items-center overflow-hidden rounded-full bg-muted",
      wavy: "h-3",
    },
  },
  defaultVariants: { variant: "default" },
})

const progressIndicatorVariants = cva(
  "h-full w-(--progress) rounded-full transition-[width] duration-700 ease-emphasized starting:w-0",
  {
    variants: {
      tone: {
        primary: "bg-primary",
        success: "bg-success",
        destructive: "bg-destructive",
      },
    },
    defaultVariants: { tone: "primary" },
  }
)

function Progress({
  className,
  value = 0,
  max = 100,
  variant = "default",
  tone = "primary",
  ...props
}: Omit<React.ComponentProps<typeof ProgressPrimitive.Root>, "value" | "max"> &
  VariantProps<typeof progressVariants> &
  VariantProps<typeof progressIndicatorVariants> & {
    value?: number
    max?: number
  }) {
  const ratio = max <= 0 ? 0 : Math.min(1, Math.max(0, value / max))

  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      data-variant={variant}
      data-empty={ratio === 0 ? "" : undefined}
      value={value}
      max={max}
      style={{ "--progress": `${ratio * 100}%` }}
      className={cn(progressVariants({ variant }), className)}
      {...props}
    >
      {variant === "wavy" ? (
        <>
          <span
            aria-hidden="true"
            className="absolute top-1/2 right-0 left-[calc(var(--progress)+6px)] h-1 -translate-y-1/2 rounded-full bg-secondary transition-[left] duration-700 ease-emphasized group-data-empty/progress:left-0"
          />
          <span
            aria-hidden="true"
            className="absolute top-1/2 right-0 size-1 -translate-y-1/2 rounded-full bg-primary"
          />
          <ProgressPrimitive.Indicator
            data-slot="progress-indicator"
            className="absolute top-0 left-0 h-full w-(--progress) animate-wave bg-primary mask-wave transition-[width] duration-700 ease-emphasized group-data-[state=complete]/progress:top-1/2 group-data-[state=complete]/progress:h-1 group-data-[state=complete]/progress:-translate-y-1/2 group-data-[state=complete]/progress:animate-none group-data-[state=complete]/progress:rounded-sm group-data-[state=complete]/progress:mask-none"
          />
        </>
      ) : (
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className={progressIndicatorVariants({ tone })}
        />
      )}
    </ProgressPrimitive.Root>
  )
}

export { Progress }
