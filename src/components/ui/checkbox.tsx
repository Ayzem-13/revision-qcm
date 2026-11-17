import * as React from "react"
import {
  Checkbox as CheckboxPrimitive,
  CheckboxGroup as CheckboxGroupPrimitive,
  CheckboxIndicator,
} from "@ui-sdk/react/checkbox"
import { CheckIcon, MinusIcon } from "lucide-react"
import { cn } from "@/lib/utils"

function Checkbox({
  className,
  ...props
}: Omit<React.ComponentProps<typeof CheckboxPrimitive>, "className"> & {
  className?: string
}) {
  return (
    <CheckboxPrimitive
      data-slot="checkbox"
      className={cn(
        "peer relative grid size-5 shrink-0 place-items-center rounded-md border-2 border-input text-primary-foreground transition-[background-color,border-color] duration-200 ease-emphasized outline-none after:absolute after:-inset-3 focus-visible:ring-3 focus-visible:ring-ring/50 data-indeterminate:border-primary data-indeterminate:bg-primary data-checked:border-primary data-checked:bg-primary data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <CheckboxIndicator
        data-slot="checkbox-indicator"
        className="grid place-items-center transition-[opacity,scale] duration-200 ease-emphasized data-ending-style:scale-50 data-ending-style:opacity-0 data-starting-style:scale-50 data-starting-style:opacity-0 [&>svg]:size-3.5"
      >
        <CheckIcon
          aria-hidden="true"
          strokeWidth={3}
          className="in-data-indeterminate:hidden"
        />
        <MinusIcon
          aria-hidden="true"
          strokeWidth={3}
          className="hidden in-data-indeterminate:block"
        />
      </CheckboxIndicator>
    </CheckboxPrimitive>
  )
}

function CheckboxGroup<T extends string>({
  className,
  ...props
}: Omit<React.ComponentProps<typeof CheckboxGroupPrimitive<T>>, "className"> & {
  className?: string
}) {
  return (
    <CheckboxGroupPrimitive<T>
      data-slot="checkbox-group"
      className={cn("flex flex-col", className)}
      {...props}
    />
  )
}

export { Checkbox, CheckboxGroup }
