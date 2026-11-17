import * as React from "react"
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotionConfig,
  useSpring,
  type Variants,
} from "motion/react"
import {
  STAGGER_CAP,
  springs,
  stagger,
  type SpringName,
} from "@/components/ui/motion-tokens"
import { cn } from "@/lib/utils"

function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={springs.spatial}>
      {children}
    </MotionConfig>
  )
}

const screenVariants: Variants = {
  enter: (direction: number) => ({ opacity: 0, y: 24 * direction }),
  center: {
    opacity: 1,
    y: 0,
    transition: { y: springs.spatial, opacity: springs.effect },
  },
  exit: (direction: number) => ({
    opacity: 0,
    y: -12 * direction,
    transition: springs.effectFast,
  }),
}

function ScreenTransition({
  screenKey,
  fill = false,
  children,
}: {
  screenKey: string
  fill?: boolean
  children: React.ReactNode
}) {
  const [history, setHistory] = React.useState<readonly string[]>([screenKey])
  const [direction, setDirection] = React.useState(1)

  if (history[history.length - 1] !== screenKey) {
    const back = history[history.length - 2] === screenKey
    setDirection(back ? -1 : 1)
    setHistory(back ? history.slice(0, -1) : [...history.slice(-8), screenKey])
  }

  return (
    <AnimatePresence
      mode="wait"
      custom={direction}
      onExitComplete={() => window.scrollTo({ top: 0 })}
    >
      <motion.div
        key={screenKey}
        data-slot="screen-transition"
        className={cn(fill && "flex min-h-0 flex-1 flex-col")}
        custom={direction}
        variants={screenVariants}
        initial="enter"
        animate="center"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

const StaggerSlot = React.createContext<{ index: number; step: number } | null>(
  null
)

function Reveal({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  const slot = React.use(StaggerSlot)
  const delay =
    slot === null ? 0 : Math.min(slot.index, STAGGER_CAP) * slot.step

  return (
    <motion.div
      data-slot="reveal"
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        y: { ...springs.spatial, delay },
        opacity: { ...springs.effect, delay },
      }}
    >
      {children}
    </motion.div>
  )
}

function Stagger({
  step,
  className,
  children,
}: {
  step: keyof typeof stagger
  className?: string
  children: React.ReactNode
}) {
  return (
    <div data-slot="stagger" className={className}>
      {React.Children.toArray(children).map((child, index) => (
        <StaggerSlot
          key={
            React.isValidElement(child) && child.key !== null
              ? child.key
              : index
          }
          value={{ index, step: stagger[step] }}
        >
          {child}
        </StaggerSlot>
      ))}
    </div>
  )
}

const formatters = {
  0: new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }),
  1: new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }),
} as const

function AnimatedNumber({
  value,
  fractionDigits = 0,
  spring = "spatialSlow",
}: {
  value: number
  fractionDigits?: 0 | 1
  spring?: SpringName
}) {
  const format = formatters[fractionDigits]
  const reduced = useReducedMotionConfig() === true
  const source = useMotionValue(reduced ? value : 0)
  const sprung = useSpring(source, springs[spring])
  const text = React.useRef<HTMLSpanElement>(null)

  React.useEffect(() => {
    if (reduced) {
      source.jump(value)
      sprung.jump(value)
    } else {
      source.set(value)
    }
  }, [value, reduced, source, sprung])

  useMotionValueEvent(sprung, "change", (latest) => {
    if (text.current !== null) text.current.textContent = format.format(latest)
  })

  return (
    <span data-slot="animated-number" className="tabular-nums">
      <span ref={text} aria-hidden="true">
        {format.format(reduced ? value : 0)}
      </span>
      <span className="sr-only">{format.format(value)}</span>
    </span>
  )
}

export { AnimatedNumber, MotionProvider, Reveal, ScreenTransition, Stagger }
