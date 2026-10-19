export type TransmissionMode = 'automatic' | 'manual';
export type AutomaticGear = 'P' | 'R' | 'N' | 'D';
export type CameraMode = 'chase' | 'cockpit' | 'overhead';
export type GameMode = 'free_drive' | 'driving_school' | 'parking_challenge' | 'time_trial' | 'traffic_practice';
export type UnitSystem = 'kmh' | 'mph';
export type GraphicsQuality = 'low' | 'medium' | 'high';

export interface VehicleInputs {
  throttle: number; // 0 to 1
  brake: number; // 0 to 1
  steering: number; // -1 (full left) to 1 (full right)
  handbrake: boolean;
  reverse: boolean;
}

export interface VehicleState {
  speedKmh: number; // current speed in km/h
  speedMph: number;
  rpm: number; // engine RPM (idle ~850 to 7500 redline)
  gear: AutomaticGear | number; // Automatic: 'P' | 'R' | 'N' | 'D', Manual: 1-5 or -1 (R)
  actualGearRatio: number;
  isEngineOn: boolean;
  headlightsOn: boolean;
  leftBlinker: boolean;
  rightBlinker: boolean;
  hazardLights: boolean;
  fuelPercent: number; // 0 to 100
  distanceTraveledKm: number;
  throttlePercent: number;
  brakePercent: number;
  isBraking: boolean;
  isReversing: boolean;
  steerAngleVisualDeg: number; // -180 to 180 for wheel
  wheelTurnDeg: number; // front wheel yaw
  collisionImpulse: number;
  lastCollisionTime: number;
  engineTemperature: number; // 90°C normal
}

export interface GameSettings {
  graphics: GraphicsQuality;
  units: UnitSystem;
  transmission: TransmissionMode;
  soundVolume: number; // 0 to 1
  steeringSensitivity: number; // 0.5 to 2.0
  steeringReturnStrength: number; // 0.5 to 2.0
  touchSteeringWheelScale: number; // 0.8 to 1.3
  drivingAssistance: boolean; // ABS + stability control
  invertTilt: boolean;
  timeOfDay: 'day' | 'sunset' | 'night';
}

export interface Checkpoint {
  id: number;
  position: [number, number, number];
  radius: number;
  passed: boolean;
  name?: string;
}

export interface ParkingBay {
  id: string;
  name: string;
  position: [number, number, number];
  rotationY: number; // target vehicle orientation in radians
  size: [number, number]; // width x length
  type: 'bay90' | 'parallel' | 'angled';
}

export interface ChallengeObjective {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  progressText?: string;
}

export interface TrafficCar {
  id: number;
  meshIndex: number;
  x: number;
  z: number;
  speed: number;
  targetSpeed: number;
  lane: number;
  angle: number;
  color: string;
}
