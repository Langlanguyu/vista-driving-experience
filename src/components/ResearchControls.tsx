import type { OpticalSettings } from "../rendering/OpticalAssembly";
export function Dial({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit = "",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  unit?: string;
}) {
  return (
    <label className="labDial">
      <span>
        {label}
        <output>
          {Number(value.toFixed(2))} {unit}
        </output>
      </span>
      <input
        aria-label={label}
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(+e.target.value)}
      />
    </label>
  );
}
export function OpticalControls({
  o,
  set,
  close,
}: {
  o: OpticalSettings;
  set: (o: OpticalSettings) => void;
  close: () => void;
}) {
  const update = <K extends keyof OpticalSettings>(
    key: K,
    value: OpticalSettings[K],
  ) => set({ ...o, [key]: value });
  return (
    <aside className="opticalControls">
      <div>
        <h2>光学实验</h2>
        <button onClick={close} aria-label="退出光学实验">
          ×
        </button>
      </div>
      <p>转动剖面，沿连续光线查看反射路径。虚线连接到估计虚像。</p>
      <Dial
        label="观察方位"
        min={-65}
        max={125}
        step={1}
        unit="°"
        value={(o.orbit * 180) / Math.PI}
        onChange={(v) => update("orbit", (v * Math.PI) / 180)}
      />
      <Dial
        label="眼点横移"
        min={-85}
        max={85}
        step={1}
        value={o.eyeX * 1000}
        unit="mm"
        onChange={(v) => update("eyeX", v / 1000)}
      />
      <details className="opticsAdvanced"><summary>光路与设计参数</summary>
      <Dial
        label="等效设计距离"
        min={3}
        max={14}
        step={0.25}
        value={o.vid}
        unit="m"
        onChange={(v) => update("vid", v)}
      />
      <Dial
        label="眼点升降"
        min={-40}
        max={40}
        step={1}
        value={o.eyeY * 1000}
        unit="mm"
        onChange={(v) => update("eyeY", v / 1000)}
      />
      <div className="opticalSwitches">
        {(
          [
            ["section", "技术剖面"],
            ["overview", "全光路远景"],
            ["rays", "传播光线"],
            ["extensions", "虚像延长线"],
            ["hardware", "光学组件"],
            ["flat", "平面主镜"],
          ] as const
        ).map(([key, name]) => (
          <button
            key={key}
            aria-pressed={o[key]}
            onClick={() => update(key, !o[key])}
          >
            {name}
          </button>
        ))}
      </div>
      </details>
    </aside>
  );
}
