import * as THREE from 'three';
import { ChallengeObjective, Checkpoint, GameMode, ParkingBay, VehicleState } from './types';
import { soundEngine } from './audio';

export interface GameModeState {
  mode: GameMode;
  objectiveText: string;
  hintText: string;
  isCompleted: boolean;
  score?: number;
  timeElapsed: number;
  activeCheckpointIndex: number;
  totalCheckpoints: number;
  bestLapTime?: number;
  drivingSchoolLesson: number; // 1 to 4
}

export class GameModeManager {
  public state: GameModeState = {
    mode: 'free_drive',
    objectiveText: 'Free Exploration',
    hintText: 'Drive anywhere, test steering, speed, and transmission.',
    isCompleted: false,
    timeElapsed: 0,
    activeCheckpointIndex: 0,
    totalCheckpoints: 0,
    drivingSchoolLesson: 1,
  };

  private parkingEvaluated = false;
  private parkingSuccessTime = 0;

  constructor() {
    const savedBest = localStorage.getItem('car_sim_best_lap');
    if (savedBest) {
      this.state.bestLapTime = parseFloat(savedBest);
    }
  }

  public setMode(mode: GameMode, checkpoints: Checkpoint[]) {
    this.state.mode = mode;
    this.state.isCompleted = false;
    this.state.timeElapsed = 0;
    this.state.score = undefined;
    this.parkingEvaluated = false;
    this.state.activeCheckpointIndex = 0;
    this.state.totalCheckpoints = checkpoints.length;

    if (mode === 'free_drive') {
      this.state.objectiveText = 'Free Drive Mode';
      this.state.hintText = 'Explore the city roads, test the transmission, and practice cornering.';
    } else if (mode === 'driving_school') {
      this.state.drivingSchoolLesson = 1;
      this.setupDrivingSchoolLesson(1);
    } else if (mode === 'parking_challenge') {
      this.state.objectiveText = 'Parking Challenge: Bay 90°';
      this.state.hintText = 'Maneuver into the marked green parking bay and bring the car to a full stop.';
    } else if (mode === 'time_trial') {
      this.state.objectiveText = 'Time Trial Circuit';
      this.state.hintText = 'Drive through all checkpoints as quickly as possible!';
    } else if (mode === 'traffic_practice') {
      this.state.objectiveText = 'Traffic Practice';
      this.state.hintText = 'Navigate the busy city streets without colliding with traffic cars.';
    }
  }

  public setupDrivingSchoolLesson(lessonNum: number) {
    this.state.drivingSchoolLesson = lessonNum;
    this.state.isCompleted = false;

    if (lessonNum === 1) {
      this.state.objectiveText = 'Lesson 1: Engine Start & Acceleration';
      this.state.hintText = 'Start the engine (E) and accelerate smoothly to reach 40 km/h.';
    } else if (lessonNum === 2) {
      this.state.objectiveText = 'Lesson 2: Controlled Braking';
      this.state.hintText = 'Drive forward and come to a complete stop inside the yellow stop zone ahead.';
    } else if (lessonNum === 3) {
      this.state.objectiveText = 'Lesson 3: Slalom Maneuver';
      this.state.hintText = 'Navigate between the orange cones in the training lot using smooth steering.';
    } else if (lessonNum === 4) {
      this.state.objectiveText = 'Lesson 4: Reversing & Parking';
      this.state.hintText = 'Shift to Reverse (R) and back into the designated parking bay.';
    }
  }

  public update(
    dt: number,
    vehicleState: VehicleState,
    vehiclePos: THREE.Vector3,
    vehicleRotY: number,
    checkpoints: Checkpoint[],
    parkingBays: ParkingBay[]
  ) {
    this.state.timeElapsed += dt;

    if (this.state.mode === 'driving_school') {
      this.updateDrivingSchool(vehicleState, vehiclePos);
    } else if (this.state.mode === 'parking_challenge') {
      this.updateParkingChallenge(vehicleState, vehiclePos, vehicleRotY, parkingBays);
    } else if (this.state.mode === 'time_trial') {
      this.updateTimeTrial(vehiclePos, checkpoints);
    } else if (this.state.mode === 'traffic_practice') {
      this.updateTrafficPractice(vehicleState);
    }
  }

  private updateDrivingSchool(vState: VehicleState, pos: THREE.Vector3) {
    if (this.state.isCompleted) return;

    if (this.state.drivingSchoolLesson === 1) {
      if (!vState.isEngineOn) {
        this.state.hintText = 'Press Start Engine (E) to ignite the motor.';
      } else if (vState.speedKmh < 40) {
        this.state.hintText = `Accelerating: ${Math.round(vState.speedKmh)} / 40 km/h... Keep holding gas!`;
      } else {
        this.state.isCompleted = true;
        this.state.hintText = 'Excellent! You achieved 40 km/h smoothly. Lesson 1 Complete!';
        soundEngine.playCheckpointSound();
      }
    } else if (this.state.drivingSchoolLesson === 2) {
      // Yellow stop zone is at (0, 0, 40), length ~6m
      const distToZone = pos.distanceTo(new THREE.Vector3(0, 0, 40));
      if (distToZone < 4.0) {
        if (vState.speedKmh < 1.0) {
          this.state.isCompleted = true;
          this.state.hintText = 'Perfect stop inside the target zone! Lesson 2 Complete!';
          soundEngine.playCheckpointSound();
        } else {
          this.state.hintText = 'In target zone! Apply brakes firmly to halt completely!';
        }
      } else {
        this.state.hintText = `Drive toward the yellow stop box (${Math.round(distToZone)}m ahead) and brake cleanly.`;
      }
    } else if (this.state.drivingSchoolLesson === 3) {
      // Training lot is at x: 38, z: -125
      const distToLot = pos.distanceTo(new THREE.Vector3(38, 0, -125));
      if (distToLot < 25 && vState.speedKmh > 10) {
        this.state.hintText = 'Weaving through cones... Maintain 15-25 km/h with gentle steering!';
      }
      if (pos.z < -140 && distToLot < 30) {
        this.state.isCompleted = true;
        this.state.hintText = 'Slalom completed with smooth car control! Lesson 3 Complete!';
        soundEngine.playCheckpointSound();
      }
    } else if (this.state.drivingSchoolLesson === 4) {
      if (vState.gear === 'R') {
        this.state.hintText = 'Good! Reverse gear engaged. Gently steer backward into the bay.';
      } else {
        this.state.hintText = 'Come to a stop and select Reverse (R) gear.';
      }
    }
  }

  private updateParkingChallenge(
    vState: VehicleState,
    pos: THREE.Vector3,
    rotY: number,
    parkingBays: ParkingBay[]
  ) {
    if (this.state.isCompleted) return;

    const targetBay = parkingBays[0]; // Bay 90°
    if (!targetBay) return;

    const bayPos = new THREE.Vector3(...targetBay.position);
    const dist = pos.distanceTo(bayPos);

    if (dist < 2.5) {
      if (vState.speedKmh < 1.0) {
        // Evaluate parking precision
        const headingDiff = Math.abs(rotY - targetBay.rotationY) % Math.PI;
        const angleAccuracy = Math.max(0, 1 - headingDiff / 0.35);
        const positionAccuracy = Math.max(0, 1 - dist / 2.5);
        const totalScore = Math.round((angleAccuracy * 0.4 + positionAccuracy * 0.6) * 100);

        this.state.score = totalScore;
        this.state.isCompleted = true;
        this.state.hintText = `Parked successfully! Accuracy Score: ${totalScore}%`;
        soundEngine.playCheckpointSound();
      } else {
        this.state.hintText = 'Inside the bay! Bring vehicle to a complete stop to finish.';
      }
    } else {
      this.state.hintText = `Bay is ${Math.round(dist)}m away. Align car straight with yellow lines.`;
    }
  }

  private updateTimeTrial(pos: THREE.Vector3, checkpoints: Checkpoint[]) {
    if (this.state.isCompleted || checkpoints.length === 0) return;

    const currentCp = checkpoints[this.state.activeCheckpointIndex];
    if (!currentCp) return;

    const cpPos = new THREE.Vector3(...currentCp.position);
    const dist = pos.distanceTo(cpPos);

    if (dist <= currentCp.radius) {
      soundEngine.playCheckpointSound();
      currentCp.passed = true;
      this.state.activeCheckpointIndex++;

      if (this.state.activeCheckpointIndex >= checkpoints.length) {
        // Lap Finished!
        this.state.isCompleted = true;
        const finalTime = this.state.timeElapsed;
        if (!this.state.bestLapTime || finalTime < this.state.bestLapTime) {
          this.state.bestLapTime = finalTime;
          localStorage.setItem('car_sim_best_lap', finalTime.toFixed(2));
        }
        this.state.hintText = `LAP FINISHED! Time: ${finalTime.toFixed(2)}s`;
      } else {
        const nextCp = checkpoints[this.state.activeCheckpointIndex];
        this.state.hintText = `Checkpoint passed! Next: ${nextCp.name || `CP ${this.state.activeCheckpointIndex + 1}`}`;
      }
    }
  }

  private updateTrafficPractice(vState: VehicleState) {
    if (this.state.isCompleted) return;

    const targetTime = 120; // 2 minutes
    const remaining = Math.max(0, targetTime - this.state.timeElapsed);

    if (vState.lastCollisionTime && performance.now() - vState.lastCollisionTime < 800) {
      this.state.hintText = '⚠️ Traffic Violation! Collision detected. Stay in your lane!';
    } else {
      this.state.hintText = `Time Remaining: ${Math.round(remaining)}s. Drive carefully!`;
    }

    if (remaining <= 0) {
      this.state.isCompleted = true;
      this.state.hintText = '🏆 Outstanding driving! You completed 2 minutes in urban traffic without issue!';
      soundEngine.playCheckpointSound();
    }
  }
}
