import { registerPoint, type Field } from "../domain/researchProjection";
import { cfg } from "../scenes/corridor";
import { projectWorldToDisplay } from "../domain/adaptiveProjection";
import type { ObjectPosition } from "../domain/types";
import type { SceneState } from "../domain/types";
export function SpatialHUD({
  s,
  w,
  h,
  reveal,
  visible,
  strength,
  field,
}: {
  s: SceneState;
  w: number;
  h: number;
  reveal: number;
  visible: boolean;
  strength: number;
  field?: Field | null;
}) {
  const project = (p: ObjectPosition) =>
    field
      ? registerPoint(p, s.camera, w, h, field)
      : projectWorldToDisplay(p, s.camera, w, h, strength);
  const d = s.decision,
    anchor = d.anchor && project(d.anchor);
  const teaching = reveal > 0.02;
  if (!visible && !teaching) return null;
  if (teaching) {
    const target = project({ ...s.truth.target, up: cfg.targetSize[1] / 2 }),
      truck = project({
        ...s.truth.truck,
        east: s.truth.truck.east + 0.96,
        up: 2.76,
      });
    if (!target || !truck) return null;
    const tx = target.x,
      ty = target.y,
      rx = truck.x,
      ry = truck.y;
    return (
      <svg
        className="hud lesson"
        viewBox={`0 0 ${w} ${h}`}
        style={{ opacity: reveal }}
        data-mode="reveal"
      >
        <g strokeLinejoin="round">
          <path d={`M ${rx} ${ry} l 29 -36 h 36`} />
          <circle cx={rx} cy={ry} r="3" />
          <text x={rx + 71} y={ry - 34}>
            前景 · 遮挡车体
          </text>
          <path d={`M ${tx} ${ty + 5} l -44 48 h -46`} />
          <circle cx={tx} cy={ty + 5} r="3" />
          <text x={tx - 94} y={ty + 56} textAnchor="end">
            实车 · {(s.truth.target.north - s.ego.position.north).toFixed(1)} m
          </text>
          {anchor && (
            <g>
              <ellipse
                cx={anchor.x}
                cy={anchor.y + 7}
                rx={anchor.scale * 1.23}
                ry="8"
              />
              <text x={anchor.x + anchor.scale * 1.23 + 8} y={anchor.y + 12}>
                路侧估计投影
              </text>
            </g>
          )}
        </g>
      </svg>
    );
  }
  if (d.mode === "none") return null;
  const outside =
    anchor &&
    (anchor.x < 22 || anchor.x > w - 22 || anchor.y < 14 || anchor.y > h - 14);
  const stale =
    d.mode === "unavailable" && (s.network.communicationAge ?? 0) > cfg.maxAge;
  if (!anchor || !d.anchor || outside)
    return (
      <div
        data-policy={outside ? "DIRECTION_ONLY" : d.policy}
        data-risk={d.risk.level}
        data-mode={outside ? "direction" : d.mode}
        className={
          "direction " +
          (s.scenario === "cross" && d.mode !== "unavailable"
            ? d.direction === "左前方"
              ? "edgeLeft"
              : "edgeRight"
            : "")
        }
        data-signal={
          stale ? "stale" : d.mode === "unavailable" ? "limited" : "bearing"
        }
        role="status"
      >
        <svg
          className="signalGlyph"
          viewBox="0 0 32 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          aria-hidden="true"
        >
          {stale ? (
            <>
              <circle cx="15" cy="12" r="9" strokeDasharray="40 6" />
              <path d="M15 6v6l5 3M25 2l4 4m0-4-4 4" />
            </>
          ) : d.mode === "unavailable" ? (
            <>
              <path strokeDasharray="4 3" d="M2 12q14-18 28 0-14 18-28 0Z" />
              <path d="M5 22 27 2" />
            </>
          ) : (
            <path
              transform={`rotate(${d.direction === "左前方" ? -65 : d.direction === "右前方" ? 65 : 0} 16 12)`}
              d="m5 17 11-11 11 11M10 20l6-6 6 6"
            />
          )}
        </svg>
        <span>
          {d.mode === "unavailable"
            ? stale
              ? "V2X 观测过期"
              : "感知受限"
            : d.direction +
              (s.scenario === "cross" ? " · 横向来车" : " · 车辆提示")}
        </span>
        <small>
          {d.risk.level === "urgent"
            ? "预计交会 " + d.risk.ttcS?.toFixed(1) + " s"
            : outside
              ? "目标在视野外"
              : d.reason}
        </small>
      </div>
    );
  const x = anchor.x,
    y = anchor.y,
    scale = anchor.scale;
  const est = d.mode === "region",
    covered = (d.coverage ?? 0) > 0.5;
  const right = Math.min(w - 120, x + Math.min(w * 0.19, scale * 1.2 + 56)),
    lift = y - 33;
  const caution = d.risk.level === "caution" || d.risk.level === "urgent",
    ink = caution ? "#f7cc91" : "#d8f4ee";
  // Project footprint samples in metric space as well as the label anchor.
  const base = d.anchor,
    heading = s.track
      ? Math.atan2(s.track.velocity.east, s.track.velocity.north)
      : 0;
  const outline = Array.from({ length: 32 }, (_, i) => {
    const a = (i * Math.PI) / 16,
      side = (cfg.targetSize[0] / 2 + 0.12) * Math.cos(a),
      forward = (cfg.targetSize[2] / 2 + 0.17) * Math.sin(a);
    return project({
      east:
        base.east +
        Math.cos(heading) * side +
        Math.sin(heading) * forward +
        (est ? (d.sigmaM ?? 0) * Math.cos(a) : 0),
      north:
        base.north - Math.sin(heading) * side + Math.cos(heading) * forward,
      up: 0.09,
    });
  });
  const contour = outline.every((p) => p !== null)
    ? outline
        .map(
          (p, i) => (i ? "L" : "M") + p!.x.toFixed(2) + "," + p!.y.toFixed(2),
        )
        .join(" ") + " Z"
    : "";
  const carW = scale * cfg.targetSize[0];
  return (
    <svg
      className="hud spatial"
      data-policy={d.policy}
      data-risk={d.risk.level}
      data-mode={d.mode}
      data-anchor={x.toFixed(3)}
      data-anchor-y={y.toFixed(3)}
      data-coverage={d.coverage?.toFixed(3)}
      viewBox={`0 0 ${w} ${h}`}
      style={{ color: ink }}
    >
      <g key={d.mode} className="hudIn">
        <g className="anchorRing">
          <path
            d={contour}
            fill={est ? "currentColor" : "none"}
            fillOpacity=".18"
            stroke="currentColor"
            strokeDasharray={est ? "4 5" : "none"}
            opacity={est ? 0.94 : 0.68}
          />
        </g>
        <path
          className="calloutLine"
          d={`M${x + carW * 0.55},${y - 2} Q${x + carW * 0.55 + 7},${y - 2} ${right - 18},${lift + 4} L${right - 5},${lift + 4}`}
        />
        <g className="calloutText">
          <text x={right} y={lift + 5}>
            {est
              ? "位置估计"
              : s.scenario === "cross"
                ? "横向来车"
                : covered
                  ? "遮挡车辆"
                  : d.occlusion === "truck"
                    ? "部分遮挡"
                    : "前方车辆"}
          </text>
          <text className="measure" x={right} y={lift + 22}>
            {Math.hypot(
              d.anchor.east - s.ego.position.east,
              d.anchor.north - s.ego.position.north,
            ).toFixed(0)}{" "}
            m
            {d.risk.level === "urgent"
              ? "　预计交会 " + d.risk.ttcS?.toFixed(1) + " s"
              : caution
                ? "　接近中"
                : ""}
          </text>
        </g>
      </g>
    </svg>
  );
}
