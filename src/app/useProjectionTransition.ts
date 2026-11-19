import { useLayoutEffect, useRef, useState } from "react";
import { smooth } from "../scenes/story";
export function useProjectionTransition(target: number, driven?: number) {
  const [value, setValue] = useState(target),
    current = useRef(target);
  useLayoutEffect(() => {
    if (driven !== undefined) {
      return;
    }
    const from = current.current,
      duration = matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 1
        : 620;
    setValue(from);
    if (from === target) return;
    const start = performance.now();
    let id = 0;
    function step(now: number) {
      const u = Math.min(1, (now - start) / duration);
      current.current = from + (target - from) * smooth(u);
      setValue(current.current);
      if (u < 1) id = requestAnimationFrame(step);
    }
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [target, driven]);
  return driven ?? value;
}
