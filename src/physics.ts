import * as THREE from 'three';
import { AutomaticGear, GameSettings, TransmissionMode, VehicleInputs, VehicleState } from './types';
import { soundEngine } from './audio';

export interface CollisionObstacle {
  id: string;
  type: 'box' | 'cylinder';
  position: THREE.Vector3;
  size: THREE.Vector3; // for box: width, height, length; for cylinder: radius, height, radius
  isDynamic?: boolean;
}

export class VehiclePhysics {
  // World Transform
  public position = new THREE.Vector3(0, 0, 0);
  public rotation = new THREE.Euler(0, 0, 0, 'YXZ');
  public quaternion = new THREE.Quaternion();

  // Velocities (local coordinates)
  public forwardSpeed = 0; // m/s
  public lateralSpeed = 0; // m/s
  public yawRate = 0; // rad/s
  public wheelSpinAngle = 0; // rad

  // Vehicle Parameters
  public readonly mass = 1450; // kg
  public readonly wheelbase = 2.65; // m
  public readonly trackWidth = 1.62; // m
  public readonly maxSteerAngleRad = THREE.MathUtils.degToRad(32); // max front wheel angle
  public readonly engineIdleRpm = 850;
  public readonly engineMaxRpm = 7500;
  public readonly topSpeedMs = 68; // ~245 km/h

  // Gear Ratios (Drive 1 to 6)
  public readonly gearRatiosAuto = [3.8, 2.3, 1.5, 1.1, 0.85, 0.68];
  public readonly gearRatiosManual = [3.6, 2.1, 1.4, 1.0, 0.75];
  public readonly reverseRatio = 3.4;
  public readonly finalDriveRatio = 3.65;

  // State
  public isEngineOn = true;
  public transmissionMode: TransmissionMode = 'automatic';
  public autoGear: AutomaticGear = 'P';
  public manualGear = 1; // 1 to 5, or -1 for reverse, 0 for neutral
  public currentAutoGearIndex = 0; // 0 to 5 (1st to 6th)
  public rpm = 850;
  public headlightsOn = false;
  public fuelPercent = 100;
  public distanceTraveledKm = 0;
  public lastCollisionTime = 0;
  public collisionImpulse = 0;

  // Suspension visual offsets
  public pitch = 0; // nose down/up
  public roll = 0; // body lean
  public steerAngleActual = 0; // current smoothed front wheel angle in radians
  public steerVisualDeg = 0; // steering wheel rotation (-180 to 180)

  // Collision boundaries
  public obstacles: CollisionObstacle[] = [];

  // Reusable math objects
  private _forward = new THREE.Vector3();
  private _right = new THREE.Vector3();
  private _up = new THREE.Vector3(0, 1, 0);

  constructor() {
    this.quaternion.setFromEuler(this.rotation);
  }

  public setPosition(x: number, y: number, z: number, headingRad: number = 0) {
    this.position.set(x, y, z);
    this.rotation.set(0, headingRad, 0);
    this.quaternion.setFromEuler(this.rotation);
    this.forwardSpeed = 0;
    this.lateralSpeed = 0;
    this.yawRate = 0;
    this.steerAngleActual = 0;
    this.steerVisualDeg = 0;
  }

  public resetTo(x: number, y: number, z: number, headingRad: number = 0) {
    this.setPosition(x, y, z, headingRad);
    this.rpm = this.isEngineOn ? this.engineIdleRpm : 0;
    this.collisionImpulse = 0;
  }

  public setGear(gear: AutomaticGear) {
    // Only allow shifting into P or R if vehicle is nearly stopped (< 5 km/h)
    const speedKmh = Math.abs(this.forwardSpeed * 3.6);
    if ((gear === 'P' || gear === 'R') && speedKmh > 5) {
      return false;
    }
    this.autoGear = gear;
    soundEngine.playGearShift();
    return true;
  }

  public shiftManualUp() {
    if (this.manualGear < 5) {
      this.manualGear++;
      soundEngine.playGearShift();
    }
  }

  public shiftManualDown() {
    if (this.manualGear > -1) {
      this.manualGear--;
      soundEngine.playGearShift();
    }
  }

  public update(dt: number, inputs: VehicleInputs, settings: GameSettings): VehicleState {
    const clampedDt = Math.min(dt, 0.05);

    // 1. ENGINE LOGIC & FUEL
    if (!this.isEngineOn) {
      this.rpm = THREE.MathUtils.damp(this.rpm, 0, 8, clampedDt);
      inputs.throttle = 0;
    } else {
      // Fuel consumption
      if (this.fuelPercent > 0) {
        this.fuelPercent -= (0.005 + inputs.throttle * 0.018) * clampedDt;
        if (this.fuelPercent <= 0) {
          this.fuelPercent = 0;
          this.isEngineOn = false;
          soundEngine.stopEngine();
        }
      }
    }

    // 2. STEERING HANDLING & SPEED SENSITIVITY
    // At higher speeds, reduce max steer angle for stability
    const absSpeed = Math.abs(this.forwardSpeed);
    const speedKmh = absSpeed * 3.6;
    const speedSteerFactor = 1.0 / (1.0 + absSpeed * 0.035);
    const targetSteerAngle = inputs.steering * this.maxSteerAngleRad * speedSteerFactor * settings.steeringSensitivity;

    // Smooth steering rate
    const steerSmoothingRate = 14 * settings.steeringSensitivity;
    this.steerAngleActual = THREE.MathUtils.damp(this.steerAngleActual, targetSteerAngle, steerSmoothingRate, clampedDt);

    // Visual steering wheel rotation (-180° to +180°)
    const targetSteerVisual = inputs.steering * 180;
    this.steerVisualDeg = THREE.MathUtils.damp(this.steerVisualDeg, targetSteerVisual, 18, clampedDt);

    // 3. POWERTRAIN & GEAR LOGIC
    let driveForce = 0;
    let brakeForce = 0;
    let inReverse = false;
    let gearRatio = 1.0;

    if (settings.transmission === 'automatic') {
      if (this.autoGear === 'P') {
        // Handbrake engaged in Park
        brakeForce = 8500;
        this.rpm = THREE.MathUtils.damp(this.rpm, this.engineIdleRpm + inputs.throttle * 4000, 10, clampedDt);
      } else if (this.autoGear === 'N') {
        // Free wheeling, engine revs
        brakeForce = inputs.brake * 6500;
        this.rpm = THREE.MathUtils.damp(this.rpm, this.engineIdleRpm + inputs.throttle * 5500, 12, clampedDt);
      } else if (this.autoGear === 'R') {
        inReverse = true;
        gearRatio = this.reverseRatio;
        const maxRevSpeed = 13.5; // ~48 km/h
        if (this.isEngineOn && inputs.throttle > 0 && this.forwardSpeed > -maxRevSpeed) {
          driveForce = -inputs.throttle * 5200;
        }
        brakeForce = inputs.brake * 7000;
        const targetRpm = this.engineIdleRpm + (Math.abs(this.forwardSpeed) / maxRevSpeed) * 4500 + inputs.throttle * 1200;
        this.rpm = THREE.MathUtils.damp(this.rpm, Math.min(this.engineMaxRpm, targetRpm), 9, clampedDt);
      } else if (this.autoGear === 'D') {
        // Automatic gear shifting (1st to 6th)
        if (speedKmh < 32) this.currentAutoGearIndex = 0;
        else if (speedKmh < 62) this.currentAutoGearIndex = 1;
        else if (speedKmh < 98) this.currentAutoGearIndex = 2;
        else if (speedKmh < 140) this.currentAutoGearIndex = 3;
        else if (speedKmh < 185) this.currentAutoGearIndex = 4;
        else this.currentAutoGearIndex = 5;

        gearRatio = this.gearRatiosAuto[this.currentAutoGearIndex];

        // Engine power curve based on gear and RPM
        if (this.isEngineOn && inputs.throttle > 0 && this.forwardSpeed < this.topSpeedMs) {
          const torqueMultiplier = Math.max(0.4, (gearRatio / 3.8));
          driveForce = inputs.throttle * 6800 * torqueMultiplier;
        }
        brakeForce = inputs.brake * 7500;

        // Calculate realistic RPM from speed and current gear
        const wheelRpm = (this.forwardSpeed / (Math.PI * 0.7)) * 60;
        const powertrainRpm = Math.abs(wheelRpm) * gearRatio * this.finalDriveRatio;
        const targetRpm = Math.max(this.engineIdleRpm, Math.min(this.engineMaxRpm, powertrainRpm + inputs.throttle * 1400));
        this.rpm = THREE.MathUtils.damp(this.rpm, targetRpm, 10, clampedDt);
      }
    } else {
      // MANUAL TRANSMISSION MODE
      if (this.manualGear === 0) {
        // Neutral
        brakeForce = inputs.brake * 6500;
        this.rpm = THREE.MathUtils.damp(this.rpm, this.engineIdleRpm + inputs.throttle * 5500, 12, clampedDt);
      } else if (this.manualGear === -1) {
        // Reverse
        inReverse = true;
        gearRatio = this.reverseRatio;
        const maxRevSpeed = 13.5;
        if (this.isEngineOn && inputs.throttle > 0 && this.forwardSpeed > -maxRevSpeed) {
          driveForce = -inputs.throttle * 5200;
        }
        brakeForce = inputs.brake * 7000;
        const targetRpm = this.engineIdleRpm + (Math.abs(this.forwardSpeed) / maxRevSpeed) * 4500 + inputs.throttle * 1200;
        this.rpm = THREE.MathUtils.damp(this.rpm, Math.min(this.engineMaxRpm, targetRpm), 9, clampedDt);
      } else {
        // Gears 1 to 5
        const gIdx = this.manualGear - 1;
        gearRatio = this.gearRatiosManual[gIdx];
        if (this.isEngineOn && inputs.throttle > 0 && this.forwardSpeed < this.topSpeedMs) {
          const torqueMultiplier = Math.max(0.35, (gearRatio / 3.6));
          driveForce = inputs.throttle * 7200 * torqueMultiplier;
        }
        brakeForce = inputs.brake * 7500;

        const wheelRpm = (this.forwardSpeed / (Math.PI * 0.7)) * 60;
        const powertrainRpm = Math.abs(wheelRpm) * gearRatio * this.finalDriveRatio;
        const targetRpm = Math.max(this.engineIdleRpm, Math.min(this.engineMaxRpm, powertrainRpm + inputs.throttle * 1500));
        this.rpm = THREE.MathUtils.damp(this.rpm, targetRpm, 12, clampedDt);
      }
    }

    if (inputs.handbrake) {
      brakeForce += 9000;
    }

    // 4. RESISTANCE FORCES
    // Rolling resistance
    const rollingResistance = 0.016 * this.mass * 9.81 * Math.sign(this.forwardSpeed);
    // Aerodynamic drag
    const airDrag = 0.5 * 1.225 * 0.31 * 2.15 * this.forwardSpeed * Math.abs(this.forwardSpeed);
    // Engine braking when off throttle
    const engineBraking = (!inputs.throttle && Math.abs(this.forwardSpeed) > 0.5) ? 450 * Math.sign(this.forwardSpeed) : 0;

    // Longitudinal net force
    let netLongForce = driveForce - airDrag - engineBraking;
    if (Math.abs(this.forwardSpeed) > 0.1) {
      netLongForce -= rollingResistance;
    }

    // Apply brakes against velocity direction
    if (brakeForce > 0) {
      if (Math.abs(this.forwardSpeed) < 0.2 && driveForce === 0) {
        this.forwardSpeed = 0;
      } else {
        const brakeDecel = (brakeForce / this.mass) * clampedDt;
        if (Math.abs(this.forwardSpeed) <= brakeDecel) {
          this.forwardSpeed = 0;
        } else {
          this.forwardSpeed -= Math.sign(this.forwardSpeed) * brakeDecel;
        }
      }
    }

    // Forward acceleration
    const forwardAccel = netLongForce / this.mass;
    this.forwardSpeed += forwardAccel * clampedDt;

    // 5. TURNING DYNAMICS & TIRE SLIP (Bicycle Model approximation)
    let tireSlipIntensity = 0;
    if (Math.abs(this.forwardSpeed) > 0.1) {
      const turnRadius = this.wheelbase / Math.tan(this.steerAngleActual || 0.0001);
      const targetYawRate = this.forwardSpeed / turnRadius;

      // Lateral grip limit (cornering stiffness)
      const lateralGrip = settings.drivingAssistance ? 9.5 : 8.2;
      const centripetalAccel = Math.abs(this.forwardSpeed * targetYawRate);

      if (centripetalAccel > lateralGrip || inputs.handbrake) {
        // Tires slipping / drifting!
        tireSlipIntensity = Math.min(1.0, (centripetalAccel - lateralGrip) / 6.0 + (inputs.handbrake ? 0.6 : 0));
        this.yawRate = THREE.MathUtils.damp(this.yawRate, targetYawRate * 0.75, 5, clampedDt);
        // Scrub off some forward speed during drift
        this.forwardSpeed *= 1.0 - (tireSlipIntensity * 0.08 * clampedDt);
      } else {
        this.yawRate = THREE.MathUtils.damp(this.yawRate, targetYawRate, 14, clampedDt);
      }

      this.rotation.y += this.yawRate * clampedDt;
    } else {
      this.yawRate = 0;
    }

    // Audio tire screech update
    soundEngine.updateTireScreech(tireSlipIntensity + (inputs.brake > 0.6 && speedKmh > 30 ? 0.5 : 0));

    // Update quaternion & directional vectors
    this.quaternion.setFromEuler(this.rotation);
    this._forward.set(0, 0, 1).applyQuaternion(this.quaternion);
    this._right.set(1, 0, 0).applyQuaternion(this.quaternion);

    // 6. POSITION INTEGRATION
    const deltaMove = this.forwardSpeed * clampedDt;
    this.position.x += this._forward.x * deltaMove;
    this.position.z += this._forward.z * deltaMove;

    // Track distance
    this.distanceTraveledKm += Math.abs(deltaMove) / 1000;

    // Wheel spin rotation
    const wheelCircumference = 2 * Math.PI * 0.35;
    this.wheelSpinAngle += (deltaMove / wheelCircumference) * (Math.PI * 2);

    // 7. SUSPENSION DYNAMICS (Pitch & Roll)
    const targetPitch = THREE.MathUtils.clamp(-forwardAccel * 0.004, -0.06, 0.06);
    const targetRoll = THREE.MathUtils.clamp(-this.yawRate * this.forwardSpeed * 0.006, -0.07, 0.07);
    this.pitch = THREE.MathUtils.damp(this.pitch, targetPitch, 10, clampedDt);
    this.roll = THREE.MathUtils.damp(this.roll, targetRoll, 10, clampedDt);

    // 8. COLLISION DETECTION & RESOLUTION
    this.checkCollisions(clampedDt);

    // Update audio engine RPM
    soundEngine.updateEngineSound(this.rpm, inputs.throttle);

    return {
      speedKmh: Math.abs(this.forwardSpeed * 3.6),
      speedMph: Math.abs(this.forwardSpeed * 2.237),
      rpm: this.rpm,
      gear: settings.transmission === 'automatic' ? this.autoGear : this.manualGear,
      actualGearRatio: gearRatio,
      isEngineOn: this.isEngineOn,
      headlightsOn: this.headlightsOn,
      leftBlinker: false,
      rightBlinker: false,
      hazardLights: false,
      fuelPercent: this.fuelPercent,
      distanceTraveledKm: this.distanceTraveledKm,
      throttlePercent: inputs.throttle * 100,
      brakePercent: inputs.brake * 100,
      isBraking: inputs.brake > 0.1,
      isReversing: inReverse,
      steerAngleVisualDeg: this.steerVisualDeg,
      wheelTurnDeg: THREE.MathUtils.radToDeg(this.steerAngleActual),
      collisionImpulse: this.collisionImpulse,
      lastCollisionTime: this.lastCollisionTime,
      engineTemperature: 90,
    };
  }

  private checkCollisions(dt: number) {
    // Car half dimensions
    const carHalfWidth = 0.96;
    const carHalfLength = 2.15;
    const carRadius = 2.2;

    for (let i = 0; i < this.obstacles.length; i++) {
      const obs = this.obstacles[i];
      const dist = this.position.distanceTo(obs.position);

      // Fast sphere cull
      const maxObsRadius = Math.max(obs.size.x, obs.size.z) + carRadius;
      if (dist > maxObsRadius) continue;

      if (obs.type === 'cylinder') {
        const cylRadius = obs.size.x;
        const minDist = cylRadius + carHalfWidth;
        if (dist < minDist) {
          // Resolve cylinder collision
          const pushDir = new THREE.Vector3().subVectors(this.position, obs.position);
          pushDir.y = 0;
          pushDir.normalize();

          const overlap = minDist - dist;
          this.position.addScaledVector(pushDir, overlap + 0.05);

          // Impact impulse
          this.handleImpact(pushDir, 0.6);
        }
      } else if (obs.type === 'box') {
        // AABB test in world space
        const halfX = obs.size.x * 0.5;
        const halfZ = obs.size.z * 0.5;

        const minX = obs.position.x - halfX - carHalfWidth;
        const maxX = obs.position.x + halfX + carHalfWidth;
        const minZ = obs.position.z - halfZ - carHalfLength;
        const maxZ = obs.position.z + halfZ + carHalfLength;

        if (this.position.x >= minX && this.position.x <= maxX &&
            this.position.z >= minZ && this.position.z <= maxZ) {
          // Determine closest ejection face
          const leftPen = this.position.x - minX;
          const rightPen = maxX - this.position.x;
          const frontPen = this.position.z - minZ;
          const backPen = maxZ - this.position.z;

          const minPen = Math.min(leftPen, rightPen, frontPen, backPen);
          const pushDir = new THREE.Vector3();

          if (minPen === leftPen) {
            pushDir.set(-1, 0, 0);
            this.position.x = minX - 0.05;
          } else if (minPen === rightPen) {
            pushDir.set(1, 0, 0);
            this.position.x = maxX + 0.05;
          } else if (minPen === frontPen) {
            pushDir.set(0, 0, -1);
            this.position.z = minZ - 0.05;
          } else {
            pushDir.set(0, 0, 1);
            this.position.z = maxZ + 0.05;
          }

          this.handleImpact(pushDir, 0.7);
        }
      }
    }

    // World perimeter bounds safety
    const worldLimit = 220;
    if (Math.abs(this.position.x) > worldLimit || Math.abs(this.position.z) > worldLimit) {
      this.position.x = THREE.MathUtils.clamp(this.position.x, -worldLimit + 1, worldLimit - 1);
      this.position.z = THREE.MathUtils.clamp(this.position.z, -worldLimit + 1, worldLimit - 1);
      this.forwardSpeed = -this.forwardSpeed * 0.4;
    }
  }

  private handleImpact(normal: THREE.Vector3, bounceCoeff: number) {
    const impactSpeed = Math.abs(this.forwardSpeed);
    if (impactSpeed > 1.2) {
      soundEngine.playCollisionSound(Math.min(1.0, impactSpeed / 20));
      this.collisionImpulse = impactSpeed;
      this.lastCollisionTime = performance.now();
    }
    // Rebound
    this.forwardSpeed = -this.forwardSpeed * bounceCoeff;
  }
}
