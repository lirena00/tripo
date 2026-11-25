"use client";

import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export interface ItemRect {
  height: number;
  left: number;
  top: number;
  width: number;
}

interface UseProximityHoverOptions {
  axis?: "x" | "y";
}

interface UseProximityHoverReturn {
  activeIndex: number | null;
  handlers: {
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
  };
  itemRects: ItemRect[];
  measureItems: () => void;
  registerItem: (index: number, element: HTMLElement | null) => void;
  sessionRef: RefObject<number>;
  setActiveIndex: Dispatch<SetStateAction<number | null>>;
}

function axisGeometry(container: HTMLElement, axis: "x" | "y") {
  const bounds = container.getBoundingClientRect();
  const horizontal = axis === "x";
  const layoutSize = horizontal
    ? container.offsetWidth
    : container.offsetHeight;
  const visualSize = horizontal ? bounds.width : bounds.height;
  return {
    edge: horizontal ? bounds.left : bounds.top,
    offset: horizontal
      ? container.clientLeft - container.scrollLeft
      : container.clientTop - container.scrollTop,
    scale: layoutSize > 0 ? visualSize / layoutSize : 1,
  };
}

function findClosestItem(
  container: HTMLElement,
  axis: "x" | "y",
  rects: ItemRect[],
  pointer: number
): number | null {
  const { edge, offset, scale } = axisGeometry(container, axis);
  let closest: number | null = null;
  let containing: number | null = null;
  let distance = Number.POSITIVE_INFINITY;
  for (const [index, rect] of rects.entries()) {
    if (!rect) {
      continue;
    }
    const start =
      edge + (offset + (axis === "x" ? rect.left : rect.top)) * scale;
    const size = (axis === "x" ? rect.width : rect.height) * scale;
    if (pointer >= start && pointer <= start + size) {
      containing = index;
    }
    const delta = Math.abs(pointer - start - size / 2);
    if (delta < distance) {
      distance = delta;
      closest = index;
    }
  }
  return containing ?? closest;
}

export function useProximityHover<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  options: UseProximityHoverOptions = {}
): UseProximityHoverReturn {
  const { axis = "y" } = options;
  const itemsRef = useRef(new Map<number, HTMLElement>());
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [itemRects, setItemRects] = useState<ItemRect[]>([]);
  const itemRectsRef = useRef<ItemRect[]>([]);
  const sessionRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);
  const remeasureRafIdRef = useRef<number | null>(null);

  const measureItems = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const rects: ItemRect[] = [];
    for (const [index, element] of itemsRef.current) {
      // Use offset* instead of getBoundingClientRect so measurements are
      // unaffected by CSS transforms (e.g. scaleY animation on the parent
      // motion.div). offsetTop/offsetLeft are layout values relative to the
      // offsetParent (the scroll container), matching the coordinate space
      // used by `position: absolute` children.
      rects[index] = {
        top: element.offsetTop,
        height: element.offsetHeight,
        left: element.offsetLeft,
        width: element.offsetWidth,
      };
    }
    itemRectsRef.current = rects;
    setItemRects(rects);
  }, [containerRef]);

  const registerItem = useCallback(
    (index: number, element: HTMLElement | null) => {
      if (element) {
        itemsRef.current.set(index, element);
      } else {
        itemsRef.current.delete(index);
      }
      // Coalesce rapid register/unregister calls (e.g. when an AnimatePresence
      // remounts a list of rows) into a single remeasure on the next frame,
      // so consumers don't have to manually call measureItems after the
      // container's children swap.
      if (remeasureRafIdRef.current !== null) {
        cancelAnimationFrame(remeasureRafIdRef.current);
      }
      remeasureRafIdRef.current = requestAnimationFrame(() => {
        remeasureRafIdRef.current = null;
        measureItems();
      });
    },
    [measureItems]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }

      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        const container = containerRef.current;
        if (!container) {
          return;
        }

        setActiveIndex(
          findClosestItem(
            container,
            axis,
            itemRectsRef.current,
            axis === "x" ? mouseX : mouseY
          )
        );
      });
    },
    [axis, containerRef]
  );

  const handleMouseEnter = useCallback(() => {
    sessionRef.current += 1;
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    setActiveIndex(null);
  }, []);

  // Clean up rAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (remeasureRafIdRef.current !== null) {
        cancelAnimationFrame(remeasureRafIdRef.current);
      }
    };
  }, []);

  return {
    activeIndex,
    setActiveIndex,
    itemRects,
    sessionRef,
    handlers: {
      onMouseMove: handleMouseMove,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    },
    registerItem,
    measureItems,
  };
}

/**
 * Hook for child items to register themselves with the proximity hover system.
 * Call in useEffect with the item's ref and index.
 */
export function useRegisterProximityItem(
  registerItem: (index: number, element: HTMLElement | null) => void,
  index: number,
  ref: RefObject<HTMLElement | null>
) {
  useEffect(() => {
    registerItem(index, ref.current);
    return () => registerItem(index, null);
  }, [index, registerItem, ref]);
}
