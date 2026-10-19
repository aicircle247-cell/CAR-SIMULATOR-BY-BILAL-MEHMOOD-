import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { soundEngine } from './audio';
import { createProceduralVehicle, VehicleMeshes } from './vehicle';
import { VehiclePhysics } from './physics';
import { buildEnvironment, WorldEnvironment } from './environment';
import { SimulatorCamera } from './camera';
import { InputManager } from './controls';
import { GameModeManager, GameModeState } from './gameModes';
import {
  AutomaticGear,
  CameraMode,
  GameMode,
  GameSettings,
  TransmissionMode,
  VehicleState,
} from './types';
import { SteeringWheel } from './components/SteeringWheel';
import { Pedals } from './components/Pedals';
import { GearSelector } from './components/GearSelector';
import { DashboardCluster } from './components/DashboardCluster';
import { TitleScreen } from './components/TitleScreen';
import { SettingsModal } from './components/SettingsModal';
import { PauseModal } from './components/PauseModal';
import { ChallengeHUD } from './components/ChallengeHUD';

const DEFAULT_SETTINGS: GameSettings = {
  graphics: 'high',
  units: 'kmh',
  transmission: 'automatic',
  soundVolume: 0.75,
  steeringSensitivity: 1.0,
  steeringReturnStrength: 1.0,
  touchSteeringWheelScale: 1.0,
  drivingAssistance: true,
  invertTilt: false,
  timeOfDay: 'day',
};

export default function App() {
  // DOM Refs
  const mountRef = useRef<HTMLDivElement>(null);

  // Engine & Simulation Core Objects (kept in refs to avoid React re-render stalls)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraManagerRef = useRef<SimulatorCamera | null>(null);
  const vehicleMeshesRef = useRef<VehicleMeshes | null>(null);
  const physicsRef = useRef<VehiclePhysics>(new VehiclePhysics());
  const envRef = useRef<WorldEnvironment | null>(null);
  const inputManagerRef = useRef<InputManager>(new InputManager());
  const modeManagerRef = useRef<GameModeManager>(new GameModeManager());

  // Game UI States
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [is3DReady, setIs3DReady] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>('chase');

  // Reactive Settings
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const saved = localStorage.getItem('car_sim_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Reactive Dashboard & Mode Telemetry (throttled from loop)
  const [telemetry, setTelemetry] = useState<VehicleState>({
    speedKmh: 0,
    speedMph: 0,
    rpm: 850,
    gear: 'P',
    actualGearRatio: 1,
    isEngineOn: true,
    headlightsOn: false,
    leftBlinker: false,
    rightBlinker: false,
    hazardLights: false,
    fuelPercent: 100,
    distanceTraveledKm: 0,
    throttlePercent: 0,
    brakePercent: 0,
    isBraking: false,
    isReversing: false,
    steerAngleVisualDeg: 0,
    wheelTurnDeg: 0,
    collisionImpulse: 0,
    lastCollisionTime: 0,
    engineTemperature: 90,
  });

  const [modeState, setModeState] = useState<GameModeState>(modeManagerRef.current.state);
  const [steerWheelDeg, setSteerWheelDeg] = useState(0);

  // Update Settings helper
  const handleUpdateSettings = useCallback((newPartial: Partial<GameSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newPartial };
      try {
        localStorage.setItem('car_sim_settings', JSON.stringify(updated));
      } catch {
        // ignore
      }
      if (newPartial.timeOfDay && envRef.current) {
        envRef.current.setTimeOfDay(newPartial.timeOfDay);
      }
      if (newPartial.transmission) {
        physicsRef.current.transmissionMode = newPartial.transmission;
      }
      return updated;
    });
  }, []);

  // 1. THREE.JS SCENE INITIALIZATION & ANIMATION LOOP
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Create Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Create Renderer
    const isHeadless = navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);
    const renderer = new THREE.WebGLRenderer({ antialias: !isHeadless, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = !isHeadless;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // PMREM Environment Map (RoomEnvironment for glossy car paint reflections)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Create Camera Manager
    const cameraManager = new SimulatorCamera(60, container.clientWidth / container.clientHeight);
    cameraManagerRef.current = cameraManager;

    // Build World Environment (Roads, Buildings, Trees, Obstacles, Traffic)
    const env = buildEnvironment(scene);
    envRef.current = env;
    env.setTimeOfDay(settings.timeOfDay);

    // Build Procedural Vehicle
    const vMeshes = createProceduralVehicle(0x1a56db); // Electric Blue Sport Sedan
    scene.add(vMeshes.rootGroup);
    vehicleMeshesRef.current = vMeshes;

    // Connect obstacles to physics engine
    physicsRef.current.obstacles = env.obstacles;
    physicsRef.current.resetTo(0, 0, 0, 0);

    setIs3DReady(true);

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !cameraManager) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      cameraManager.handleResize(width, height);
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop with Clock & Fixed Clamped Delta
    const clock = new THREE.Clock();
    let animationFrameId: number;
    let lastThrottleStateTime = 0;
    let showcaseOrbitAngle = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const rawDt = clock.getDelta();
      const dt = Math.min(rawDt, 0.05);

      const physics = physicsRef.current;
      const inputs = inputManagerRef.current;
      const modeMgr = modeManagerRef.current;

      if (!isPlaying) {
        // CINEMATIC TITLE SCREEN ORBIT CAMERA
        showcaseOrbitAngle += dt * 0.35;
        const orbitRadius = 8.5;
        const camX = Math.sin(showcaseOrbitAngle) * orbitRadius;
        const camZ = Math.cos(showcaseOrbitAngle) * orbitRadius;
        cameraManager.camera.position.set(camX, 2.6, camZ);
        cameraManager.camera.lookAt(0, 0.8, 0);
      } else {
        // ACTIVE SIMULATION
        if (!isPaused) {
          // 1. Gather Inputs
          const currentInputs = inputs.update(dt, settings);

          // 2. Step Vehicle Physics
          const vState = physics.update(dt, currentInputs, settings);

          // 3. Update 3D Vehicle Meshes from Physics Transform
          vMeshes.rootGroup.position.copy(physics.position);
          vMeshes.rootGroup.quaternion.copy(physics.quaternion);

          // Apply Suspension Pitch & Roll to vehicle body
          vMeshes.bodyMesh.rotation.x = physics.pitch;
          vMeshes.bodyMesh.rotation.z = physics.roll;

          // Steer Front Wheels
          vMeshes.frontLeftSteerPivot.rotation.y = physics.steerAngleActual;
          vMeshes.frontRightSteerPivot.rotation.y = physics.steerAngleActual;

          // Spin Wheels
          vMeshes.frontLeftWheel.rotation.x = physics.wheelSpinAngle;
          vMeshes.frontRightWheel.rotation.x = physics.wheelSpinAngle;
          vMeshes.rearLeftWheel.rotation.x = physics.wheelSpinAngle;
          vMeshes.rearRightWheel.rotation.x = physics.wheelSpinAngle;

          // Cockpit Interior Steering Wheel Rotation
          vMeshes.cockpitSteeringWheel.rotation.z = -THREE.MathUtils.degToRad(physics.steerVisualDeg);

          // Dynamic Lights
          // Headlights
          vMeshes.headlightL.intensity = physics.headlightsOn ? 1.4 : 0;
          vMeshes.headlightR.intensity = physics.headlightsOn ? 1.4 : 0;
          const headMatL = vMeshes.headlightLensL.material as THREE.MeshStandardMaterial;
          headMatL.emissive.setHex(physics.headlightsOn ? 0xfffaed : 0x000000);
          headMatL.emissiveIntensity = physics.headlightsOn ? 0.9 : 0;
          const headMatR = vMeshes.headlightLensR.material as THREE.MeshStandardMaterial;
          headMatR.emissive.setHex(physics.headlightsOn ? 0xfffaed : 0x000000);
          headMatR.emissiveIntensity = physics.headlightsOn ? 0.9 : 0;

          // Brake Lights
          const brakeMatL = vMeshes.brakeLightMeshL.material as THREE.MeshStandardMaterial;
          brakeMatL.emissive.setHex(vState.isBraking ? 0xff1111 : 0x220000);
          brakeMatL.emissiveIntensity = vState.isBraking ? 1.2 : 0.2;
          const brakeMatR = vMeshes.brakeLightMeshR.material as THREE.MeshStandardMaterial;
          brakeMatR.emissive.setHex(vState.isBraking ? 0xff1111 : 0x220000);
          brakeMatR.emissiveIntensity = vState.isBraking ? 1.2 : 0.2;

          // Reverse Lights
          const revMatL = vMeshes.reverseLightMeshL.material as THREE.MeshStandardMaterial;
          revMatL.emissive.setHex(vState.isReversing ? 0xffffff : 0x000000);
          revMatL.emissiveIntensity = vState.isReversing ? 0.9 : 0;
          const revMatR = vMeshes.reverseLightMeshR.material as THREE.MeshStandardMaterial;
          revMatR.emissive.setHex(vState.isReversing ? 0xffffff : 0x000000);
          revMatR.emissiveIntensity = vState.isReversing ? 0.9 : 0;

          // 4. Update Camera
          cameraManager.update(dt, physics);

          // 5. Update AI Traffic
          env.updateTraffic(dt, physics.position);

          // 6. Update Game Mode & Objectives
          modeMgr.update(dt, vState, physics.position, physics.rotation.y, env.checkpoints, env.parkingBays);
          if (modeMgr.state.mode === 'time_trial') {
            env.updateCheckpointVisuals(modeMgr.state.activeCheckpointIndex);
          }

          // 7. Throttled UI Telemetry updates (every 40ms to keep 60fps WebGL decoupled from React re-renders)
          const now = performance.now();
          if (now - lastThrottleStateTime > 40) {
            setTelemetry({ ...vState });
            setModeState({ ...modeMgr.state });
            setSteerWheelDeg(physics.steerVisualDeg);
            lastThrottleStateTime = now;
          }
        }
      }

      // Render Scene
      renderer.render(scene, cameraManager.camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    // Bind edge-triggered controls
    const inputMgr = inputManagerRef.current;
    inputMgr.onEngineToggle = () => {
      const p = physicsRef.current;
      p.isEngineOn = !p.isEngineOn;
      if (p.isEngineOn) {
        soundEngine.startEngine();
      } else {
        soundEngine.stopEngine();
      }
    };

    inputMgr.onCameraCycle = () => {
      if (cameraManagerRef.current) {
        const next = cameraManagerRef.current.cycleMode();
        setCameraMode(next);
      }
    };

    inputMgr.onHeadlightsToggle = () => {
      const p = physicsRef.current;
      p.headlightsOn = !p.headlightsOn;
    };

    inputMgr.onResetVehicle = () => {
      physicsRef.current.resetTo(0, 0, 0, 0);
    };

    inputMgr.onPauseToggle = () => {
      setIsPaused((p) => {
        const next = !p;
        inputManagerRef.current.setPaused(next);
        return next;
      });
    };

    inputMgr.onShiftUp = () => {
      physicsRef.current.shiftManualUp();
    };

    inputMgr.onShiftDown = () => {
      physicsRef.current.shiftManualDown();
    };

    inputMgr.onHorn = () => {
      soundEngine.playHorn();
    };

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [isPlaying, isPaused, settings]);

  // Handle Game Start from Title Screen
  const handleStartGame = (mode: GameMode) => {
    soundEngine.unlockAudio();
    soundEngine.startEngine();

    if (envRef.current) {
      modeManagerRef.current.setMode(mode, envRef.current.checkpoints);
      // Mode-specific vehicle starting position
      if (mode === 'driving_school') {
        physicsRef.current.resetTo(0, 0, 0, 0);
      } else if (mode === 'parking_challenge') {
        physicsRef.current.resetTo(24, 0, -100, 0); // Near parking bays
      } else if (mode === 'time_trial') {
        physicsRef.current.resetTo(0, 0, 0, 0);
      } else {
        physicsRef.current.resetTo(0, 0, 0, 0);
      }
    }

    physicsRef.current.isEngineOn = true;
    physicsRef.current.autoGear = 'D'; // Ready to drive
    setIsPlaying(true);
    setIsPaused(false);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none touch-none">
      {/* Isolated Three.js Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 z-0 w-full h-full" />

      {/* Title Screen Overlay */}
      {!isPlaying && (
        <TitleScreen
          onStartGame={handleStartGame}
          onOpenSettings={() => setShowSettings(true)}
          is3DReady={is3DReady}
        />
      )}

      {/* In-Game Active Driving HUD */}
      {isPlaying && (
        <div className="absolute inset-0 z-10 flex flex-col justify-between pointer-events-none p-3 md:p-6">
          {/* Top Dashboard Cluster & Status Bar */}
          <div>
            <DashboardCluster
              vehicleState={telemetry}
              units={settings.units}
              transmission={settings.transmission}
              cameraMode={cameraMode}
              onCameraCycle={() => {
                const next = cameraManagerRef.current?.cycleMode() || 'chase';
                setCameraMode(next);
              }}
              onEngineToggle={() => {
                const p = physicsRef.current;
                p.isEngineOn = !p.isEngineOn;
                if (p.isEngineOn) soundEngine.startEngine();
                else soundEngine.stopEngine();
              }}
              onHeadlightsToggle={() => {
                physicsRef.current.headlightsOn = !physicsRef.current.headlightsOn;
              }}
              onResetVehicle={() => {
                physicsRef.current.resetTo(0, 0, 0, 0);
              }}
              onPauseToggle={() => {
                setIsPaused((p) => {
                  const next = !p;
                  inputManagerRef.current.setPaused(next);
                  return next;
                });
              }}
              onOpenSettings={() => setShowSettings(true)}
            />

            {/* Challenge Mode Mission Banner */}
            <ChallengeHUD
              modeState={modeState}
              lastCollisionTime={telemetry.lastCollisionTime}
              onNextLesson={() => {
                if (modeState.drivingSchoolLesson < 4) {
                  modeManagerRef.current.setupDrivingSchoolLesson(modeState.drivingSchoolLesson + 1);
                  physicsRef.current.resetTo(0, 0, 0, 0);
                }
              }}
              onRestartMode={() => {
                if (envRef.current) {
                  modeManagerRef.current.setMode(modeState.mode, envRef.current.checkpoints);
                  physicsRef.current.resetTo(0, 0, 0, 0);
                }
              }}
              onSwitchMode={(newMode) => {
                if (envRef.current) {
                  modeManagerRef.current.setMode(newMode, envRef.current.checkpoints);
                  physicsRef.current.resetTo(0, 0, 0, 0);
                }
              }}
            />
          </div>

          {/* Bottom Driving Controls Dock (Steering Wheel, Gear Stick, Pedals) */}
          <div className="w-full flex items-end justify-between pointer-events-auto">
            {/* Lower-Left: Steering Wheel */}
            <div className="flex flex-col items-center">
              <SteeringWheel
                currentAngleDeg={steerWheelDeg}
                scale={settings.touchSteeringWheelScale}
                onSteerChange={(normalized, deg) => {
                  inputManagerRef.current.setTouchSteering(normalized, deg);
                }}
                onSteerRelease={() => {
                  inputManagerRef.current.releaseTouchSteering();
                }}
                onHorn={() => soundEngine.playHorn()}
              />
              <span className="text-[9px] font-mono font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                DRAG OR USE A / D
              </span>
            </div>

            {/* Lower-Center: Desktop Keyboard Hints */}
            <div className="hidden lg:flex items-center gap-3 bg-slate-950/75 border border-slate-800 rounded-xl px-4 py-2 text-[10px] font-mono text-slate-400 shadow-xl mb-2">
              <span>W: Accelerate</span>
              <span>•</span>
              <span>S: Brake</span>
              <span>•</span>
              <span>A/D: Steer</span>
              <span>•</span>
              <span>Space: Handbrake</span>
              <span>•</span>
              <span>C: Camera</span>
              <span>•</span>
              <span>E: Engine</span>
            </div>

            {/* Lower-Right: Gear Selector & Pedals */}
            <div className="flex items-end gap-3">
              <GearSelector
                transmission={settings.transmission}
                autoGear={physicsRef.current.autoGear}
                manualGear={physicsRef.current.manualGear}
                currentSpeedKmh={telemetry.speedKmh}
                onSelectAutoGear={(gear: AutomaticGear) => {
                  physicsRef.current.setGear(gear);
                }}
                onShiftUp={() => physicsRef.current.shiftManualUp()}
                onShiftDown={() => physicsRef.current.shiftManualDown()}
                onToggleTransmission={() => {
                  handleUpdateSettings({
                    transmission: settings.transmission === 'automatic' ? 'manual' : 'automatic',
                  });
                }}
              />

              <Pedals
                onGasChange={(pressed) => inputManagerRef.current.setGasPedal(pressed)}
                onBrakeChange={(pressed) => inputManagerRef.current.setBrakePedal(pressed)}
                onHandbrakeToggle={() => {
                  physicsRef.current.setGear('P');
                }}
                isHandbrakeEngaged={physicsRef.current.autoGear === 'P'}
              />
            </div>
          </div>
        </div>
      )}

      {/* Pause Menu Modal */}
      {isPaused && (
        <PauseModal
          onResume={() => {
            setIsPaused(false);
            inputManagerRef.current.setPaused(false);
          }}
          onRestart={() => {
            physicsRef.current.resetTo(0, 0, 0, 0);
            setIsPaused(false);
            inputManagerRef.current.setPaused(false);
          }}
          onOpenSettings={() => setShowSettings(true)}
          onMainMenu={() => {
            setIsPlaying(false);
            setIsPaused(false);
            soundEngine.stopEngine();
          }}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
