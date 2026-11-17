import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const stackedBarVariants = cva("flex w-full gap-0.5", {
  variants: {
    size: {
      default: "h-1.5",
      lg: "h-3",
    },
  },
  defaultVariants: { size: "default" },
})

const toneVariants = cva("rounded-full", {
  variants: {
    tone: {
      "chart-1": "bg-chart-1",
      "chart-2": "bg-chart-2",
      "chart-3": "bg-chart-3",
      "chart-4": "bg-chart-4",
      "chart-5": "bg-chart-5",
    },
  },
})

type StackedBarTone = NonNullable<VariantProps<typeof toneVariants>["tone"]>

type StackedBarSegment = {
  readonly key: string
  readonly value: number
  readonly tone: StackedBarTone
}

function StackedBar({
  segments,
  size,
  className,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof stackedBarVariants> & {
    segments: readonly StackedBarSegment[]
  }) {
  return (
    <span
      data-slot="stacked-bar"
      className={cn(stackedBarVariants({ size }), className)}
      {...props}
    >
      {segments
        .filter((segment) => segment.value > 0)
        .map((segment) => (
          <span
            key={segment.key}
            data-slot="stacked-bar-segment"
            style={{ "--share": segment.value }}
            className={cn(
              toneVariants({ tone: segment.tone }),
              "h-full min-w-1 grow-(--share) transition-[flex-grow] duration-700 ease-emphasized"
            )}
          />
        ))}
    </span>
  )
}

function StackedBarLegend({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="stacked-bar-legend"
      className={cn(
        "flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function StackedBarLegendItem({
  tone,
  className,
  children,
  ...props
}: React.ComponentProps<"li"> & { tone: StackedBarTone }) {
  return (
    <li
      data-slot="stacked-bar-legend-item"
      className={cn("flex items-center gap-1.5", className)}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(toneVariants({ tone }), "size-2.5 shrink-0")}
      />
      {children}
    </li>
  )
}

export {
  StackedBar,
  StackedBarLegend,
  StackedBarLegendItem,
  type StackedBarTone,
}
