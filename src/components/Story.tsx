import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  chapters,
  clamp,
  filmDuration,
  ramp,
  type StorySample,
} from "../scenes/story";
import "../styles/story.css";
const stamp = (s: number) =>
  Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
const levels = {
  precise: [
    "A",
    "PRECISE LOCATION",
    "Target position verified.",
    "路侧定位稳定，车形锚定在估计位置。",
  ],
  estimated: [
    "B",
    "ESTIMATED AREA",
    "Position uncertainty increased.",
    "虚线围出可能范围，目标的精确位置仍待确认。",
  ],
  directional: [
    "C",
    "DIRECTION ONLY",
    "Exact position unavailable.",
    "只能判断前方有车，车形与位置锚点已撤除。",
  ],
  limited: [
    "D",
    "PERCEPTION LIMITED",
    "Clear path cannot be confirmed.",
    "有效观测不足，无法确认前方道路畅通。",
  ],
  stale: [
    "E",
    "V2X DATA STALE",
    "Last observation expired.",
    "消息已过期，最后一次观测不能代表当前位置。",
  ],
  clear: ["", "NO WARNING", "", "本次横穿冲突已解除。"],
} as const;
function Evidence({ shot }: { shot: StorySample }) {
  const [letter, title, english, cn] = levels[shot.evidence],
    age = shot.s.network.communicationAge;
  return (
    <section className="filmEvidence" data-level={shot.evidence}>
      <div className="evidenceRule">
        <span>{shot.sec >= 100 ? "重新获取观测" : "目标 F-03"}</span>
        <span>{letter} / E</span>
      </div>
      <h2>{title}</h2>
      <i>{english}</i>
      <p>{cn}</p>
      <div className="evidenceScale" aria-label="定位证据序列">
        {Object.entries(levels)
          .slice(0, 5)
          .map(([key, [l]]) => (
            <span key={key} data-active={shot.evidence === key}>
              {l}
            </span>
          ))}
      </div>
      <small>
        能见度 {Math.round(shot.s.sensorVisibility * 100)}%　·　消息年龄{" "}
        {age === null ? "—" : Math.round(age * 1000) + " ms"}
      </small>
    </section>
  );
}
function Prologue({ sec }: { sec: number }) {
  const u = ramp(sec, 3, 14),
    a = 1 - ramp(sec, 7, 13);
  return (
    <div
      className="prologue"
      aria-label="What you can’t see."
      style={{ opacity: 1 - ramp(sec, 12.5, 15) }}
    >
      <svg viewBox="0 0 1200 760" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <mask id="film-aperture">
            <rect width="1200" height="760" fill="white" />
            <path
              d={`M ${707 - 1130 * u} 0 H1200 V760 H${535 - 1130 * u} Z`}
              fill="black"
            />
            <text
              x="54"
              y="502"
              className="maskSee"
              transform={`translate(${-100 * u} 0) scale(${1 + 1.4 * u})`}
              fill="black"
            >
              SEE.
            </text>
          </mask>
        </defs>
        <rect
          width="1200"
          height="760"
          fill="#18231f"
          mask="url(#film-aperture)"
        />
        <g opacity={a} fill="#eeeede" transform={`translate(0 ${-40 * u})`}>
          <text x="60" y="165" className="filmKicker">
            VISTA　 /　 INTERACTIVE DRIVING FILM
          </text>
          <text x="53" y="275" className="maskTitle">
            WHAT YOU
          </text>
          <text x="53" y="377" className="maskTitle">
            CAN’T
          </text>
        </g>
        <text
          x="54"
          y="502"
          className="maskSee"
          transform={`translate(${-100 * u} 0) scale(${1 + 1.4 * u})`}
          fill="none"
          stroke="#e8e9d9"
          strokeWidth="1.6"
          opacity={a}
        >
          SEE.
        </text>
      </svg>
      <p style={{ opacity: a }}>当危险被挡住，驾驶员还能看见什么？</p>
    </div>
  );
}
function FilmCaption({ shot }: { shot: StorySample }) {
  const { chapter: k, sec } = shot;
  if (k === 0) return <Prologue sec={sec} />;
  if (k === 3) return <Evidence shot={shot} />;
  if (k === 6 && sec >= 172)
    return (
      <div
        className="filmSignature"
        style={{
          opacity: shot.future.signature,
          transform: `translateY(${20 * (1 - shot.future.signature)}px)`,
        }}
      >
        <h1>VISTA</h1>
        <p>See Beyond. Drive Aware.</p>
      </div>
    );
  let title: string, cn: string, tag: string, start: number;
  if (k === 1) {
    [title, cn, tag, start] =
      sec < 23
        ? ["The unseen.", "前方货车遮住了第二辆车。", "DRIVER VIEW", 15]
        : sec < 30
          ? [
              "Beyond the obstacle.",
              "路侧观测给出了遮挡目标的位置。",
              "SPATIAL X-RAY",
              23,
            ]
          : [
              "Behind the truck.",
              "从侧面看，真实车辆仍在货车前方行驶。",
              "OCCLUSION REVEAL",
              30,
            ];
  } else if (k === 2) {
    [title, cn, tag, start] =
      sec < 53
        ? [
            "Beyond the frame.",
            "左侧横街传来接近目标的观测。",
            "CROSS TRAFFIC",
            43,
          ]
        : sec < 67
          ? [
              "A wider sense.",
              "保持眼点和座舱不动，左侧街道进入视野。",
              "ASYMMETRIC PROJECTION",
              53,
            ]
          : [
              "Back in view.",
              "横穿车辆进入正常前视范围，展开逐渐收回。",
              "FORWARD VIEW",
              67,
            ];
  } else if (k === 4) {
    const shots: [string, string, string, number][] = [
      [
        "How does it reach your eyes?",
        "前方箭头的光从哪里来？",
        "THE LIGHT BEHIND THE IMAGE",
        105,
      ],
      [
        "Into the eye box.",
        "金色实线表示从风挡反射、进入眼盒的光。",
        "FOLLOW THE LIGHT",
        109,
      ],
      [
        "Beneath the dash.",
        "图像源发光，折叠镜与曲面主镜将光送向风挡。",
        "HARDWARE REVEAL",
        113,
      ],
      [
        "Three reflections.",
        "沿箭头依次观察 M1、M2 和风挡上的三个反射点。",
        "OPTICAL ISOLATION",
        120,
      ],
      [
        "A virtual image.",
        "沿接收方向反向延伸，虚像落在风挡前方。",
        "PERCEIVED BEYOND THE WINDSHIELD",
        124,
      ],
      [
        "Back on the road.",
        "同一束光在驾驶员视野中重新形成提示。",
        "DRIVER VIEW",
        131,
      ],
    ];
    [title, cn, tag, start] = shots.filter((v) => sec >= v[3]).at(-1)!;
  } else if (k === 5) {
    [title, cn, tag, start] =
      sec < 146
        ? [
            "Digital field.",
            "数字仿真可以重映射外部街景。",
            "SIMULATION / DISPLAY",
            135,
          ]
        : [
            "Physical view.",
            "框内是虚像面的角范围。移动眼点越过眼盒，导航光束退出；眼点返回后恢复。",
            "DISPLAY BOUNDARY",
            146,
          ];
  } else
    [title, cn, tag, start] = [
      "Connected sight.",
      "左前方来车。中控地图根据同一条路侧观测标出车辆与交叉口。",
      "FUTURE COCKPIT",
      163,
    ];
  const entrance = ramp(sec, start, start + 0.8);
  return (
    <section
      className={"filmCaption chapter" + k}
      style={{
        opacity: 0.2 + 0.8 * entrance,
        transform: `translateY(${(1 - entrance) * 12}px)`,
      }}
    >
      <small>{tag}</small>
      <h2 style={{ opacity: 1 - shot.crossingType }}>{title}</h2>
      <p>{cn}</p>
    </section>
  );
}

export function Story({
  progress,
  shot,
  change,
  enter,
}: {
  progress: number;
  shot: StorySample;
  change: (p: number) => void;
  enter: () => void;
}) {
  const scroll = useRef<HTMLDivElement>(null),
    [auto, setAuto] = useState(false);
  const position = useRef(progress);
  position.current = progress;
  const initial = useRef(progress);
  // Native scrollTop is quantized in CSS pixels. Ignore acknowledgements of
  // commanded seeks, otherwise an exact chapter start may round into its predecessor.
  const commandedTop = useRef<number | null>(null);
  function moveScroll(el: HTMLDivElement, n: number) {
    el.scrollTop = n * (el.scrollHeight - el.clientHeight);
    commandedTop.current = el.scrollTop;
  }
  const write = (p: number) => {
    const el = scroll.current;
    if (!el) return;
    const n = clamp(p);
    position.current = n;
    moveScroll(el, n);
    change(n);
  };
  const seek = (p: number) => {
    setAuto(false);
    write(p);
  };
  useLayoutEffect(() => {
    const el = scroll.current!;
    moveScroll(el, initial.current);
    el.focus({ preventScroll: true });
    const ro = new ResizeObserver(() => {
      moveScroll(el, position.current);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    if (!auto) return;
    const from = position.current,
      start = performance.now();
    let id = 0;
    const tick = (now: number) => {
      const next = clamp(from + (now - start) / (filmDuration * 1000));
      write(next);
      if (next < 1) id = requestAnimationFrame(tick);
      else setAuto(false);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [auto, change]);
  const toggle = () => {
    if (position.current >= 1) write(0);
    setAuto(!auto);
  };
  const c = chapters[shot.chapter];
  return (
    <div
      className="film"
      data-chapter={shot.chapter}
      data-seconds={shot.sec.toFixed(3)}
      data-playing={auto}
    >
      <div
        ref={scroll}
        className="storyScroll"
        tabIndex={0}
        role="region"
        aria-label="滚动控制三维镜头"
        onScroll={(e) => {
          if (!auto) {
            const el = e.currentTarget;
            if (el.scrollTop === commandedTop.current) return;
            commandedTop.current = null;
            change(clamp(el.scrollTop / (el.scrollHeight - el.clientHeight)));
          }
        }}
        onWheel={() => setAuto(false)}
        onTouchStart={() => setAuto(false)}
        onKeyDown={(e) => {
          if (e.key === " ") {
            e.preventDefault();
            toggle();
          } else setAuto(false);
        }}
      >
        <div className="filmScrollLength" />
      </div>
      <div className="filmShading" />
      <FilmCaption shot={shot} />
      {shot.chapter === 5 && shot.wipe > 0 && shot.wipe < 1 && (
        <div className="filmSplit" style={{ left: 100 * shot.wipe + "%" }}>
          <span>数字扩展　/　原始前视</span>
        </div>
      )}
      <footer className="filmDeck">
        <div className="filmChapters" aria-label="章节跳转">
          {chapters.map((ch, i) => (
            <button
              key={ch.start}
              style={{ flex: ch.end - ch.start }}
              onClick={() => seek(ch.start / filmDuration)}
              aria-label={ch.title}
              aria-current={shot.chapter === i ? "step" : undefined}
            >
              <b
                style={{
                  width:
                    100 * clamp((shot.sec - ch.start) / (ch.end - ch.start)) +
                    "%",
                }}
              />
            </button>
          ))}
        </div>
        <div className="filmTransport">
          <label>
            <span>{String(shot.chapter).padStart(2, "0")}</span>
            <select
              aria-label="故事章节"
              value={shot.chapter}
              onChange={(e) =>
                seek(chapters[+e.target.value].start / filmDuration)
              }
            >
              {chapters.map((ch, i) => (
                <option key={ch.start} value={i}>
                  {ch.title}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() => seek(c.start / filmDuration)}
            aria-label="重看本章"
            title="重看本章"
          >
            ↶
          </button>
          <span className="filmTime">
            {stamp(shot.sec)} <em>/ 3:00</em>
          </span>
          <input
            type="range"
            aria-label="影片时间"
            min="0"
            max="180"
            step=".05"
            value={shot.sec}
            onChange={(e) => seek(+e.target.value / filmDuration)}
          />
          <small>滚动探索</small>
          {shot.sec >= 179.98 ? (
            <>
              <button
                className="filmPlay"
                onClick={() => {
                  write(0);
                  setAuto(true);
                }}
              >
                REPLAY STORY
              </button>
              <button onClick={enter}>ENTER LIVE LAB ↗</button>
            </>
          ) : (
            <button
              className="filmPlay"
              onClick={toggle}
              aria-label={auto ? "暂停叙事" : "自动播放"}
            >
              {auto ? "Ⅱ　暂停" : "▶　播放影片"}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
