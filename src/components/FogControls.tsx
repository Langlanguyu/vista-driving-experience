import type { Controls } from "../scenes/corridor";
import type { SceneState } from "../domain/types";
export function FogControls({
  opts,
  s,
  set,
}: {
  opts: Controls;
  s: SceneState;
  set: <K extends keyof Controls>(k: K, v: Controls[K]) => void;
}) {
  return (
    <fieldset className="fogControls">
      <legend>雾区输入</legend>
      <label>
        <input
          type="checkbox"
          checked={opts.fogOverride === null}
          onChange={(e) => set("fogOverride", e.target.checked ? null : s.fog)}
        />
        雾浓度随片段
      </label>
      <label className="param">
        雾浓度 <b>{Math.round(s.fog * 100)}%</b>
        <input
          aria-label="雾浓度"
          type="range"
          min="0"
          max="1"
          step=".01"
          value={s.fog}
          onChange={(e) => set("fogOverride", +e.target.value)}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={opts.linkTimeline}
          onChange={(e) => set("linkTimeline", e.target.checked)}
        />
        注入 V2X 拥塞与丢包
      </label>
      {(["existenceOverride", "stabilityOverride"] as const).map((key, i) => {
        const label = i ? "跟踪稳定性" : "存在可信度";
        return (
          <label key={key} className="setting">
            {label}
            <select
              aria-label={label}
              value={opts[key] ?? "auto"}
              onChange={(e) =>
                set(
                  key,
                  e.target.value === "auto" ? null : Number(e.target.value),
                )
              }
            >
              <option value="auto">随观测</option>
              {[0.95, 0.65, 0.35, 0.2].map((v) => (
                <option key={v} value={v}>
                  {v.toFixed(2)}
                </option>
              ))}
            </select>
          </label>
        );
      })}
    </fieldset>
  );
}
export function PerceptionReadout({ s }: { s: SceneState }) {
  const q = s.track?.quality,
    age = s.network.communicationAge;
  return (
    <aside
      className="evidenceBar"
      aria-label="雾区感知依据"
      data-policy={s.decision.policy}
    >
      <strong>{s.decision.status}</strong>
      <span>
        相机能见度 <b>{Math.round(100 * s.sensorVisibility)}%</b>
      </span>
      <span>
        横向 σ <b>{q ? q.uncertainty.lateralSigmaM.toFixed(2) + " m" : "—"}</b>
      </span>
      <span>
        消息年龄 <b>{age === null ? "—" : Math.round(age * 1000) + " ms"}</b>
      </span>
    </aside>
  );
}
