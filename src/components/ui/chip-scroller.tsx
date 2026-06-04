import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  gap?: string;
  edgePadding?: string;
  activeIndex?: number;
  snap?: boolean;
  fadeColor?: string;
  style?: CSSProperties;
};

export function ChipScroller({
  children,
  className = "",
  gap = "0.625rem",
  edgePadding = "1rem",
  activeIndex,
  snap = false,
  fadeColor = "rgba(7,10,18,1)",
  style,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  const update = () => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setShowLeft(el.scrollLeft > 4);
    setShowRight(el.scrollLeft < max - 4);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    // Observe container + each child (children are observed via MutationObserver-style
    // re-attach whenever the child list mutates, without recreating the scroll listener).
    const ro = new ResizeObserver(update);
    ro.observe(el);
    const attachChildren = () => Array.from(el.children).forEach(c => ro.observe(c));
    attachChildren();
    const mo = new MutationObserver(() => { attachChildren(); update(); });
    mo.observe(el, { childList: true });
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
      mo.disconnect();
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || activeIndex == null || activeIndex < 0) return;
    const child = el.children[activeIndex] as HTMLElement | undefined;
    if (!child) return;
    const target = child.offsetLeft - (el.clientWidth - child.clientWidth) / 2;
    el.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [activeIndex]);

  const fadeTransparent = fadeColor.replace(/,\s*1\)/, ",0)").replace(/rgb\(/, "rgba(").replace(/\)$/, ",0)");

  return (
    <div className="relative" style={style}>
      <div
        ref={ref}
        className={`scrollbar-hide flex flex-nowrap whitespace-nowrap overflow-x-auto touch-pan-x ${snap ? "snap-x snap-mandatory [&>*]:snap-start" : ""} ${className}`}
        style={{ gap, paddingLeft: edgePadding, paddingRight: edgePadding, scrollPaddingLeft: edgePadding, scrollPaddingRight: edgePadding }}
      >
        {children}
      </div>
      {/* Edge fade gradients — pointer-events:none so they never block taps */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 bottom-0 left-0 transition-opacity duration-200"
        style={{
          width: "24px",
          opacity: showLeft ? 1 : 0,
          background: `linear-gradient(to right, ${fadeColor}, ${fadeTransparent})`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 bottom-0 right-0 transition-opacity duration-200"
        style={{
          width: "24px",
          opacity: showRight ? 1 : 0,
          background: `linear-gradient(to left, ${fadeColor}, ${fadeTransparent})`,
        }}
      />
    </div>
  );
}
