import * as T from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
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
    new RoundedBoxGeometry(0.407, 0.189, 0.025, 3, 0.009),
    new T.MeshStandardMaterial({
      color: "#474a48",
      metalness: 0.73,
      roughness: 0.26,
    }),
  );
  panel.position.set(0.36, -0.295, -0.78);
  panel.rotation.set(-0.16, -0.21, 0, "YXZ");
  const pedestal = new T.Mesh(
    new RoundedBoxGeometry(0.24, 0.092, 0.053, 2, 0.014),
    new T.MeshStandardMaterial({ color: "#282d30", roughness: 0.57 }),
  );
  pedestal.position.set(0, -0.121, -0.018);
  panel.add(pedestal);
  const fascia = new T.Mesh(
    new RoundedBoxGeometry(0.403, 0.185, 0.009, 2, 0.006),
    new T.MeshPhysicalMaterial({
      color: "#101415",
      roughness: 0.16,
      clearcoat: 1,
    }),
  );
  fascia.position.z = 0.011;
  panel.add(fascia);
  const display = new T.Mesh(
    new T.PlaneGeometry(0.388, 0.17),
    new T.MeshBasicMaterial({ map, toneMapped: false }),
  );
  display.position.z = 0.016;
  const cover = new T.Mesh(
    new T.PlaneGeometry(0.392, 0.173),
    new T.MeshPhysicalMaterial({
      color: "#d4dad9",
      metalness: 0.62,
      roughness: 0.16,
      transparent: true,
      opacity: 0.055,
      depthWrite: false,
    }),
  );
  cover.position.z = 0.017;
  panel.add(cover);
  panel.add(display);
  let last = "";
  function update(s: SceneState, active: boolean) {
    panel.visible = active;
    if (!active) return;
    const key = s.time.toFixed(2) + s.decision.policy;
    if (key === last) return;
    last = key;
    ctx.fillStyle = "#d9d8cb";
    ctx.fillRect(0, 0, 832, 364);
    const origin = { x: 248, y: 272 },
      factor = 3.8;
    const loc = (p: { east: number; north: number }) => [
      origin.x + (p.east - s.ego.position.east) * factor,
      origin.y - (p.north - s.ego.position.north) * factor,
    ];
    ctx.fillStyle = "#bfc3b9";
    for (let y = -20; y < 364; y += 69)
      for (let x = 12; x < 468; x += 88) {
        ctx.beginPath();
        ctx.roundRect(x, y, 71, 49, 6);
        ctx.fill();
      }
    const cross = loc({ east: 0, north: 90 })[1];
    ctx.fillStyle = "#758380";
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
    dot(...(loc(s.ego.position) as [number, number]), "#124d4e");
    if (s.track) {
      const [x, y] = loc(s.track.position);
      dot(x, y, "#f1b66c");
    }
    ctx.fillStyle = "#263c38";
    ctx.font = "25px sans-serif";
    ctx.fillText("交叉口", 24, 46);
    ctx.fillText("本车", origin.x + 16, origin.y - 5);
    ctx.fillStyle = "#262f31";
    ctx.fillRect(468, 0, 364, 364);
    ctx.font = "24px sans-serif";
    ctx.fillStyle = "#d6d9c9";
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
