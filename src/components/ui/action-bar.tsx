import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@ui-sdk/react/collapsible"
import { ChevronDownIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const actionBarVariants = cva(
  "z-20 flex flex-col border-t bg-popover/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] text-popover-foreground backdrop-blur-md",
  {
    variants: {
      placement: {
        sticky:
          "sticky bottom-0 -mx-4 sm:-mx-6 sm:px-6 md:bottom-4 md:mx-0 md:mb-4 md:rounded-4xl md:border md:px-3 md:py-2 md:shadow-lg",
        fixed: "fixed inset-x-0 bottom-0",
      },
    },
    defaultVariants: { placement: "sticky" },
  }
)

function ActionBar({
  placement,
  open = false,
  onOpenChange,
  className,
  children,
  ...props
}: VariantProps<typeof actionBarVariants> & {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
  children: React.ReactNode
  "data-testid"?: string
}) {
  return (
    <Collapsible
      data-slot="action-bar"
      open={open}
      onOpenChange={(next) => onOpenChange?.(next)}
      className={cn(actionBarVariants({ placement }), className)}
      {...props}
    >
      {children}
    </Collapsible>
  )
}

function ActionBarRow({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="action-bar-row"
      className={cn(
        "mx-auto flex min-h-14 w-full max-w-6xl items-center gap-3",
        className
      )}
      {...props}
    />
  )
}

function ActionBarStatus({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="action-bar-status"
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2 text-sm text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function ActionBarPrimary({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="action-bar-primary"
      className={cn(
        "flex w-40 shrink-0 justify-end min-[400px]:w-48 sm:w-56 [&>[data-slot=button]]:w-full",
        className
      )}
      {...props}
    />
  )
}

const actionBarPanelVariants = cva(
  "absolute inset-x-2 bottom-full mb-2 h-(--collapsible-panel-height) max-h-[min(50dvh,26rem)] overflow-y-auto overscroll-contain rounded-3xl bg-popover text-base text-popover-foreground shadow-xl transition-[height,opacity] duration-300 ease-emphasized data-ending-style:h-0 data-ending-style:opacity-0 data-starting-style:h-0 data-starting-style:opacity-0 md:inset-x-0",
  {
    variants: {
      tone: {
        neutral: "*:data-[slot=action-bar-panel-body]:bg-transparent",
        success:
          "*:data-[slot=action-bar-panel-body]:bg-success/15 dark:*:data-[slot=action-bar-panel-body]:bg-success/20",
        destructive:
          "*:data-[slot=action-bar-panel-body]:bg-destructive/10 dark:*:data-[slot=action-bar-panel-body]:bg-destructive/15",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
)

function ActionBarPanel({
  tone,
  className,
  children,
  ...props
}: VariantProps<typeof actionBarPanelVariants> & {
  className?: string
  children: React.ReactNode
} & Pick<React.ComponentProps<"div">, "aria-label" | "aria-labelledby">) {
  return (
    <CollapsiblePanel
      data-slot="action-bar-panel"
      role="region"
      className={cn(actionBarPanelVariants({ tone }), className)}
      {...props}
    >
      <div
        data-slot="action-bar-panel-body"
        className="flex min-h-full flex-col gap-2 p-5"
      >
        {children}
      </div>
    </CollapsiblePanel>
  )
}

function ActionBarPanelTrigger({
  className,
  children,
  ...props
}: Omit<
  React.ComponentProps<typeof CollapsibleTrigger>,
  "className" | "children"
> & {
  className?: string
  children: React.ReactNode
}) {
  return (
    <CollapsibleTrigger
      data-slot="action-bar-panel-trigger"
      className={cn(
        "inline-flex h-11 min-w-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-foreground transition-[background-color,border-radius] duration-300 ease-emphasized outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 active:rounded-md [&_svg]:size-5 [&_svg]:shrink-0",
        className
      )}
      {...props}
    >
      {children}
      <ChevronDownIcon
        aria-hidden="true"
        className="transition-transform duration-300 ease-emphasized in-data-closed:rotate-180"
      />
    </CollapsibleTrigger>
  )
}

export {
  ActionBar,
  ActionBarPanel,
  ActionBarPanelTrigger,
  ActionBarPrimary,
  ActionBarRow,
  ActionBarStatus,
  actionBarPanelVariants,
}
