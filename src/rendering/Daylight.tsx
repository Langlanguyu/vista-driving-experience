import { useMemo } from "react";
import { useTexture } from "@react-three/drei";
import * as T from "three";
import { assetUrl } from "../utils/assetUrl";

const profiles = {
  natural: { zenith: "#407bbc", horizon: "#cbdce6", clouds: .12, density: .0021, sun: 1.85, ambient: .62 },
  automotive: { zenith: "#2876bc", horizon: "#c1dded", clouds: .22, density: .00165, sun: 2.15, ambient: .68 },
  cinema: { zenith: "#20539b", horizon: "#aacee9", clouds: .32, density: .0013, sun: 1.95, ambient: .5 },
};
const requested = import.meta.env.DEV ? new URLSearchParams(location.search).get("sky") : null;
export const daylight = requested === "cinema" || requested === "natural" ? profiles[requested] : profiles.automotive;

// Red stores photographic cloud coverage, green stores its measured HDR brightness.
// Only the upper hemisphere is sampled. The original HDR lights the world.
export function Daylight({ fog, north }: { fog: number; north: number }) {
  const map = useTexture(assetUrl("daylight-clouds.webp"));
  const uniforms = useMemo(() => ({
    clouds: { value: map }, zenith: { value: new T.Color(daylight.zenith) },
    horizon: { value: new T.Color(daylight.horizon) }, threshold: { value: daylight.clouds },
    mist: { value: 0 },
  }), [map]);
  uniforms.mist.value = fog;
  return <mesh position={[0, 0, -north]} renderOrder={-100}>
    <sphereGeometry args={[680, 48, 24]} />
    <shaderMaterial side={T.BackSide} depthWrite={false} uniforms={uniforms}
      vertexShader={`varying vec3 dir;
        void main(){dir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`}
      fragmentShader={`varying vec3 dir; uniform sampler2D clouds; uniform vec3 zenith,horizon; uniform float threshold,mist;
        void main(){
          vec3 d=normalize(dir);
          float altitude=asin(clamp(d.y,0.,1.));
          vec2 uv=vec2(atan(d.z,d.x)/6.2831853+.5,altitude/1.5707963);
          vec2 photo=texture2D(clouds,uv).rg;
          vec3 sky=mix(horizon,zenith,1.-exp(-altitude*5.8));
          float cloud=smoothstep(threshold,.85,photo.r)*smoothstep(.015,.09,altitude);
          vec3 radiance=mix(sky, mix(vec3(.46,.54,.65),vec3(1.45,1.48,1.47),photo.g),cloud);
          float sun=max(0.,dot(d,normalize(vec3(.537,.745,.390))));
          radiance+=vec3(1.,.90,.72)*(.14*pow(sun,18.)+4.*smoothstep(.99986,.99996,sun));
          gl_FragColor=vec4(mix(radiance,vec3(.52,.60,.62),smoothstep(0.,.8,mist)),1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`} />
  </mesh>;
}
