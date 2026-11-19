import {assetUrl} from "../utils/assetUrl";
import { scenarios, type Scenario, type Side } from "../data/scenarios";
import { Story } from "../components/Story";
import { useSceneController } from "./useSceneController";
import type { ProjectionMode } from "../domain/adaptiveProjection";

import { researchDefaults, type Algorithm } from "../domain/researchProjection";
import { opticalDefaults } from "../rendering/OpticalAssembly";
import { OpticalControls, Dial } from "../components/ResearchControls";
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Drive } from "../rendering/Drive";
import { cfg } from "../scenes/corridor";
import { FogControls, PerceptionReadout } from "../components/FogControls";
import type { Level } from "../domain/types";
import { Icon } from "../components/Icon";
import "../styles/main.css";
const levels: { key: Level; name: string }[] = [
  { key: "high", name: "高质量" },
  { key: "medium", name: "中质量" },
  { key: "low", name: "低质量" },
];
const clock = (t: number) => "00:" + t.toFixed(1).padStart(4, "0");
function App() {
  const {
    scene,
    side,
    setSide,
    mode,
    setProjectionMode,
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
    enterScene,
    startStory,
    setPerceptionState,
    resetScene,
    toggle,
    lesson,
    set,
  } = useSceneController();
  const [projection, setProjection] = useState(researchDefaults),
    [power, setPower] = useState(1),
    [opticalOpen, openOptical] = useState(false),
    [optical, setOptical] = useState(opticalDefaults);
  const labOptical = !story && opticalOpen;
  const root = useRef<HTMLElement>(null),
    dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (modal) dialog.current?.showModal();
    else dialog.current?.close();
  }, [modal]);
  async function fullscreen() {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await root.current?.requestFullscreen();
  }
  const debug =
    import.meta.env.DEV && new URLSearchParams(location.search).has("debug");
  return (
    <main ref={root} className={story ? "filmMode" : undefined}>
      <Drive
        s={s}
        projection={story ? researchDefaults : projection}
        optical={labOptical ? optical : null}
        inspect={!story && !labOptical && inspect}
        hud={shot?.hud ?? hud}
        film={shot}
        cabinOn={shot ? shot.cockpit : labOptical || cabinOn}
        reveal={shot?.reveal ?? reveal}
        teaching={!story && teaching}
        strength={
          shot?.strength ??
          (scene === "cross" && !inspect && !labOptical ? animated * power : 0)
        }
        compare={!story && !labOptical && mode === "compare" && !inspect}
        story={story}
        exterior={shot?.exterior ?? false}
        xray={shot?.xray ?? true}
      />
      <header className="mast">
        <div className="brandMark" aria-label="VISTA">
          <svg width="30" height="25" viewBox="0 0 33 26">
            <path
              d="M0 2h7l9 16L26 2h7L16 26zM12 2h9l-4.5 8z"
              fill="currentColor"
            />
          </svg>
          <strong>VISTA</strong>
        </div>
        <div className="mastActions">
          <button
            className="experience"
            aria-pressed={story}
            onClick={story ? returnToLab : startStory}
          >
            {story ? "LIVE LAB ↗" : "STORY EXPERIENCE"}
          </button>
          {!story && (
            <button
              className="experience"
              aria-pressed={labOptical}
              onClick={() => {
                openOptical(!opticalOpen);
                play(false);
              }}
            >
              OPTICAL LAB
            </button>
          )}
          {!story && (
            <select
              aria-label="驾驶场景"
              value={scene}
              onChange={(e) => {
                openOptical(false);
                enterScene(e.target.value as Scenario);
              }}
            >
              {Object.entries(scenarios).map(([id, sc], i) => (
                <option key={id} value={id}>
                  0{i + 1}　{sc.name}
                </option>
              ))}
            </select>
          )}
          <button aria-label="技术说明" onClick={() => setModal("info")}>
            <Icon name="info" size={17} />
          </button>
          <button aria-label="全屏切换" onClick={fullscreen}>
            <Icon name="expand" size={16} />
          </button>
        </div>
      </header>
      {story && shot && (
        <Story
          progress={scroll}
          shot={shot}
          change={setScroll}
          enter={enterLab}
        />
      )}
      {labOptical && (
        <OpticalControls
          o={optical}
          set={setOptical}
          close={() => openOptical(false)}
        />
      )}
      {!story &&
        !labOptical &&
        scene === "degraded" &&
        hud &&
        !inspect &&
        !teaching && <PerceptionReadout s={s} />}
      {!story && !labOptical && hud && !inspect && !teaching && (
        <div className="drivingReadout">
          <span>{Math.round(s.ego.velocity.north * 3.6)}</span>
          <small>km/h</small>
          <b>D</b>
        </div>
      )}
      {!story && !labOptical && (
        <aside className={"controls " + (panel ? "open" : "")}>
          <section className="drawer" inert={!panel} aria-hidden={!panel}>
            <div className="drawerContent">
              <div className="drawerHead">
                <div>
                  <span className="micro">DRIVE LAB</span>
                  <h2>演示控制</h2>
                </div>
                <button
                  aria-label="收起演示抽屉"
                  onClick={() => setPanel(false)}
                >
                  <Icon name="close" />
                </button>
              </div>
              <label className="trackLabel">
                场景时间{" "}
                <output>
                  {clock(t)} <span>/ 00:12.0</span>
                </output>
              </label>
              <input
                aria-label="场景时间"
                type="range"
                min="0"
                max="12"
                step=".01"
                value={t}
                disabled={locked}
                onChange={(e) => {
                  setTimelineProgress(+e.target.value / cfg.duration);
                }}
              />
              <div className="setting">
                <label>位置质量</label>
                <div className="seg">
                  {scene === "degraded" && (
                    <button
                      aria-pressed={opts.qualityTimeline}
                      onClick={() =>
                        setPerceptionState((o) => ({
                          ...o,
                          qualityTimeline: true,
                          quality: "high",
                        }))
                      }
                    >
                      随片段
                    </button>
                  )}
                  {levels.map(({ key, name }) => (
                    <button
                      key={key}
                      aria-pressed={
                        opts.quality === key &&
                        (scene !== "degraded" || !opts.qualityTimeline)
                      }
                      onClick={() =>
                        setPerceptionState((o) => ({
                          ...o,
                          quality: key,
                          qualityTimeline: false,
                        }))
                      }
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
              {scene === "cross" && (
                <>
                  <div className="setting">
                    <label htmlFor="projection">研究投影</label>
                    <select
                      id="projection"
                      disabled={inspect}
                      value={mode}
                      onChange={(e) =>
                        setProjectionMode(e.target.value as ProjectionMode)
                      }
                    >
                      <option value="normal">NORMAL · 驾驶</option>
                      <option value="auto">ADAPTIVE · 风险联动</option>
                      <option value="left">ADAPTIVE LEFT</option>
                      <option value="right">ADAPTIVE RIGHT</option>
                      <option value="compare">COMPARE</option>
                    </select>
                  </div>
                  <details className="projectionResearch">
                    <summary>Projection Research · 算法对比</summary>
                    <div className="setting">
                      <label htmlFor="algorithm">映射算法</label>
                      <select
                        id="algorithm"
                        value={
                          mode === "normal" ? "normal" : projection.algorithm
                        }
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "normal") setProjectionMode("normal");
                          else {
                            setProjection({
                              ...projection,
                              algorithm: value as Algorithm,
                            });
                            if (mode === "normal") setProjectionMode("left");
                          }
                        }}
                      >
                        <option value="normal">NORMAL</option>
                        <option value="current">CURRENT</option>
                        <option value="pannini">PANNINI</option>
                        <option value="structure">STRUCTURE-AWARE</option>
                      </select>
                    </div>
                    <Dial
                      label="扩展强度"
                      value={power}
                      min={0}
                      max={1}
                      step={0.01}
                      onChange={setPower}
                    />
                    <Dial
                      label="中央保护半宽"
                      value={projection.center}
                      min={0.14}
                      max={0.48}
                      step={0.01}
                      onChange={(v) =>
                        setProjection({ ...projection, center: v })
                      }
                    />
                    <Dial
                      label="结构保护权重"
                      value={projection.protection}
                      min={0}
                      max={1}
                      step={0.01}
                      onChange={(v) =>
                        setProjection({ ...projection, protection: v })
                      }
                    />
                    <output id="projection-result" aria-live="off"></output>
                  </details>
                  <div className="setting">
                    <label htmlFor="side">横向来车</label>
                    <select
                      id="side"
                      value={side}
                      onChange={(e) => setSide(e.target.value as Side)}
                    >
                      <option value="left">左侧驶入</option>
                      <option value="right">右侧驶入</option>
                    </select>
                  </div>
                </>
              )}
              <div className="options">
                <button
                  aria-pressed={cabinOn}
                  disabled={locked || inspect}
                  onClick={() => setCabin(!cabinOn)}
                >
                  {cabinOn ? "隐藏座舱" : "显示座舱"}
                </button>
                <button
                  disabled={locked}
                  aria-pressed={inspect}
                  onClick={() => setInspect(!inspect)}
                >
                  {inspect ? "返回驾驶" : "空间观察"}
                </button>
                <button disabled={locked} onClick={() => setModal("params")}>
                  参数设置
                </button>
                <button onClick={resetScene}>重置</button>
              </div>
              <p className="note">
                <i />
                {d.status} · {d.reason}
              </p>
            </div>
          </section>
          <div className="bar">
            <button
              className="play"
              disabled={locked}
              aria-label={playing ? "暂停" : "播放"}
              onClick={toggle}
            >
              <Icon name={playing ? "pause" : "play"} size={16} />
            </button>
            <button
              className="hudToggle"
              aria-pressed={hud}
              disabled={locked || inspect}
              onClick={() => setHud(!hud)}
            >
              <i />
              HUD {hud ? "ON" : "OFF"}
            </button>
            <b className="sep" />
            {scene === "cross" ? (
              <button
                className="revealBtn"
                disabled={inspect}
                aria-pressed={mode !== "normal"}
                onClick={() =>
                  setProjectionMode(mode === "normal" ? "auto" : "normal")
                }
              >
                {mode === "normal" ? "研究投影" : "恢复标准投影"}
              </button>
            ) : (
              <button
                className="revealBtn"
                aria-pressed={teaching}
                onClick={lesson}
              >
                <Icon name="eye" size={16} />
                {teaching ? "退出揭示" : "查看感知原理"}
              </button>
            )}
            <b className="sep" />
            <button
              className="fold"
              aria-label={panel ? "收起控制台" : "展开控制台"}
              aria-expanded={panel}
              onClick={() => setPanel(!panel)}
            >
              <Icon name="settings" size={17} />
            </button>
          </div>
        </aside>
      )}
      {debug && (
        <details>
          <summary>开发诊断</summary>
          <pre>{JSON.stringify({ track: s.track, decision: d }, null, 2)}</pre>
        </details>
      )}
      <dialog
        ref={dialog}
        onCancel={() => setModal(null)}
        onClick={(e) => {
          if (e.target === dialog.current) setModal(null);
        }}
      >
        <div className="dialogHead">
          <h2>{modal === "info" ? "技术说明" : "链路参数"}</h2>
          <button aria-label="关闭" onClick={() => setModal(null)}>
            <Icon name="close" />
          </button>
        </div>
        {modal === "info" ? (
          <>
            <p>
              路侧单元观测前方车辆。系统按采样时刻外推位置，再从驾驶员眼点检查货车遮挡和
              HUD 视场。
            </p>
            <dl>
              <dt>遮挡显影</dt>
              <dd>定位稳定时，半透明车形绑定路侧估计位置。</dd>
              <dt>虚线区域</dt>
              <dd>位置误差增大，显示估计范围。</dd>
              <dt>方向提示</dt>
              <dd>精确定位失效，仅保留有依据的方位。</dd>
            </dl>
            <p className="muted">
              本场景的轨迹、时延、误差及风险阈值均为仿真假设。车辆存在与分类置信度独立于位置质量。
            </p>
            <p className="muted">
              光学实验参考 Optics Express 2023 的一组设计参数：13° × 5°
              视场、130 × 50 mm 眼盒与 10 m
              虚像距离。实验中的曲面主镜、安装尺寸与有效风挡平面为仿真假设。真实系统还受玻璃曲率及重影、成像畸变、环境光和亮度、眼点配准及提示密度限制。
              <a
                href="https://doi.org/10.1364/OE.484777"
                target="_blank"
                rel="noreferrer"
              >
                设计案例原文
              </a>
            </p>
            <p className="muted">
              车辆模型：taeemtasbi（Tata 货车）、Eric Chadwick / Darmstadt
              Graphics Group（Car Concept）。材质与街景组件：Poly Haven。
              <a href={assetUrl("credits.txt")} target="_blank" rel="noreferrer">
                资产与许可
              </a>
            </p>
          </>
        ) : (
          <>
            <div className="seg">
              <button
                aria-pressed={!opts.baseline}
                onClick={() => set("baseline", false)}
              >
                VISTA 增强
              </button>
              <button
                aria-pressed={opts.baseline}
                onClick={() => set("baseline", true)}
              >
                传统预警
              </button>
            </div>
            {scene === "degraded" && (
              <FogControls opts={opts} s={s} set={set} />
            )}
            <label className="param">
              基础传输延迟 <b>{opts.latencyMs} ms</b>
              <input
                type="range"
                aria-label="基础传输延迟"
                min="0"
                max="2000"
                step="10"
                value={opts.latencyMs}
                onChange={(e) => set("latencyMs", +e.target.value)}
              />
            </label>
            <button
              className="panelToggle"
              onClick={() => {
                setPerceptionState((o) =>
                  manualOutage
                    ? { ...o, restoreAt: t }
                    : { ...o, cutAt: t, restoreAt: null },
                );
                if (t < cfg.duration) play(true);
              }}
            >
              {manualOutage ? "恢复消息" : "中断消息"}
            </button>
            <p>
              {scene === "degraded" && opts.linkTimeline && t >= 5.2 && t < 8.2
                ? "独立链路试验正在丢包，8.2 s 后恢复发送。"
                : "中断后继续回放，最后一次观测超过 1.5 s 时撤除目标提示。"}
            </p>
          </>
        )}
      </dialog>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
