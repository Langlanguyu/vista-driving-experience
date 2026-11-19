import * as T from "three";
import type { SceneState } from "../domain/types";
// A physical center display in driver-local coordinates. Traffic positions use ENU metres.
export function centerDisplay() {
  const canvas = document.createElement("canvas");
  canvas.width = 832;
  canvas.height = 364;
  const ctx = canvas.getContext("2d")!,
    map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  const panel = new T.Mesh(
    new T.BoxGeometry(0.4, 0.181, 0.018),
    new T.MeshStandardMaterial({ color: "#283238", roughness: 0.34 }),
  );
  panel.position.set(0.36, -0.295, -0.78);
  panel.rotation.set(-0.16, -0.21, 0, "YXZ");
  const display = new T.Mesh(
    new T.PlaneGeometry(0.388, 0.17),
    new T.MeshBasicMaterial({ map, toneMapped: false }),
  );
  display.position.z = 0.01;
  panel.add(display);
  let last = "";
  function update(s: SceneState, active: boolean) {
    panel.visible = active;
    if (!active) return;
    const key = s.time.toFixed(2) + s.decision.policy;
    if (key === last) return;
    last = key;
    ctx.fillStyle = "#122529";
    ctx.fillRect(0, 0, 832, 364);
    const origin = { x: 248, y: 272 },
      factor = 3.8;
    const loc = (p: { east: number; north: number }) => [
      origin.x + (p.east - s.ego.position.east) * factor,
      origin.y - (p.north - s.ego.position.north) * factor,
    ];
    const cross = loc({ east: 0, north: 90 })[1];
    ctx.fillStyle = "#415451";
    ctx.fillRect(222, 0, 42, 364);
    ctx.fillRect(0, cross - 12, 468, 24);
    ctx.setLineDash([12, 9]);
    ctx.strokeStyle = "#95a499";
    ctx.beginPath();
    ctx.moveTo(244, 0);
    ctx.lineTo(244, 364);
    ctx.moveTo(0, cross);
    ctx.lineTo(468, cross);
    ctx.stroke();
    ctx.setLineDash([]);
    function dot(x: number, y: number, col: string) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, 2 * Math.PI);
      ctx.fill();
    }
    dot(...(loc(s.ego.position) as [number, number]), "#a9e4ce");
    if (s.track) {
      const [x, y] = loc(s.track.position);
      dot(x, y, "#f1b66c");
    }
    ctx.fillStyle = "#b5c9b5";
    ctx.font = "25px sans-serif";
    ctx.fillText("交叉口", 24, 46);
    ctx.fillText("本车", origin.x + 16, origin.y - 5);
    ctx.fillStyle = "#0e1c20";
    ctx.fillRect(468, 0, 364, 364);
    ctx.font = "24px sans-serif";
    ctx.fillStyle = "#a5bcae";
    ctx.fillText((s.track?.source ?? "V2X") + "   /   路侧协同", 490, 62);
    ctx.font = "bold 42px sans-serif";
    ctx.fillStyle = "#f0e9d7";
    ctx.fillText(s.track ? "横向来车" : "观测受限", 490, 142);
    ctx.font = "25px sans-serif";
    ctx.fillText(
      s.decision.direction + "   " + s.decision.risk.level.toUpperCase(),
      490,
      210,
    );
    ctx.fillText(
      "观测年龄  " +
        Math.round((s.network.communicationAge ?? 0) * 1000) +
        " ms",
      490,
      278,
    );
    map.needsUpdate = true;
  }
  return { panel, update };
}
