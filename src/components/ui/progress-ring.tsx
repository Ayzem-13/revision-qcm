import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { motion } from "motion/react"
import { springs } from "@/components/ui/motion-tokens"
import { cn } from "@/lib/utils"

const GEOMETRY = {
  default: { box: 160, thickness: 12, waves: 9, amplitude: 3 },
  lg: { box: 208, thickness: 14, waves: 11, amplitude: 3.5 },
} as const

const progressRingVariants = cva(
  "relative inline-grid shrink-0 place-items-center",
  {
    variants: {
      size: {
        default: "size-40",
        lg: "size-52",
      },
    },
    defaultVariants: { size: "default" },
  }
)

function wavyCircle(
  center: number,
  radius: number,
  waves: number,
  amplitude: number
): string {
  const steps = 360
  const points: string[] = []
  for (let step = 0; step <= steps; step++) {
    const angle = (step / steps) * Math.PI * 2
    const r = radius + amplitude * Math.sin(waves * angle)
    const x = center + r * Math.sin(angle)
    const y = center - r * Math.cos(angle)
    points.push(`${step === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`)
  }
  return points.join(" ")
}

function ProgressRing({
  value,
  size = "default",
  className,
  children,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof progressRingVariants> & {
    value: number
  }) {
  const geometry = GEOMETRY[size ?? "default"]
  const ratio = Math.min(1, Math.max(0, value))
  const center = geometry.box / 2
  const radius = center - geometry.thickness / 2 - geometry.amplitude
  const amplitude = ratio >= 1 ? 0 : geometry.amplitude

  return (
    <div
      data-slot="progress-ring"
      className={cn(progressRingVariants({ size }), className)}
      {...props}
    >
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${geometry.box} ${geometry.box}`}
        className="absolute inset-0 size-full overflow-visible"
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={geometry.thickness * 0.6}
          className="stroke-secondary"
        />
        <motion.path
          d={wavyCircle(center, radius, geometry.waves, amplitude)}
          fill="none"
          strokeWidth={geometry.thickness}
          strokeLinecap="round"
          className="stroke-primary"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: ratio, opacity: ratio > 0 ? 1 : 0 }}
          transition={{
            pathLength: springs.spatialSlow,
            opacity: springs.effect,
          }}
        />
      </svg>
      <div className="relative grid place-items-center text-center">
        {children}
      </div>
    </div>
  )
}

export { ProgressRing }
