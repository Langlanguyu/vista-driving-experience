export const scenarios = {
  truck: { name: "前车遮挡", english: "Truck Occlusion", cue: 2.4 },
  cross: { name: "横向来车", english: "Cross Traffic", cue: 3.2 },
  degraded: { name: "感知衰减", english: "Degraded Perception", cue: 4.2 },
} as const;
export type Scenario = keyof typeof scenarios;
export type Side = "left" | "right";
export const junction = {
  north: 90,
  width: 14,
  cornerEast: -20,
  cornerWidth: 15,
  cornerDepth: 18,
};
export function fogLoad(t: number) {
  const u = Math.min(1, Math.max(0, (t - 1) / 4), Math.max(0, 11 - t) / 3);
  return u * u * (3 - 2 * u);
}
