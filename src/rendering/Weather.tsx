import { useEffect, useMemo } from "react";
import * as T from "three";
import type { SceneState } from "../domain/types";
// Sparse rain streaks advect through a deterministic world-space volume; a seek
// restores exactly the same drops. The near field and the horizon share fog color.
export function Weather({ s }: { s: SceneState }) {
  const drops = useMemo(() => {
    const xyz = new Float32Array(230 * 6);
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.BufferAttribute(xyz, 3));
    const mat = new T.LineBasicMaterial({
      color: "#9eafb6",
      transparent: true,
      depthWrite: false,
    });
    const lines = new T.LineSegments(geo, mat);
    lines.frustumCulled = false;
    return lines;
  }, []);
  useEffect(
    () => () => {
      drops.geometry.dispose();
      drops.material.dispose();
    },
    [drops],
  );
  const arr = drops.geometry.attributes.position;
  const noise = (i: number) => {
    const v = Math.sin(i * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  for (let i = 0; i < arr.count / 2; i++) {
    const n = s.ego.position.north,
      z = (-(((noise(i + 28) * 32 - n) % 32) + 32) % 32) - n;
    const y = (((noise(2 * i + 82) * 9 - s.time * 8) % 9) + 9) % 9;
    const x = (noise(3 * i + 19) - 0.5) * 25 + 0.04 * y;
    arr.setXYZ(2 * i, x, y, z);
    arr.setXYZ(2 * i + 1, x + 0.008, y + 0.14, z);
  }
  arr.needsUpdate = true;
  drops.material.opacity = 0.17 * s.fog;
  return (
    <>
      <mesh position={[0, 0, -s.ego.position.north]} renderOrder={-10}>
        <sphereGeometry args={[580, 32, 16]} />
        <shaderMaterial
          side={T.BackSide}
          transparent
          depthWrite={false}
          uniforms={{ mist: { value: s.fog } }}
          vertexShader={
            "varying float alt;void main(){alt=normalize(position).y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}"
          }
          fragmentShader={`varying float alt;uniform float mist;
        void main(){vec3 sky=mix(vec3(.46,.53,.55),vec3(.27,.33,.38),smoothstep(0.,.85,alt));
        gl_FragColor=vec4(sky,mist*.96);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        }`}
        />
      </mesh>
      <primitive object={drops} />
    </>
  );
}
