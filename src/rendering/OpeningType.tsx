// The title uses a 1000 × 380 layout. The WebGL counter and the typeset words
// share the same fitting rule in story.css. Screen UVs always sample the live road.
const sculpture = import.meta.env.DEV && new URLSearchParams(location.search).get("type") === "sculpture";
export const apertureShader = `
float glyph(vec2 p){
  float outside=length(p*vec2(1.02,1.)) - 1.;
  float counter=length((p-vec2(.14,-.025))*vec2(1.20,1.09)) - 1.;
  float cut=min(p.x-.32,p.x*.50-abs(p.y+.03));
  return max(max(outside,-counter*.82),cut);
}
` + (sculpture ? `
float solid(vec3 p) {
  vec2 d=vec2(glyph(p.xy),abs(p.z)-.17);
  return min(max(d.x,d.y),0.)+length(max(d,0.))-.018;
}
vec4 sculpt(vec2 p,float t){
  float angle=-.42+.98*smoothstep(.6,6.8,t);
  mat2 yaw=mat2(cos(angle),sin(angle),-sin(angle),cos(angle));
  vec3 ro=vec3(p,2.8),rd=normalize(vec3(p*.09,-1.));
  ro.xz=yaw*ro.xz; rd.xz=yaw*rd.xz;
  float travel=0.;
  for(int i=0;i<52;i++){float h=solid(ro+rd*travel); if(h<.001 || travel>5.)break; travel+=h*.78;}
  vec3 hit=ro+rd*travel;
  if(solid(hit)>.004)return vec4(0.);
  vec2 e=vec2(.001,0.);
  vec3 n=normalize(vec3(solid(hit+e.xyy)-solid(hit-e.xyy),solid(hit+e.yxy)-solid(hit-e.yxy),solid(hit+e.yyx)-solid(hit-e.yyx)));
  float lit=max(0.,dot(n,normalize(vec3(-.48,-.58,.7))));
  return vec4(vec3(.76,.77,.72)*(.23+.83*lit)+.25*pow(max(0.,dot(reflect(rd,n),normalize(vec3(-.48,-.58,.7)))),22.),1.);
}
` : "") + `
vec3 openingFrame(vec3 road, vec2 uv, float aspect, float seconds){
  float reveal=smoothstep(2.,8.7,seconds);
  float scale=exp2(4.85*reveal);
  vec2 stage=(uv-vec2(.5,.55))*vec2(aspect,-1.)*1000./min(.8*aspect,1.39)+vec2(500.,190.);
  vec2 center=mix(vec2(171.,246.),vec2(487.,191.),smoothstep(.9,6.6,seconds));
  vec2 p=(stage-center)/(78.*scale);
  float edge=glyph(p),aa=max(fwidth(edge),.0008);
  float ink=1.-smoothstep(-aa,aa,edge);
  float hole=length((p-vec2(.14,-.025))*vec2(1.20,1.09));
  float windowMask=(1.-smoothstep(.997,1.003,hole))*smoothstep(.95,3.9,seconds);
  float pool=exp(-1.7*length((uv-vec2(.38,.6))*vec2(aspect,.92)));
  vec3 paper=vec3(.009,.014,.014)+vec3(.016,.023,.023)*pool;
  vec3 image=mix(paper,road,windowMask);
  vec3 enamel=mix(vec3(.45,.50,.48),vec3(.99,.94,.80),.5+.5*sin(-2.6*p.x+.91*p.y+.21*seconds));
  enamel+=.14*exp(-abs(edge+.018)*70.);
  ` + (sculpture ? `vec4 ceramic=sculpt(p,seconds);image=mix(image,ceramic.rgb,ceramic.a);` : `image=mix(image,enamel,ink);`) + `
  // Three slivers shed at the open terminals and recede toward the vanishing point.
  for(int i=0;i<3;i++){
    float j=float(i),t=smoothstep(2.8+j*.24,5.9+j*.27,seconds);
    vec2 origin=center+vec2(.76,(j-1.)*.30)*78.*scale;
    vec2 loc=mix(origin,vec2(505.,180.),t);
    vec2 chip=(stage-loc)/max(.01,(1.-t)*sin(t*3.14159));
    float d=abs(chip.x)*.48+abs(chip.y+chip.x*.24)*2.;
    image=mix(image,enamel,(1.-smoothstep(2.5,3.8,d))*(1.-t));
  }
  return mix(image,road,smoothstep(7.9,9.1,seconds));
}`;
