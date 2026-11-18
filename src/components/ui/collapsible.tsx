import * as React from "react"
import {
  Collapsible as CollapsiblePrimitive,
  CollapsiblePanel as CollapsiblePanelPrimitive,
  CollapsibleTrigger as CollapsibleTriggerPrimitive,
} from "@ui-sdk/react/collapsible"
import { ChevronDownIcon } from "lucide-react"
import { cn } from "@/lib/utils"

function Collapsible({
  className,
  ...props
}: Omit<React.ComponentProps<typeof CollapsiblePrimitive>, "className"> & {
  className?: string
}) {
  return (
    <CollapsiblePrimitive
      data-slot="collapsible"
      className={cn("flex flex-col", className)}
      {...props}
    />
  )
}

function CollapsibleTrigger({
  className,
  ...props
}: Omit<
  React.ComponentProps<typeof CollapsibleTriggerPrimitive>,
  "className" | "children"
> & {
  className?: string
}) {
  return (
    <CollapsibleTriggerPrimitive
      data-slot="collapsible-trigger"
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground transition-[background-color,color] duration-200 ease-emphasized outline-none hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-5",
        className
      )}
      {...props}
    >
      <ChevronDownIcon
        aria-hidden="true"
        className="rotate-180 transition-transform duration-300 ease-emphasized in-data-closed:rotate-0"
      />
    </CollapsibleTriggerPrimitive>
  )
}

function CollapsiblePanel({
  className,
  ...props
}: Omit<React.ComponentProps<typeof CollapsiblePanelPrimitive>, "className"> & {
  className?: string
}) {
  return (
    <CollapsiblePanelPrimitive
      data-slot="collapsible-panel"
      className={cn(
        "h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-300 ease-emphasized data-ending-style:h-0 data-starting-style:h-0",
        className
      )}
      {...props}
    />
  )
}

export { Collapsible, CollapsiblePanel, CollapsibleTrigger }
