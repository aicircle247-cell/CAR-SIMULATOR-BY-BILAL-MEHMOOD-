import { GameSettings, VehicleInputs } from './types';

export class InputManager {
  public inputs: VehicleInputs = {
    throttle: 0,
    brake: 0,
    steering: 0,
    handbrake: false,
    reverse: false,
  };

  // Raw keyboard state
  private keyState: Record<string, boolean> = {};

  // Touch / Virtual wheel state
  public isTouchSteeringActive = false;
  private touchSteerAngle = 0; // -180 to 180 degrees
  public isGasPedalHeld = false;
  public isBrakePedalHeld = false;

  // Listeners for edge-triggered actions
  public onEngineToggle?: () => void;
  public onCameraCycle?: () => void;
  public onHeadlightsToggle?: () => void;
  public onResetVehicle?: () => void;
  public onPauseToggle?: () => void;
  public onShiftUp?: () => void;
  public onShiftDown?: () => void;
  public onHorn?: () => void;

  private isPaused = false;

  constructor() {
    this.setupKeyboardListeners();
    this.setupWindowBlur();
  }

  public setPaused(paused: boolean) {
    this.isPaused = paused;
    if (paused) {
      this.resetInputs();
    }
  }

  private setupKeyboardListeners() {
    window.addEventListener('keydown', (e) => {
      // Do not capture if typing in input
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

      this.keyState[e.code] = true;

      if (e.code === 'KeyE') {
        this.onEngineToggle?.();
      } else if (e.code === 'KeyC') {
        this.onCameraCycle?.();
      } else if (e.code === 'KeyL') {
        this.onHeadlightsToggle?.();
      } else if (e.code === 'KeyR') {
        this.onResetVehicle?.();
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        this.onPauseToggle?.();
      } else if (e.code === 'KeyH') {
        this.onHorn?.();
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.onShiftUp?.();
      } else if (e.code === 'ControlLeft' || e.code === 'ControlRight') {
        this.onShiftDown?.();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keyState[e.code] = false;
    });
  }

  private setupWindowBlur() {
    window.addEventListener('blur', () => {
      this.keyState = {};
      this.resetInputs();
    });
  }

  public resetInputs() {
    this.inputs.throttle = 0;
    this.inputs.brake = 0;
    this.inputs.steering = 0;
    this.inputs.handbrake = false;
    this.isGasPedalHeld = false;
    this.isBrakePedalHeld = false;
    this.isTouchSteeringActive = false;
    this.touchSteerAngle = 0;
  }

  // Called from on-screen steering wheel pointer drag
  public setTouchSteering(normalizedSteer: number, angleDeg: number) {
    this.isTouchSteeringActive = true;
    this.touchSteerAngle = angleDeg;
    this.inputs.steering = Math.max(-1, Math.min(1, normalizedSteer));
  }

  public releaseTouchSteering() {
    this.isTouchSteeringActive = false;
  }

  public setGasPedal(isPressed: boolean) {
    this.isGasPedalHeld = isPressed;
  }

  public setBrakePedal(isPressed: boolean) {
    this.isBrakePedalHeld = isPressed;
  }

  public update(dt: number, settings: GameSettings): VehicleInputs {
    if (this.isPaused) {
      return this.inputs;
    }

    // 1. THROTTLE
    const keyThrottle = this.keyState['KeyW'] || this.keyState['ArrowUp'] ? 1 : 0;
    const touchThrottle = this.isGasPedalHeld ? 1 : 0;
    this.inputs.throttle = Math.max(keyThrottle, touchThrottle);

    // 2. BRAKE & HANDBRAKE
    const keyBrake = this.keyState['KeyS'] || this.keyState['ArrowDown'] ? 1 : 0;
    const spaceBrake = this.keyState['Space'] ? 1 : 0;
    const touchBrake = this.isBrakePedalHeld ? 1 : 0;
    this.inputs.brake = Math.max(keyBrake, spaceBrake, touchBrake);
    this.inputs.handbrake = !!this.keyState['Space'];

    // 3. STEERING
    if (this.isTouchSteeringActive) {
      // Inputs already set by pointer handler
    } else {
      // Keyboard steering
      let targetSteer = 0;
      if (this.keyState['KeyA'] || this.keyState['ArrowLeft']) {
        targetSteer -= 1;
      }
      if (this.keyState['KeyD'] || this.keyState['ArrowRight']) {
        targetSteer += 1;
      }

      // Smooth steering return
      const returnRate = targetSteer === 0 ? 12 * settings.steeringReturnStrength : 15;
      this.inputs.steering = Math.max(-1, Math.min(1, 
        this.inputs.steering + (targetSteer - this.inputs.steering) * Math.min(1, returnRate * dt)
      ));
    }

    return this.inputs;
  }
}
