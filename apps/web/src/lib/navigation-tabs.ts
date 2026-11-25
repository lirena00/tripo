import type { Ref } from "react";

// Hiokipi's default tab shape, typography, and motion. Colors use Capyfind tokens.
export const tabShape = {
  container: "rounded-3xl",
  bg: "rounded-[20px]",
  focusRing: "rounded-[22px]",
} as const;

export const fontWeights = {
  normal: "'wght' 400, 'opsz' 14",
  semibold: "'wght' 550, 'opsz' 20",
} as const;

export const spring = {
  fast: { type: "spring", duration: 0.08, bounce: 0, exit: { duration: 0.06 } },
  moderate: {
    type: "spring",
    duration: 0.16,
    bounce: 0.08,
    exit: { duration: 0.12 },
  },
} as const;

export const reducedMotionSpring = {
  fast: { duration: 0, exit: { duration: 0 } },
  moderate: { duration: 0, exit: { duration: 0 } },
} as const;

export function assignRef<T>(ref: Ref<T> | undefined, node: T | null): void {
  if (typeof ref === "function") {
    ref(node);
  } else if (ref) {
    ref.current = node;
  }
}
