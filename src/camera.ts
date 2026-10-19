import * as THREE from 'three';
import { CameraMode } from './types';
import { VehiclePhysics } from './physics';

export class SimulatorCamera {
  public camera: THREE.PerspectiveCamera;
  public mode: CameraMode = 'chase';

  private targetPosition = new THREE.Vector3();
  private targetLookAt = new THREE.Vector3();
  private currentLookAt = new THREE.Vector3();

  // Reusable vectors
  private _carPos = new THREE.Vector3();
  private _carForward = new THREE.Vector3();
  private _carUp = new THREE.Vector3();
  private _carRight = new THREE.Vector3();

  constructor(fov: number = 60, aspect: number = 16 / 9) {
    this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
    this.camera.position.set(0, 4, -8);
  }

  public setMode(mode: CameraMode) {
    this.mode = mode;
  }

  public cycleMode(): CameraMode {
    if (this.mode === 'chase') {
      this.mode = 'cockpit';
    } else if (this.mode === 'cockpit') {
      this.mode = 'overhead';
    } else {
      this.mode = 'chase';
    }
    return this.mode;
  }

  public update(dt: number, physics: VehiclePhysics) {
    const clampedDt = Math.min(dt, 0.05);

    this._carPos.copy(physics.position);
    this._carForward.set(0, 0, 1).applyQuaternion(physics.quaternion);
    this._carUp.set(0, 1, 0).applyQuaternion(physics.quaternion);
    this._carRight.set(1, 0, 0).applyQuaternion(physics.quaternion);

    const speed = Math.abs(physics.forwardSpeed);

    if (this.mode === 'chase') {
      // Dynamic chase distance & height based on speed
      const followDist = 6.2 + speed * 0.04;
      const height = 2.4 + speed * 0.015;

      // Desired camera position behind vehicle
      this.targetPosition.copy(this._carPos)
        .addScaledVector(this._carForward, -followDist)
        .addScaledVector(this._carUp, height);

      // Look slightly ahead of car hood
      this.targetLookAt.copy(this._carPos).addScaledVector(this._carForward, 6).add(new THREE.Vector3(0, 0.8, 0));

      // Dynamic FOV widening with speed
      const targetFov = 60 + Math.min(16, (speed * 3.6) * 0.08);
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 4, clampedDt);
      this.camera.updateProjectionMatrix();

      // Smooth lag dampening
      this.camera.position.lerp(this.targetPosition, 1 - Math.exp(-9 * clampedDt));
      this.currentLookAt.lerp(this.targetLookAt, 1 - Math.exp(-12 * clampedDt));
      this.camera.lookAt(this.currentLookAt);

    } else if (this.mode === 'cockpit') {
      // Position directly in driver seat
      const eyeOffset = new THREE.Vector3(-0.38, 1.16, -0.05);
      eyeOffset.applyQuaternion(physics.quaternion);

      this.camera.position.copy(this._carPos).add(eyeOffset);

      // Look forward through windshield with subtle pitch and steer yaw effect
      const lookDist = 18;
      const headTilt = physics.yawRate * 0.15;
      this.targetLookAt.copy(this.camera.position)
        .addScaledVector(this._carForward, lookDist)
        .addScaledVector(this._carRight, headTilt)
        .add(new THREE.Vector3(0, -0.15, 0));

      this.camera.fov = 68;
      this.camera.updateProjectionMatrix();

      this.currentLookAt.copy(this.targetLookAt);
      this.camera.lookAt(this.currentLookAt);

    } else if (this.mode === 'overhead') {
      // Top-down tactical overhead view
      this.targetPosition.copy(this._carPos).add(new THREE.Vector3(0, 24, -4));
      this.targetLookAt.copy(this._carPos).addScaledVector(this._carForward, 2);

      this.camera.fov = 55;
      this.camera.updateProjectionMatrix();

      this.camera.position.lerp(this.targetPosition, 1 - Math.exp(-7 * clampedDt));
      this.currentLookAt.lerp(this.targetLookAt, 1 - Math.exp(-9 * clampedDt));
      this.camera.lookAt(this.currentLookAt);
    }
  }

  public handleResize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
