import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Checkbox, CheckboxGroup } from "@ui-sdk/react/checkbox"
import { Radio, RadioGroup } from "@ui-sdk/react/radio"
import { cn } from "@/lib/utils"

type Selection = "single" | "multiple"

type ChoiceSize = "default" | "lg"

type ChoiceTone = "default" | "correct" | "wrong" | "missed" | "neutral"

const GroupContext = React.createContext<{
  selection: Selection
  size: ChoiceSize
}>({
  selection: "single",
  size: "default",
})

type ItemContextValue = {
  readonly tone: ChoiceTone
  readonly labelId: string
  readonly descriptionId: string
  readonly describe: (described: boolean) => void
}

const ItemContext = React.createContext<ItemContextValue | null>(null)

function useItem(part: string): ItemContextValue {
  const item = React.use(ItemContext)
  if (item === null) throw new Error(`${part} doit être placé dans un Choice`)
  return item
}

type ChoiceGroupProps<T extends string> = Omit<
  React.ComponentProps<"div">,
  "defaultValue" | "onChange" | "onSelect" | "onToggle"
> & {
  selection: Selection
  value: readonly T[]
  onToggle: (value: T) => void
  locked?: boolean
  size?: ChoiceSize
}

function ChoiceGroup<T extends string>({
  selection,
  value,
  onToggle,
  locked = false,
  size = "default",
  className,
  children,
  ...props
}: ChoiceGroupProps<T>) {
  const classes = cn("flex flex-col gap-2.5", className)
  const context = React.useMemo(() => ({ selection, size }), [selection, size])

  return (
    <GroupContext value={context}>
      {selection === "single" ? (
        <RadioGroup<T>
          data-slot="choice-group"
          value={value[0] ?? null}
          readOnly={locked}
          onValueChange={(next) => {
            if (next !== null) onToggle(next)
          }}
          className={classes}
          {...props}
        >
          {children}
        </RadioGroup>
      ) : (
        <CheckboxGroup<T>
          data-slot="choice-group"
          value={[...value]}
          readOnly={locked}
          onValueChange={(next) => {
            const flipped =
              next.find((candidate) => !value.includes(candidate)) ??
              value.find((candidate) => !next.includes(candidate))
            if (flipped !== undefined) onToggle(flipped)
          }}
          className={classes}
          {...props}
        >
          {children}
        </CheckboxGroup>
      )}
    </GroupContext>
  )
}

const choiceVariants = cva(
  "group/choice relative flex w-full items-center rounded-2xl border-2 border-transparent text-left text-base text-foreground transition-[border-radius,background-color,border-color,color] duration-300 ease-emphasized outline-none focus-visible:ring-3 focus-visible:ring-ring/50 data-readonly:cursor-default data-disabled:cursor-not-allowed data-disabled:opacity-60",
  {
    variants: {
      tone: {
        default:
          "bg-muted not-data-checked:not-data-readonly:not-data-disabled:hover:bg-accent data-checked:rounded-4xl data-checked:border-primary data-checked:bg-primary/15 dark:data-checked:bg-primary/20",
        correct: "rounded-4xl border-success bg-success/15 dark:bg-success/20",
        wrong:
          "rounded-4xl border-destructive bg-destructive/10 dark:bg-destructive/15",
        missed: "border-dashed border-success bg-success/5 dark:bg-success/10",
        neutral: "bg-card text-muted-foreground",
      },
      size: {
        default: "min-h-16 gap-4 px-4 py-2.5",
        lg: "min-h-18 gap-4 p-3 pe-4",
      },
    },
    defaultVariants: { tone: "default", size: "default" },
  }
)

type ChoiceProps = Omit<
  React.ComponentProps<"button">,
  "value" | "onSelect"
> & {
  value: string
  tone?: ChoiceTone
  disabled?: boolean
}

function Choice({ className, tone = "default", value, ...props }: ChoiceProps) {
  const group = React.use(GroupContext)
  const labelId = React.useId()
  const descriptionId = React.useId()
  const [described, describe] = React.useState(false)
  const item = React.useMemo(
    () => ({ tone, labelId, descriptionId, describe }),
    [tone, labelId, descriptionId]
  )
  const Part = group.selection === "single" ? Radio : Checkbox

  return (
    <ItemContext value={item}>
      <Part
        data-slot="choice"
        data-tone={tone}
        value={value}
        aria-labelledby={labelId}
        aria-describedby={described ? descriptionId : undefined}
        className={cn(choiceVariants({ tone, size: group.size }), className)}
        {...props}
      />
    </ItemContext>
  )
}

const choiceMarkerVariants = cva(
  "grid shrink-0 place-items-center font-mono text-sm font-semibold transition-[border-radius,background-color,color] duration-300 ease-emphasized [&_svg:not([class*='size-'])]:size-6",
  {
    variants: {
      tone: {
        default:
          "bg-background text-muted-foreground group-data-checked/choice:bg-primary group-data-checked/choice:text-primary-foreground",
        correct: "bg-success text-success-foreground",
        wrong: "bg-destructive text-destructive-foreground",
        missed: "bg-success text-success-foreground",
        neutral: "bg-muted text-muted-foreground",
      },
      shape: {
        round: "size-9 rounded-full",
        square: "size-9 rounded-md",
        tile: "size-12 rounded-xl group-data-checked/choice:rounded-3xl",
      },
    },
    defaultVariants: { tone: "default", shape: "round" },
  }
)

function ChoiceMarker({ className, ...props }: React.ComponentProps<"span">) {
  const group = React.use(GroupContext)
  const { tone } = useItem("ChoiceMarker")
  const shape =
    group.size === "lg"
      ? "tile"
      : group.selection === "single"
        ? "round"
        : "square"

  return (
    <span
      data-slot="choice-marker"
      aria-hidden="true"
      className={cn(choiceMarkerVariants({ tone, shape }), className)}
      {...props}
    />
  )
}

function ChoiceContent({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="choice-content"
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-0.5 py-1 wrap-break-word",
        className
      )}
      {...props}
    />
  )
}

function ChoiceLabel({ className, ...props }: React.ComponentProps<"span">) {
  const { labelId } = useItem("ChoiceLabel")

  return (
    <span
      id={labelId}
      data-slot="choice-label"
      className={cn(
        "font-medium group-data-[tone=neutral]/choice:font-normal",
        className
      )}
      {...props}
    />
  )
}

const choiceDescriptionVariants = cva("", {
  variants: {
    display: {
      visible: "text-sm text-muted-foreground",
      hidden: "sr-only",
    },
  },
  defaultVariants: { display: "visible" },
})

function ChoiceDescription({
  className,
  display = "visible",
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof choiceDescriptionVariants>) {
  const { descriptionId, describe } = useItem("ChoiceDescription")

  React.useLayoutEffect(() => {
    describe(true)
    return () => describe(false)
  }, [describe])

  return (
    <span
      id={descriptionId}
      data-slot="choice-description"
      className={cn(choiceDescriptionVariants({ display }), className)}
      {...props}
    />
  )
}

const choiceIndicatorVariants = cva(
  "grid size-6 shrink-0 place-items-center *:size-6 *:scale-50 *:opacity-0 *:transition-[opacity,scale] *:duration-300 *:ease-emphasized",
  {
    variants: {
      tone: {
        default:
          "text-primary group-data-checked/choice:*:scale-100 group-data-checked/choice:*:opacity-100",
        correct:
          "text-success *:scale-100 *:animate-in *:opacity-100 *:duration-300 *:fade-in-0 *:zoom-in-50",
        wrong:
          "text-destructive *:scale-100 *:animate-in *:opacity-100 *:duration-300 *:fade-in-0 *:zoom-in-50",
        missed:
          "text-success *:scale-100 *:animate-in *:opacity-100 *:duration-300 *:fade-in-0 *:zoom-in-50",
        neutral: "text-muted-foreground",
      },
    },
    defaultVariants: { tone: "default" },
  }
)

function ChoiceIndicator({
  className,
  ...props
}: React.ComponentProps<"span">) {
  const { tone } = useItem("ChoiceIndicator")

  return (
    <span
      data-slot="choice-indicator"
      aria-hidden="true"
      className={cn(choiceIndicatorVariants({ tone }), className)}
      {...props}
    />
  )
}

export {
  ChoiceGroup,
  Choice,
  ChoiceMarker,
  ChoiceContent,
  ChoiceLabel,
  ChoiceDescription,
  ChoiceIndicator,
  choiceVariants,
  choiceMarkerVariants,
  choiceIndicatorVariants,
}
