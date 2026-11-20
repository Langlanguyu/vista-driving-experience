import { useLayoutEffect, useMemo } from "react";
import * as T from "three";

// Sample coverage once. Every shard retains its place in the type and follows
// the same reversible flight path whenever the director samples that second.
export function OpeningType({
  seconds,
  low,
}: {
  seconds: number;
  low: boolean;
}) {
  const model = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1060;
    canvas.height = 332;
    const ctx = canvas.getContext("2d")!;
    ctx.font = '900 158px "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("WHAT YOU", 530, 151);
    ctx.fillText("CAN’T SEE.", 530, 299);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const stride = low ? 6 : 3;
    const seeds: number[] = [];
    for (let y = 0; y < canvas.height; y += stride) {
      for (let x = 0; x < canvas.width; x += stride) {
        const coverage = pixels[(y * canvas.width + x) * 4 + 3] / 255;
        if (coverage > 0.24)
          seeds.push((x - 530) / 495, (166 - y) / 495, coverage);
      }
    }
    const geom = new T.InstancedBufferGeometry().copy(
      new T.BoxGeometry() as unknown as T.InstancedBufferGeometry,
    );
    geom.setAttribute(
      "seed",
      new T.InstancedBufferAttribute(new Float32Array(seeds), 3),
    );
    geom.instanceCount = seeds.length / 3;
    const material = new T.ShaderMaterial({
      uniforms: {
        seconds: { value: 0 },
        cell: { value: stride / 495 },
        low: { value: +low },
      },
      vertexShader: `
        attribute vec3 seed;
        uniform float seconds,cell,low;
        varying vec3 tone;
        void main(){
          vec2 origin=seed.xy;
          float hash=fract(sin(dot(origin,vec2(145.17,73.51)))*4385.17);
          float start=3.0+2.8*(.5+.45*origin.x)+.65*sin(6.*origin.y+4.*origin.x)+.7*hash;
          float u=smoothstep(start,start+4.6,seconds);
          vec3 p=vec3(origin,-1.17);
          p.xy*=1.-.85*u;
          p.xy+=sin(vec2(11.*u+origin.y*12.,7.*u+origin.x*6.))*u*(1.-u)*.48;
          p.z-=u*u*(2.+10.*hash);
          float theta=u*(5.+8.*hash);
          vec3 local=position*vec3(cell*1.02,cell*1.02,.017)*(1.-u);
          local.xz=mat2(cos(theta),-sin(theta),sin(theta),cos(theta))*local.xz;
          if(low>.5) {p=vec3(origin,-1.17); local*=1.-smoothstep(.02,.55,u);}
          vec4 mv=modelViewMatrix*vec4(p+local,1.);
          gl_Position=projectionMatrix*mv;
          float highlight=.5+.5*sin(3.6*origin.x+1.8*origin.y-seconds*.20);
          float light=.57+.35*normal.z+.12*normal.y;
          tone=mix(vec3(.57,.63,.61),vec3(.99,.97,.86),highlight)*light*mix(.65,1.,seed.z);
        }`,
      fragmentShader: `varying vec3 tone;void main(){gl_FragColor=vec4(tone,1.);}`,
    });
    const mesh = new T.Mesh(geom, material);
    mesh.frustumCulled = false;
    return mesh;
  }, [low]);
  useLayoutEffect(
    () => () => {
      model.geometry.dispose();
      model.material.dispose();
    },
    [model],
  );
  model.material.uniforms.seconds.value = seconds;
  return <primitive object={model} />;
}
