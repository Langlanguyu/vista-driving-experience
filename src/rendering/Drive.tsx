import {
  Suspense,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal, Canvas } from "@react-three/fiber";
import * as T from "three";
import {
  labMetrics,
  projectionField,
  researchDefaults,
  type ProjectionSettings,
} from "../domain/researchProjection";
import {
  OpticalAssembly,
  opticalDefaults,
  type OpticalSettings,
} from "./OpticalAssembly";
import { displayBoundary, solveOptics } from "../domain/opticalRayTracer";
import type { SceneState } from "../domain/types";
import { verticalFov } from "../domain/geometry";
import { CrossingTitle } from "./CrossingTitle";
import { CameraController } from "./CameraController";
import { StreetWorld } from "./StreetWorld";
import { useProjectionTransition } from "../app/useProjectionTransition";
import { ProjectionPass } from "./ProjectionPass";
import { scenarios } from "../data/scenarios";
import type { StorySample } from "../scenes/story";
import { SpatialHUD } from "./SpatialHUD";
import { cfg } from "../scenes/corridor";
const params = new URLSearchParams(location.search);
const lens = Number(params.get("fov")) || cfg.horizontalFov;
export function Drive({
  s,
  hud,
  inspect,
  cabinOn,
  reveal,
  teaching,
  strength,
  compare,
  story,
  exterior,
  xray,
  film,
  projection = researchDefaults,
  optical,
}: {
  s: SceneState;
  hud: boolean;
  inspect: boolean;
  cabinOn: boolean;
  reveal: number;
  teaching: boolean;
  strength: number;
  compare: boolean;
  story: boolean;
  exterior: boolean;
  xray: boolean;
  film?: StorySample | null;
  projection?: ProjectionSettings;
  optical?: OpticalSettings | null;
}) {
  const cockpitLayer = useMemo(() => new T.Scene(), []);
  const owner = inspect ? "inspect" : story ? "story" : "driver";
  const compareMix = useProjectionTransition(compare ? 1 : 0);
  const host = useRef<HTMLElement>(null),
    [size, setSize] = useState([1440, 900]),
    [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  useLayoutEffect(() => {
    const el = host.current!;
    const sync = () => setSize([el.clientWidth, el.clientHeight]);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const eyeX = optical?.eyeX ?? (film?.chapter === 5 ? film.reality.eyeX : 0);
  const eyeY = optical?.eyeY ?? 0;
  const driverOffset = (!!optical && !optical.section) || film?.chapter === 5;
  // The same optical camera is passed to both Three and the projected annotations.
  const current = {
    ...s,
    camera: {
      ...s.camera,
      eye: driverOffset
        ? {
            ...s.camera.eye,
            east: s.camera.eye.east + eyeX,
            up: s.camera.eye.up + eyeY,
          }
        : s.camera.eye,
      verticalFov: verticalFov(
        Math.max(80, Math.min(95, lens)) - reveal * 10,
        size[0] / size[1],
      ),
    },
  };
  const field = useMemo(
    () =>
      strength
        ? projectionField(
            current.camera,
            size[0],
            size[1],
            s.track?.position ?? null,
            strength,
            projection,
          )
        : null,
    [
      s,
      strength,
      size,
      projection,
      current.camera.verticalFov,
      driverOffset,
      eyeX,
      eyeY,
    ],
  );
  useLayoutEffect(() => {
    const output = document.querySelector("#projection-result");
    if (output) {
      if (!field) {
        output.textContent = "标准透视 · 新增视角 0°";
        return;
      }
      const m = labMetrics(
        field,
        current.camera,
        size[0],
        size[1],
        s.truth.target,
      );
      output.textContent =
        "新增 " +
        m.extraDegrees.toFixed(1) +
        "°　梁缘 RMS " +
        (Number.isFinite(m.railRms) ? m.railRms.toFixed(2) + " px" : "—") +
        "　车形较局部透视 Δ " +
        m.carAspectChange.toFixed(1) +
        "%";
    }
  }, [field, size, s]);
  const opticsOn = !!optical || film?.chapter === 4 || film?.chapter === 5;
  const settings = optical ?? opticalDefaults;
  const solution = useMemo(
    () => solveOptics(settings.vid, eyeX, settings.eyeY, settings.flat),
    [settings.vid, eyeX, settings.eyeY, settings.flat],
  );
  const stage = film?.chapter === 4 ? film.optics : null;
  const section = optical ? +settings.section : (stage?.section ?? 0);
  const boundary = film?.chapter === 5 ? film.reality.boundary : 0;
  const real = optical ? +settings.rays : (stage?.rayRevealProgress ?? 0);
  const virtual = optical
    ? +settings.extensions
    : (stage?.virtualRayProgress ?? 0);
  const hardware = optical
    ? +settings.hardware
    : (stage?.opticalComponentVisibility ?? 0);
  const target = s.track?.position;
  const admission = target
    ? displayBoundary(
        new T.Vector3(
          target.east - s.camera.eye.east,
          target.up - s.camera.eye.up,
          s.camera.eye.north - target.north,
        ),
        new T.Vector3(eyeX, eyeY, 0),
        solution.bench,
        settings.vid,
      )
    : "field";
  const depthView = optical ? +settings.overview : virtual;
  const opticalView = {
    eyeX: driverOffset ? eyeX : 0,
    eyeY: driverOffset ? eyeY : 0,
    section,
    orbit: optical?.orbit ?? stage?.angle ?? 0,
    virtual: depthView,
    vid: settings.vid,
    console: film?.future.console ?? 0,
  };
  const [showHud, setShowHud] = useState(hud);
  useLayoutEffect(() => {
    if (hud) {
      setShowHud(true);
      return;
    }
    const id = setTimeout(() => setShowHud(false), 160);
    return () => clearTimeout(id);
  }, [hud]);
  return (
    <section
      className="view"
      ref={host}
      data-algorithm={strength ? projection.algorithm : "normal"}
      data-rays={solution.rays.length}
      data-image-distance={solution.image?.length().toFixed(5)}
      data-boundary={boundary.toFixed(3)}
      data-admission={admission}
      data-console={film?.future.console.toFixed(3)}
      data-owner={owner}
      data-yaw={s.camera.yaw.toFixed(5)}
      data-ready={ready}
      data-scene={s.scenario}
      data-strength={strength.toFixed(4)}
      data-compare={compare}
      data-eye={[
        s.camera.eye.east,
        s.camera.eye.north,
        s.camera.eye.up,
        s.camera.yaw,
        s.camera.pitch,
      ]
        .map((v) => v.toFixed(3))
        .join(",")}
      data-xray={
        xray &&
        hud &&
        !inspect &&
        !reveal &&
        s.decision.mode === "world" &&
        s.decision.occlusion === "truck"
      }
      data-camera={inspect ? "inspect" : "driver"}
      data-reveal={reveal.toFixed(3)}
      data-time={s.time.toFixed(3)}
    >
      <Canvas
        shadows="percentage"
        frameloop="demand"
        dpr={[1, 1.25]}
        camera={{ far: 760, near: 0.045 }}
        gl={{
          antialias: true,
          stencil: true,
          powerPreference: "high-performance",
          toneMapping:
            params.get("tone") === "neutral"
              ? T.NeutralToneMapping
              : T.ACESFilmicToneMapping,
          toneMappingExposure: 1.12,
          outputColorSpace: T.SRGBColorSpace,
        }}
        fallback={<div>需要支持 WebGL 2 的浏览器</div>}
      >
        <Suspense fallback={null}>
          <CameraController s={current} owner={owner} />
          <StreetWorld
            study={optical ? +settings.section : (stage?.dashboardReveal ?? 0)}
            futureConsole={film?.chapter === 6}
            xrayAmount={film?.xrayAmount}
            cockpitLayer={cockpitLayer}
            s={current}
            inspect={inspect}
            cabinOn={cabinOn}
            reveal={reveal}
            ready={onReady}
            hud={hud && xray}
            exterior={exterior}
          />
          {opticsOn &&
            createPortal(
              <OpticalAssembly
                solution={solution}
                section={section}
                hardware={hardware}
                real={real}
                virtual={virtual}
                image={optical ? 1 : (stage?.image ?? boundary)}
                boundary={boundary}
                eyeX={eyeX}
                eyeY={settings.eyeY}
              />,
              cockpitLayer,
            )}
          {story && <CrossingTitle opacity={film?.crossingType ?? 0} />}
          <ProjectionPass
            strength={strength}
            field={field}
            opticalView={opticalView}
            compare={compareMix}
            study={optical ? section : (stage?.environmentFade ?? 0)}
            wipe={film?.wipe}
            cabinOpacity={film?.cabinOpacity}
            cockpitLayer={cockpitLayer}
            cabinOn={cabinOn && !inspect}
            cockpitFov={verticalFov(
              Math.max(80, Math.min(95, lens)),
              size[0] / size[1],
            )}
          />
        </Suspense>
      </Canvas>
      {!story && <div key={s.scenario} className="sceneDissolve" />}
      {!ready && <div className="loading">正在载入滨河街区…</div>}
      {ready && !inspect && !compare && (
        <div
          className={
            "hudLayer " +
            (!hud && !teaching && film?.chapter !== 5 ? "fadeOut" : "")
          }
        >
          <SpatialHUD
            s={current}
            w={size[0]}
            h={size[1]}
            field={film?.chapter === 5 && film.wipe < 0.01 ? null : field}
            visible={
              !optical &&
              (film?.chapter === 5
                ? boundary < 0.1 || admission === "inside"
                : story
                  ? hud
                  : showHud)
            }
            strength={strength}
            reveal={reveal}
          />
        </div>
      )}
      {ready &&
        compare &&
        compareMix > 0.98 &&
        !inspect &&
        hud &&
        [0, strength].map((power, i) => (
          <div key={i} className={"comparePane pane" + i}>
            <div>
              <SpatialHUD
                s={current}
                w={size[0]}
                h={size[1]}
                visible
                field={power ? field : null}
                strength={power}
                reveal={0}
              />
            </div>
          </div>
        ))}
      {ready &&
        film?.chapter === 6 &&
        film.sec < 176 &&
        (s.decision.risk.level === "urgent" ||
          s.decision.risk.level === "caution") && (
          <div className="futureDirection">
            ‹　{s.decision.direction} · 横向来车
          </div>
        )}
      {ready && (boundary > 0.1 || optical) && (
        <div className="opticalReadout" data-valid={!!solution.image}>
          <small>
            {boundary ? "参考设计显示范围" : "OPTICAL LAB · 几何追迹"}
          </small>
          <b>
            {solution.image
              ? solution.image.length().toFixed(2) + " m"
              : "眼点超出有效光束"}
          </b>
          <span>
            {solution.rays.length}/9 中心视场采样　·　眼点{" "}
            {Math.round(eyeX * 1000)} mm
          </span>
          {boundary > 0 && (
            <span>
              13° × 5°　·　虚像面 {solution.size.width.toFixed(2)} ×{" "}
              {solution.size.height.toFixed(2)} m<br />
              眼盒 130 × 50 mm　·　Optics Express 2023 设计案例
              <br />
              {admission === "eye"
                ? "眼盒外 · 图像不可用"
                : admission === "field"
                  ? "横向目标在显示角域外"
                  : "横向目标位于显示区域内"}
            </span>
          )}
        </div>
      )}
      {ready && !story && !optical && (
        <div
          className="modeTitle"
          key={
            s.scenario +
            (inspect
              ? "inspect"
              : teaching
                ? "lesson"
                : cabinOn
                  ? "cockpit"
                  : "clear")
          }
        >
          <span>
            {inspect
              ? "SPATIAL VIEW"
              : teaching
                ? "PERCEPTION STUDY"
                : scenarios[s.scenario].english.toUpperCase()}
          </span>
          <h1>
            {inspect
              ? "空间观察"
              : teaching
                ? "感知原理"
                : cabinOn
                  ? scenarios[s.scenario].name
                  : "无座舱视野"}
          </h1>
        </div>
      )}
      {compare && (
        <div className="compareLabels">
          <span>标准透视</span>
          <span>左侧扩展 · 同时刻</span>
        </div>
      )}
      {teaching && (
        <div className="lessonNote">
          <b>技术揭示</b>　场景已暂停 · 车体淡出以显示真实目标
        </div>
      )}
    </section>
  );
}
