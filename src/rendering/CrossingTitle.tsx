import { useLayoutEffect, useMemo } from "react";
import * as T from "three";
import { junction } from "../data/scenarios";

// A film title on the far side of the intersection. The approaching car writes
// ordinary scene depth in front of the glyphs. This plane is absent in Live Lab.
export function CrossingTitle({ opacity }: { opacity: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 192;
    const ctx = canvas.getContext("2d")!;
    ctx.font = "italic 155px Georgia, serif";
    ctx.textAlign = "center";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#415048";
    ctx.fillStyle = "#f3f0de";
    ctx.strokeText("In view.", 512, 146);
    ctx.fillText("In view.", 512, 146);
    const t = new T.CanvasTexture(canvas);
    t.colorSpace = T.SRGBColorSpace;
    return t;
  }, []);
  useLayoutEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh visible={opacity > 0} position={[0.25, 1.12, -junction.north - 2.7]}>
      <planeGeometry args={[7.1, 1.34]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={opacity}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
