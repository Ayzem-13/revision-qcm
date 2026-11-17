export type SpringTransition = {
  readonly type: "spring"
  readonly stiffness: number
  readonly damping: number
  readonly mass: number
}

function spring(stiffness: number, dampingRatio: number): SpringTransition {
  return {
    type: "spring",
    stiffness,
    damping: 2 * dampingRatio * Math.sqrt(stiffness),
    mass: 1,
  }
}

export const springs = {
  spatial: spring(380, 0.8),
  spatialSlow: spring(200, 0.8),
  effectFast: spring(3800, 1),
  effect: spring(1600, 1),
} as const

export type SpringName = keyof typeof springs

export const stagger = { list: 0.04, choices: 0.05 } as const

export const STAGGER_CAP = 8
