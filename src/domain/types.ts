import type { Scenario, Side } from "../data/scenarios";
// Local ENU frame. Distances in metres, times in simulation seconds, angles in radians.
export interface ObjectPosition {
  east: number;
  north: number;
  up: number;
}
export type ObjectVelocity = ObjectPosition;
export type ObjectSource = "RSU-01" | "onboard";
export type OcclusionState = "visible" | "truck" | "building";
export type Level = "high" | "medium" | "low";
export interface PositionUncertainty {
  lateralSigmaM: number;
}
export interface PerceptionQuality {
  stability: number;
  existence: number;
  classification: number;
  uncertainty: PositionUncertainty;
}
export interface TrackedObject {
  id: string;
  category: "vehicle";
  source: ObjectSource;
  position: ObjectPosition;
  velocity: ObjectVelocity;
  capturedAt: number;
  receivedAt: number;
  quality: PerceptionQuality;
}
export interface EgoVehicle {
  position: ObjectPosition;
  velocity: ObjectVelocity;
}
export interface CameraPose {
  eye: ObjectPosition;
  yaw: number;
  pitch: number;
  verticalFov: number;
}
export interface NetworkState {
  latencyMs: number;
  outage: boolean;
  communicationAge: number | null;
}
export interface RiskAssessment {
  level: "unknown" | "monitor" | "caution" | "urgent";
  ttcS: number | null;
}
export type WeatherState = "clear" | "rain" | "fog" | "backlight";
export interface HUDDisplayDecision {
  id: string;
  policy: DisplayState;
  mode: "none" | "world" | "region" | "direction" | "unavailable";
  status: "确认" | "估计" | "降级" | "不可用" | "无提示";
  anchor: ObjectPosition | null;
  direction: "左前方" | "前方" | "右前方" | "后方";
  reason: string;
  occlusion: OcclusionState | null;
  coverage: number | null;
  risk: RiskAssessment;
  sigmaM: number | null;
}
export type DisplayState =
  | "CONFIRMED_TARGET"
  | "ESTIMATED_TARGET"
  | "DIRECTION_ONLY"
  | "PERCEPTION_LIMITED"
  | "NO_WARNING";
export interface SceneState {
  scenario: Scenario;
  side: Side;
  fog: number;
  sensorVisibility: number;
  targetHeading: number;
  time: number;
  ego: EgoVehicle;
  camera: CameraPose;
  weather: WeatherState;
  network: NetworkState;
  truth: { truck: ObjectPosition; target: ObjectPosition };
  track: TrackedObject | null;
  decision: HUDDisplayDecision;
}
