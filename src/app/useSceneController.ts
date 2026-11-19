import { useEffect, useState, useRef } from "react";
import { scenarios, type Scenario, type Side } from "../data/scenarios";
import type { ProjectionMode } from "../domain/adaptiveProjection";
import { defaults, frame, type Controls } from "../scenes/corridor";
import { storyFrame } from "../scenes/story";
import { useProjectionTransition } from "./useProjectionTransition";
import { useTimelineController } from "./useTimelineController";
export function useSceneController() {
  const [scene, setScene] = useState<Scenario>("truck"),
    [side, setSide] = useState<Side>("left");
  const [mode, setMode] = useState<ProjectionMode>("normal"),
    [story, setStory] = useState(() =>
      new URLSearchParams(location.search).has("story"),
    ),
    [scroll, setScroll] = useState(0);
  const { t, playing, play, seek, toggle, setTimelineProgress } =
    useTimelineController();
  const [opts, setOpts] = useState<Controls>(defaults),
    [panel, setPanel] = useState(false),
    [modal, setModal] = useState<"info" | "params" | null>(null);
  const [hud, setHud] = useState(true),
    [inspect, setInspect] = useState(false);
  const [cabinOn, setCabin] = useState(true),
    [teaching, setTeaching] = useState(false),
    [reveal, setReveal] = useState(0);
  const progress = useRef(0),
    resume = useRef(false);
  useEffect(() => {
    const from = progress.current,
      to = teaching ? 1 : 0;
    if (from === to) return;
    const start = performance.now(),
      duration = matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 1
        : 780 * Math.abs(to - from);
    let id = 0;
    function animate(now: number) {
      const u = Math.min(1, (now - start) / duration);
      progress.current = from + (to - from) * u * u * (3 - 2 * u);
      setReveal(progress.current);
      if (u < 1) id = requestAnimationFrame(animate);
      else if (!teaching && resume.current) {
        resume.current = false;
        play(true);
      }
    }
    id = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(id);
  }, [teaching, scene]);
  function lesson() {
    if (teaching) {
      setTeaching(false);
      return;
    }
    resume.current = playing;
    play(false);
    setInspect(false);
    setTeaching(true);
  }
  const locked = teaching || reveal > 0;
  const live = frame(t, opts, scene, side, mode !== "normal" && !inspect);
  const manualOutage =
    opts.cutAt !== null &&
    t >= opts.cutAt &&
    (opts.restoreAt === null || t < opts.restoreAt);
  const activeRisk =
    live.decision.risk.level === "caution" ||
    live.decision.risk.level === "urgent";
  const desired =
    inspect || scene !== "cross"
      ? 0
      : mode === "auto"
        ? activeRisk
          ? live.decision.direction === "左前方"
            ? -1
            : live.decision.direction === "右前方"
              ? 1
              : 0
          : 0
        : mode === "left" || mode === "compare"
          ? -1
          : mode === "right"
            ? 1
            : 0;
  const shot = story ? storyFrame(scroll) : null;
  const animated = useProjectionTransition(desired, shot?.strength);
  const s = shot?.s ?? live,
    d = s.decision;
  const enterLab = () => {
    if (!shot) return;
    setStory(false);
    setScene(shot.s.scenario);
    setSide("left");
    setMode(shot.s.scenario === "cross" ? "auto" : "normal");
    setInspect(false);
    setHud(true);
    setCabin(true);
    setOpts({ ...defaults });
    setPanel(false);
    play(false);
    seek(shot.s.time);
  };
  function switchScene(next: Scenario) {
    setScene(next);
    setSide("left");
    setMode("normal");
    reset();
    seek(scenarios[next].cue);
  }
  const labSnapshot = useRef({
    playing: false,
    inspect: false,
    panel: false,
    teaching: false,
    resume: false,
  });
  function returnToLab() {
    const saved = labSnapshot.current;
    setStory(false);
    setPanel(saved.panel);
    setInspect(saved.inspect);
    setTeaching(saved.teaching);
    resume.current = saved.resume;
    play(saved.playing);
  }
  function startStory() {
    labSnapshot.current = {
      playing: playing || (!teaching && resume.current),
      inspect,
      panel,
      teaching,
      resume: teaching && resume.current,
    };
    play(false);
    resume.current = false;
    setTeaching(false);
    setInspect(false);
    setPanel(false);
    setModal(null);
    setStory(true);
  }
  function set<K extends keyof Controls>(key: K, value: Controls[K]) {
    setOpts((o) => ({ ...o, [key]: value }));
  }
  function restoreDefaultView() {
    setHud(true);
    setInspect(false);
    resume.current = false;
    progress.current = 0;
    setReveal(0);
    setTeaching(false);
    setCabin(true);
    setMode("normal");
  }
  function reset() {
    play(false);
    seek(0);
    setOpts({ ...defaults });
    restoreDefaultView();
  }
  return {
    scene,
    side,
    setSide,
    mode,
    setProjectionMode: setMode,
    story,
    scroll,
    setScroll,
    t,
    playing,
    play,
    opts,
    panel,
    setPanel,
    modal,
    setModal,
    hud,
    setHud,
    inspect,
    setInspect,
    cabinOn,
    setCabin,
    teaching,
    reveal,
    locked,
    setTimelineProgress,
    manualOutage,
    shot,
    animated,
    s,
    d,
    enterLab,
    returnToLab,
    enterScene: switchScene,
    startStory,
    setPerceptionState: setOpts,
    resetScene: reset,
    restoreDefaultView,
    toggle,
    lesson,
    set,
  };
}
