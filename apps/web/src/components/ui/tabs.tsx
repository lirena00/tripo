// Adapted from Hiokipi: identical tab geometry, proximity indicators, and springs.
"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Children,
  type ComponentPropsWithoutRef,
  cloneElement,
  createContext,
  isValidElement,
  type Ref,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useProximityHover } from "@/hooks/use-proximity-hover";
import {
  spring as animatedSpring,
  assignRef,
  fontWeights,
  reducedMotionSpring,
  tabShape,
} from "@/lib/navigation-tabs";
import { cn } from "@/lib/utils";

/* ─────────────────────── Contexts ─────────────────────── */

interface TabsValueOrderContextValue {
  selectedValue: string | undefined;
  setValueOrder: (order: string[]) => void;
  valueOrder: string[];
}

const TabsValueOrderContext = createContext<TabsValueOrderContextValue | null>(
  null
);

interface TabsListContextValue {
  hoveredIndex: number | null;
  registerTab: (index: number, value: string, el: HTMLElement | null) => void;
  selectedValue: string | undefined;
  setOptimisticIdx: (index: number) => void;
}

const TabsListContext = createContext<TabsListContextValue | null>(null);

function useTabsList() {
  const ctx = useContext(TabsListContext);
  if (!ctx) {
    throw new Error("TabItem must be used within a TabsList");
  }
  return ctx;
}

/* ─────────────────────── Tabs (Root) ─────────────────────── */

interface TabsProps
  extends Omit<
    ComponentPropsWithoutRef<typeof TabsPrimitive.Root>,
    "onValueChange" | "value" | "defaultValue" | "onSelect"
  > {
  defaultValue?: string;
  onSelect?: (index: number) => void;
  onValueChange?: (value: string) => void;
  ref?: Ref<HTMLDivElement>;
  selectedIndex?: number;
  value?: string;
}

function Tabs({
  value,
  onValueChange,
  selectedIndex,
  onSelect,
  defaultValue,
  children,
  ref,
  ...props
}: TabsProps) {
  const [valueOrder, setValueOrder] = useState<string[]>([]);
  const [uncontrolledValue, setUncontrolledValue] = useState<
    string | undefined
  >(defaultValue);
  const updateValueOrder = useCallback((order: string[]) => {
    setValueOrder((current) => {
      if (
        current.length === order.length &&
        current.every((v, i) => v === order[i])
      ) {
        return current;
      }
      return order;
    });
  }, []);

  const resolvedValue =
    value ??
    (selectedIndex == null ? uncontrolledValue : valueOrder[selectedIndex]);

  // Base UI passes (value, eventDetails); we only need value.
  const handleValueChange = useCallback(
    (newValue: unknown) => {
      if (typeof newValue !== "string") {
        return;
      }
      const v = newValue;
      if (value === undefined && selectedIndex == null) {
        setUncontrolledValue(v);
      }
      onValueChange?.(v);
      if (onSelect) {
        const idx = valueOrder.indexOf(v);
        if (idx !== -1) {
          onSelect(idx);
        }
      }
    },
    [onValueChange, onSelect, valueOrder, value, selectedIndex]
  );

  return (
    <TabsValueOrderContext.Provider
      value={{
        valueOrder,
        setValueOrder: updateValueOrder,
        selectedValue: resolvedValue,
      }}
    >
      <TabsPrimitive.Root
        defaultValue={resolvedValue == null ? defaultValue : undefined}
        onValueChange={handleValueChange}
        ref={ref}
        value={resolvedValue}
        {...props}
      >
        {children}
      </TabsPrimitive.Root>
    </TabsValueOrderContext.Provider>
  );
}

/* ─────────────────────── TabsList ─────────────────────── */

type TabsListProps = ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
  ref?: Ref<HTMLDivElement>;
};

function TabsList({ children, className, ref, ...props }: TabsListProps) {
  const shouldReduceMotion = useReducedMotion();
  const [keyboardNavigation, setKeyboardNavigation] = useState(false);
  const spring =
    shouldReduceMotion || keyboardNavigation
      ? reducedMotionSpring
      : animatedSpring;
  const containerRef = useRef<HTMLDivElement>(null);
  const isMouseInside = useRef(false);
  const shape = tabShape;
  const valueOrderCtx = useContext(TabsValueOrderContext);
  const [optimisticIdx, setOptimisticIdx] = useState<number | null>(null);

  const values = useMemo(
    () =>
      Children.toArray(children)
        .filter(isValidElement)
        .map((child) => (child.props as { value?: string }).value)
        .filter((v): v is string => typeof v === "string"),
    [children]
  );
  const setValueOrder = valueOrderCtx?.setValueOrder;

  useLayoutEffect(() => {
    setValueOrder?.(values);
  }, [setValueOrder, values]);

  const {
    activeIndex: hoveredIndex,
    setActiveIndex: setHoveredIndex,
    itemRects,
    handlers,
    registerItem,
    measureItems,
  } = useProximityHover(containerRef, { axis: "x" });

  const registerTab = useCallback(
    (index: number, _value: string, el: HTMLElement | null) => {
      registerItem(index, el);
    },
    [registerItem]
  );

  useEffect(() => {
    if (Children.count(children) > 0) {
      measureItems();
    }
  }, [measureItems, children]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    const ro = new ResizeObserver(() => measureItems());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measureItems]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      setKeyboardNavigation(false);
      isMouseInside.current = true;
      handlers.onMouseMove(e);
    },
    [handlers]
  );

  const handleMouseLeave = useCallback(() => {
    isMouseInside.current = false;
    handlers.onMouseLeave();
  }, [handlers]);

  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const selectedValue = valueOrderCtx?.selectedValue;
  const selectedIdx =
    selectedValue === undefined ? -1 : values.indexOf(selectedValue);

  useEffect(() => {
    setOptimisticIdx(selectedIdx >= 0 ? selectedIdx : null);
  }, [selectedIdx]);

  const activeSelectedIdx = optimisticIdx;
  const selectedRect =
    activeSelectedIdx === null ? null : itemRects[activeSelectedIdx];
  const hoverRect = hoveredIndex === null ? null : itemRects[hoveredIndex];
  const focusRect = focusedIndex === null ? null : itemRects[focusedIndex];
  const isHoveringSelected = hoveredIndex === activeSelectedIdx;
  const isHovering = hoveredIndex !== null && !isHoveringSelected;

  const indexedChildren = Children.map(children, (child, i) => {
    if (isValidElement(child)) {
      return cloneElement(child, { _index: i } as Record<string, unknown>);
    }
    return child;
  });

  return (
    <TabsListContext.Provider
      value={{
        registerTab,
        hoveredIndex,
        selectedValue,
        setOptimisticIdx,
      }}
    >
      <TabsPrimitive.List
        // Match Radix's `activationMode="automatic"` — arrow keys move + activate.
        activateOnFocus
        className={cn(
          "relative inline-flex select-none items-center gap-0.5 bg-muted p-1",
          shape.container,
          className
        )}
        onBlur={(e) => {
          if (containerRef.current?.contains(e.relatedTarget as Node)) {
            return;
          }
          setFocusedIndex(null);
          if (isMouseInside.current) {
            return;
          }
          setHoveredIndex(null);
        }}
        onFocus={(e) => {
          const trigger = (e.target as HTMLElement).closest('[role="tab"]');
          if (!trigger) {
            return;
          }
          const indexAttr = trigger.getAttribute("data-proximity-index");
          if (indexAttr != null) {
            const idx = Number(indexAttr);
            setHoveredIndex(idx);
            setFocusedIndex(
              (e.target as HTMLElement).matches(":focus-visible") ? idx : null
            );
          }
        }}
        onKeyDown={() => setKeyboardNavigation(true)}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
        onPointerDown={() => setKeyboardNavigation(false)}
        ref={(node) => {
          containerRef.current = node;
          assignRef(ref, node);
        }}
        {...props}
      >
        {/* Active segment indicator */}
        {selectedRect && (
          <motion.div
            animate={{
              left: selectedRect.left,
              width: selectedRect.width,
              top: selectedRect.top,
              height: selectedRect.height,
              opacity: isHovering ? 0.85 : 1,
            }}
            className={cn(
              "pointer-events-none absolute",
              "bg-accent/40 shadow-accent/40",
              shape.bg
            )}
            initial={false}
            transition={{
              ...spring.moderate,
              opacity: { duration: 0.08 },
            }}
          />
        )}

        {/* Hover indicator */}
        <AnimatePresence>
          {hoverRect && !isHoveringSelected && selectedRect && (
            <motion.div
              animate={{
                left: hoverRect.left,
                width: hoverRect.width,
                top: hoverRect.top,
                height: hoverRect.height,
                opacity: 0.4,
              }}
              className={cn(
                "pointer-events-none absolute bg-primary/50",
                shape.bg
              )}
              exit={
                !isMouseInside.current && selectedRect
                  ? {
                      left: selectedRect.left,
                      width: selectedRect.width,
                      top: selectedRect.top,
                      height: selectedRect.height,
                      opacity: 0,
                      transition: {
                        ...spring.moderate,
                        opacity: { duration: 0.06 },
                      },
                    }
                  : { opacity: 0, transition: spring.fast.exit }
              }
              initial={{
                left: selectedRect.left,
                width: selectedRect.width,
                top: selectedRect.top,
                height: selectedRect.height,
                opacity: 0,
              }}
              transition={{
                ...spring.fast,
                opacity: { duration: 0.08 },
              }}
            />
          )}
        </AnimatePresence>

        {/* Focus ring */}
        <AnimatePresence>
          {focusRect && (
            <motion.div
              animate={{
                left: focusRect.left - 2,
                top: focusRect.top - 2,
                width: focusRect.width + 4,
                height: focusRect.height + 4,
              }}
              className={cn(
                "pointer-events-none absolute z-20 border border-ring",
                shape.focusRing
              )}
              exit={{ opacity: 0, transition: spring.fast.exit }}
              initial={false}
              transition={{
                ...spring.fast,
                opacity: { duration: 0.08 },
              }}
            />
          )}
        </AnimatePresence>

        {indexedChildren}
      </TabsPrimitive.List>
    </TabsListContext.Provider>
  );
}

/* ─────────────────────── TabItem ─────────────────────── */

interface TabItemProps
  extends ComponentPropsWithoutRef<typeof TabsPrimitive.Tab> {
  _index?: number;
  icon?: LucideIcon;
  label: string;
  /** @internal Auto-assigned by TabsList. */
  ref?: Ref<HTMLButtonElement>;
  value: string;
}

function TabItem({
  value,
  icon: Icon,
  label,
  _index = 0,
  className,
  ref,
  ...props
}: TabItemProps) {
  const internalRef = useRef<HTMLElement>(null);
  const { registerTab, hoveredIndex, selectedValue, setOptimisticIdx } =
    useTabsList();

  useEffect(() => {
    registerTab(_index, value, internalRef.current);
    return () => registerTab(_index, value, null);
  }, [_index, value, registerTab]);

  const isSelected = selectedValue === value;
  const isActive = hoveredIndex === _index || isSelected;

  return (
    <TabsPrimitive.Tab
      className={cn(
        "relative z-10 flex cursor-pointer items-center gap-2 rounded-full border-none bg-transparent px-3 py-1.5 outline-none",
        className
      )}
      data-proximity-index={_index}
      onClick={() => setOptimisticIdx(_index)}
      ref={(node) => {
        internalRef.current = node;
        assignRef(ref, node instanceof HTMLButtonElement ? node : null);
      }}
      value={value}
      {...props}
    >
      {Icon && (
        <Icon
          aria-hidden="true"
          className={cn(
            "transition-[color,stroke-width] duration-80",
            isActive ? "text-foreground" : "text-muted-foreground"
          )}
          size={16}
          strokeWidth={isActive ? 2 : 1.5}
        />
      )}
      <span className="inline-grid whitespace-nowrap text-[13px]">
        <span
          aria-hidden="true"
          className="invisible col-start-1 row-start-1"
          style={{ fontVariationSettings: fontWeights.semibold }}
        >
          {label}
        </span>
        <span
          className={cn(
            "col-start-1 row-start-1 transition-[color,font-variation-settings] duration-80",
            isActive ? "text-foreground" : "text-muted-foreground"
          )}
          style={{
            fontVariationSettings: isSelected
              ? fontWeights.semibold
              : fontWeights.normal,
          }}
        >
          {label}
        </span>
      </span>
    </TabsPrimitive.Tab>
  );
}

/* ─────────────────────── TabPanel ─────────────────────── */

interface TabPanelProps
  extends ComponentPropsWithoutRef<typeof TabsPrimitive.Panel> {
  ref?: Ref<HTMLDivElement>;
  value: string;
}

function TabPanel({ className, ref, ...props }: TabPanelProps) {
  return (
    <TabsPrimitive.Panel
      className={cn("outline-none", className)}
      ref={ref}
      {...props}
    />
  );
}

export type { TabItemProps, TabPanelProps, TabsListProps, TabsProps };
export { TabItem, TabPanel, Tabs, TabsList };
