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
    const wordEdge =
      530 -
      ctx.measureText("CAN’T SEE.").width / 2 +
      ctx.measureText("CAN’T ").width;
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const stride = low ? 6 : 3;
    const seeds: number[] = [];
    const modes: number[] = [];
    for (let y = 0; y < canvas.height; y += stride) {
      for (let x = 0; x < canvas.width; x += stride) {
        const coverage = pixels[(y * canvas.width + x) * 4 + 3] / 255;
        if (coverage > 0.24) {
          seeds.push((x - 530) / 495, (166 - y) / 495, coverage);
          // Distance to the nearest blank along the glyph surface sets the peel order.
          let inset = 18;
          for (let d = 3; d <= 18; d += 3) {
            if (
              [
                [d, 0],
                [-d, 0],
                [0, d],
                [0, -d],
              ].some(
                ([dx, dy]) =>
                  (pixels[((y + dy) * canvas.width + x + dx) * 4 + 3] ?? 0) <
                  100,
              )
            ) {
              inset = d;
              break;
            }
          }
          modes.push(+(y > 164 && x > wordEdge), inset / 18);
        }
      }
    }
    const geom = new T.InstancedBufferGeometry().copy(
      new T.BoxGeometry() as unknown as T.InstancedBufferGeometry,
    );
    geom.setAttribute(
      "seed",
      new T.InstancedBufferAttribute(new Float32Array(seeds), 3),
    );
    geom.setAttribute(
      "glyph",
      new T.InstancedBufferAttribute(new Float32Array(modes), 2),
    );
    geom.instanceCount = seeds.length / 3;
    const material = new T.ShaderMaterial({
      uniforms: {
        seconds: { value: 0 },
        cell: { value: stride / 495 },
        low: { value: +low },
      },
      vertexShader: `
        attribute vec3 seed; attribute vec2 glyph;
        uniform float seconds,cell,low;
        varying vec3 tone;
        void main(){
          vec2 origin=seed.xy;
          float hash=fract(sin(dot(origin,vec2(145.17,73.51)))*4385.17);
          float focus=smoothstep(.25,2.3,seconds);
          float band=floor(origin.y*18.)/18.;
          float start=mix(2.8+1.65*(origin.x+.86),3.6+1.8*glyph.y+1.0*origin.x,glyph.x)+hash*.28;
          float u=smoothstep(start,start+3.9,seconds);
          vec3 p=vec3(origin,-1.17);
          p.z+=glyph.x*.045*focus*(1.-u);
          p.xy=mix(origin,vec2(.01,.055),u);
          p.y+=sin(u*3.1416)*(.11+band*.30);
          p.x+=sin(u*3.1416)*(.065+band*.18);
          p.z-=u*(1.+u*(4.+2.*hash));
          float theta=u*(2.1+3.*hash);
          vec3 local=position*vec3(cell*1.02,cell*1.02,.017)*(1.-u);
          local.xz=mat2(cos(theta),-sin(theta),sin(theta),cos(theta))*local.xz;
          if(low>.5) {p=vec3(origin,-1.17); local*=1.-smoothstep(.02,.55,u);}
          vec4 mv=modelViewMatrix*vec4(p+local,1.);
          gl_Position=projectionMatrix*mv;
          float highlight=.5+.5*sin(3.6*origin.x+1.8*origin.y-seconds*.20);
          float light=.57+.35*normal.z+.12*normal.y;
          tone=mix(vec3(.57,.63,.61),vec3(.99,.97,.86),highlight)*light*mix(.65,1.,seed.z);
          tone*=mix(1.,mix(.44,1.24,glyph.x),focus);
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
