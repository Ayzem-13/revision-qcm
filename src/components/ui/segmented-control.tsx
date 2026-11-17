import * as React from "react"
import {
  SegmentedControl as SegmentedControlPrimitive,
  SegmentedControlIndicator,
  SegmentedControlItem as SegmentedControlItemPrimitive,
} from "@ui-sdk/react/segmented-control"
import { CheckIcon } from "lucide-react"
import { cn } from "@/lib/utils"

function SegmentedControl<T extends string>({
  value,
  onValueChange,
  className,
  children,
  ...props
}: Omit<
  React.ComponentProps<"div">,
  "defaultValue" | "onChange" | "onSelect"
> & {
  value: T
  onValueChange: (value: T) => void
}) {
  return (
    <SegmentedControlPrimitive<T>
      data-slot="segmented-control"
      value={value}
      onValueChange={(next) => {
        if (next !== null) onValueChange(next)
      }}
      className={cn(
        "relative isolate flex w-full gap-1 rounded-2xl bg-muted p-1",
        className
      )}
      {...props}
    >
      <SegmentedControlIndicator
        data-slot="segmented-control-indicator"
        className="absolute top-(--segmented-control-indicator-top) left-(--segmented-control-indicator-left) -z-10 h-(--segmented-control-indicator-height) w-(--segmented-control-indicator-width) rounded-xl bg-secondary shadow-sm transition-[left,width] duration-300 ease-emphasized"
      />
      {children}
    </SegmentedControlPrimitive>
  )
}

function SegmentedControlItem({
  className,
  children,
  ...props
}: Omit<
  React.ComponentProps<typeof SegmentedControlItemPrimitive>,
  "className" | "children"
> & {
  className?: string
  children: React.ReactNode
}) {
  return (
    <SegmentedControlItemPrimitive
      data-slot="segmented-control-item"
      className={cn(
        "flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-semibold whitespace-nowrap text-muted-foreground tabular-nums transition-colors duration-200 ease-emphasized outline-none not-data-checked:not-data-disabled:hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-checked:text-secondary-foreground data-disabled:cursor-not-allowed data-disabled:opacity-40",
        className
      )}
      {...props}
    >
      <CheckIcon
        aria-hidden="true"
        className="size-4 shrink-0 scale-50 opacity-0 transition-[opacity,scale] duration-200 ease-emphasized in-data-checked:scale-100 in-data-checked:opacity-100"
      />
      <span className="truncate">{children}</span>
    </SegmentedControlItemPrimitive>
  )
}

export { SegmentedControl, SegmentedControlItem }
