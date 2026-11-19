import { useEffect, useRef, useState } from "react";
import { cfg } from "../scenes/corridor";
export function useTimelineController() {
  const [t, setT] = useState(2.4),
    [playing, play] = useState(false),
    time = useRef(t);
  function seek(v: number) {
    time.current = v;
    setT(v);
  }
  useEffect(() => {
    if (!playing) return;
    let id = 0,
      prev = performance.now();
    function step(now: number) {
      const next = Math.min(cfg.duration, time.current + (now - prev) / 1000);
      prev = now;
      seek(next);
      if (next >= cfg.duration) play(false);
      else id = requestAnimationFrame(step);
    }
    id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [playing]);
  function toggle() {
    if (t >= cfg.duration) seek(0);
    play(!playing);
  }
  function setTimelineProgress(progress: number) {
    play(false);
    seek(cfg.duration * Math.min(1, Math.max(0, progress)));
  }
  return { t, playing, play, seek, toggle, setTimelineProgress };
}
