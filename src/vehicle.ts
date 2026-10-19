import * as THREE from 'three';

export interface VehicleMeshes {
  rootGroup: THREE.Group;
  bodyMesh: THREE.Mesh;
  frontLeftWheel: THREE.Group;
  frontRightWheel: THREE.Group;
  rearLeftWheel: THREE.Group;
  rearRightWheel: THREE.Group;
  frontLeftSteerPivot: THREE.Group;
  frontRightSteerPivot: THREE.Group;
  cockpitSteeringWheel: THREE.Group;
  headlightL: THREE.SpotLight;
  headlightR: THREE.SpotLight;
  headlightLensL: THREE.Mesh;
  headlightLensR: THREE.Mesh;
  brakeLightMeshL: THREE.Mesh;
  brakeLightMeshR: THREE.Mesh;
  reverseLightMeshL: THREE.Mesh;
  reverseLightMeshR: THREE.Mesh;
  driverSeatPos: THREE.Vector3;
}

export function createProceduralVehicle(carColorHex: number = 0x1a56db): VehicleMeshes {
  const root = new THREE.Group();
  root.name = 'PlayerVehicle';

  // 1. CAR BODY MATERIALS
  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: carColorHex,
    metalness: 0.75,
    roughness: 0.22,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
  });

  const blackTrimMaterial = new THREE.MeshStandardMaterial({
    color: 0x111317,
    roughness: 0.6,
    metalness: 0.3,
  });

  const chromeMaterial = new THREE.MeshStandardMaterial({
    color: 0xdde2e8,
    metalness: 0.95,
    roughness: 0.1,
  });

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x111a24,
    metalness: 0.1,
    roughness: 0.1,
    transmission: 0.7,
    thickness: 0.4,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });

  const tireMaterial = new THREE.MeshStandardMaterial({
    color: 0x1c1e22,
    roughness: 0.85,
    metalness: 0.05,
  });

  const rimMaterial = new THREE.MeshStandardMaterial({
    color: 0xc8ced8,
    metalness: 0.88,
    roughness: 0.18,
  });

  const brakeCaliperMat = new THREE.MeshStandardMaterial({
    color: 0xe02424,
    metalness: 0.4,
    roughness: 0.3,
  });

  const brakeRotorMat = new THREE.MeshStandardMaterial({
    color: 0x8a929e,
    metalness: 0.95,
    roughness: 0.2,
  });

  // Emissive materials for lights
  const headlightOffMat = new THREE.MeshStandardMaterial({
    color: 0xd8e8f8,
    emissive: 0x000000,
    roughness: 0.1,
  });

  const brakeLightMat = new THREE.MeshStandardMaterial({
    color: 0x330505,
    emissive: 0x220000,
    roughness: 0.3,
  });

  const reverseLightMat = new THREE.MeshStandardMaterial({
    color: 0x222222,
    emissive: 0x000000,
    roughness: 0.3,
  });

  // 2. MAIN LOWER CHASSIS & SILL
  const chassisGeo = new THREE.BoxGeometry(1.92, 0.46, 4.35);
  const chassisMesh = new THREE.Mesh(chassisGeo, bodyMaterial);
  chassisMesh.position.set(0, 0.54, 0);
  chassisMesh.castShadow = true;
  chassisMesh.receiveShadow = true;
  root.add(chassisMesh);

  // Front wedge hood
  const hoodGeo = new THREE.BoxGeometry(1.86, 0.28, 1.35);
  const hoodMesh = new THREE.Mesh(hoodGeo, bodyMaterial);
  hoodMesh.position.set(0, 0.68, 1.25);
  hoodMesh.rotation.x = 0.04;
  hoodMesh.castShadow = true;
  root.add(hoodMesh);

  // Front splitter & black lower lip
  const splitterGeo = new THREE.BoxGeometry(1.94, 0.1, 0.4);
  const splitterMesh = new THREE.Mesh(splitterGeo, blackTrimMaterial);
  splitterMesh.position.set(0, 0.33, 2.12);
  root.add(splitterMesh);

  // Front sport grille
  const grilleGeo = new THREE.BoxGeometry(1.2, 0.22, 0.05);
  const grilleMesh = new THREE.Mesh(grilleGeo, blackTrimMaterial);
  grilleMesh.position.set(0, 0.52, 2.19);
  root.add(grilleMesh);

  // 3. CABIN & ROOF WITH PILLARS
  const cabinGeo = new THREE.BoxGeometry(1.68, 0.58, 2.1);
  const cabinMesh = new THREE.Mesh(cabinGeo, bodyMaterial);
  cabinMesh.position.set(0, 1.02, -0.22);
  cabinMesh.castShadow = true;
  root.add(cabinMesh);

  // Windshield (slanted forward)
  const windshieldGeo = new THREE.PlaneGeometry(1.6, 0.72);
  const windshieldMesh = new THREE.Mesh(windshieldGeo, glassMaterial);
  windshieldMesh.position.set(0, 1.05, 0.84);
  windshieldMesh.rotation.x = -Math.PI / 3.4;
  root.add(windshieldMesh);

  // Rear window (slanted backward)
  const rearWindowGeo = new THREE.PlaneGeometry(1.56, 0.68);
  const rearWindowMesh = new THREE.Mesh(rearWindowGeo, glassMaterial);
  rearWindowMesh.position.set(0, 1.06, -1.26);
  rearWindowMesh.rotation.x = Math.PI / 3.4;
  rearWindowMesh.rotation.y = Math.PI;
  root.add(rearWindowMesh);

  // Side windows
  const sideWindowGeo = new THREE.PlaneGeometry(1.85, 0.42);
  const sideWinL = new THREE.Mesh(sideWindowGeo, glassMaterial);
  sideWinL.position.set(-0.845, 1.03, -0.22);
  sideWinL.rotation.y = -Math.PI / 2;
  root.add(sideWinL);

  const sideWinR = new THREE.Mesh(sideWindowGeo, glassMaterial);
  sideWinR.position.set(0.845, 1.03, -0.22);
  sideWinR.rotation.y = Math.PI / 2;
  root.add(sideWinR);

  // Rear trunk lid & lip spoiler
  const trunkGeo = new THREE.BoxGeometry(1.84, 0.3, 0.95);
  const trunkMesh = new THREE.Mesh(trunkGeo, bodyMaterial);
  trunkMesh.position.set(0, 0.68, -1.68);
  trunkMesh.castShadow = true;
  root.add(trunkMesh);

  const spoilerGeo = new THREE.BoxGeometry(1.72, 0.06, 0.22);
  const spoilerMesh = new THREE.Mesh(spoilerGeo, blackTrimMaterial);
  spoilerMesh.position.set(0, 0.88, -2.12);
  root.add(spoilerMesh);

  // Rear diffuser & exhaust tips
  const diffuserGeo = new THREE.BoxGeometry(1.88, 0.16, 0.35);
  const diffuserMesh = new THREE.Mesh(diffuserGeo, blackTrimMaterial);
  diffuserMesh.position.set(0, 0.36, -2.12);
  root.add(diffuserMesh);

  [-0.6, -0.45, 0.45, 0.6].forEach(x => {
    const exhaustGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.2, 12);
    const exhaustMesh = new THREE.Mesh(exhaustGeo, chromeMaterial);
    exhaustMesh.rotation.x = Math.PI / 2;
    exhaustMesh.position.set(x, 0.34, -2.24);
    root.add(exhaustMesh);
  });

  // Side mirrors
  [-0.98, 0.98].forEach((x, idx) => {
    const mirrorStem = new THREE.BoxGeometry(0.12, 0.03, 0.05);
    const mStemMesh = new THREE.Mesh(mirrorStem, blackTrimMaterial);
    mStemMesh.position.set(x * 0.92, 0.88, 0.65);
    root.add(mStemMesh);

    const mirrorCap = new THREE.BoxGeometry(0.2, 0.12, 0.09);
    const mCapMesh = new THREE.Mesh(mirrorCap, bodyMaterial);
    mCapMesh.position.set(x, 0.89, 0.65);
    root.add(mCapMesh);

    const glassFace = new THREE.PlaneGeometry(0.18, 0.1);
    const gFaceMesh = new THREE.Mesh(glassFace, chromeMaterial);
    gFaceMesh.position.set(x > 0 ? x - 0.04 : x + 0.04, 0.89, 0.61);
    gFaceMesh.rotation.y = idx === 0 ? Math.PI / 2 : -Math.PI / 2;
    root.add(gFaceMesh);
  });

  // 4. INTERIOR COCKPIT & DASHBOARD
  const dashGeo = new THREE.BoxGeometry(1.55, 0.32, 0.55);
  const dashMesh = new THREE.Mesh(dashGeo, blackTrimMaterial);
  dashMesh.position.set(0, 0.82, 0.46);
  root.add(dashMesh);

  // Digital instrument cluster background
  const clusterGeo = new THREE.PlaneGeometry(0.42, 0.16);
  const clusterMat = new THREE.MeshBasicMaterial({ color: 0x0a1628 });
  const clusterMesh = new THREE.Mesh(clusterGeo, clusterMat);
  clusterMesh.position.set(-0.38, 0.88, 0.35);
  clusterMesh.rotation.x = -0.3;
  clusterMesh.rotation.y = Math.PI;
  root.add(clusterMesh);

  // Driver Seat
  const seatBaseGeo = new THREE.BoxGeometry(0.55, 0.18, 0.55);
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x1f2329, roughness: 0.8 });
  const seatBase = new THREE.Mesh(seatBaseGeo, seatMat);
  seatBase.position.set(-0.38, 0.52, -0.15);
  root.add(seatBase);

  const seatBackGeo = new THREE.BoxGeometry(0.52, 0.62, 0.12);
  const seatBack = new THREE.Mesh(seatBackGeo, seatMat);
  seatBack.position.set(-0.38, 0.85, -0.42);
  seatBack.rotation.x = -0.14;
  root.add(seatBack);

  // Passenger Seat
  const pSeatBase = seatBase.clone();
  pSeatBase.position.set(0.38, 0.52, -0.15);
  root.add(pSeatBase);
  const pSeatBack = seatBack.clone();
  pSeatBack.position.set(0.38, 0.85, -0.42);
  root.add(pSeatBack);

  // Interactive cockpit steering wheel
  const cockpitSteeringWheel = new THREE.Group();
  cockpitSteeringWheel.position.set(-0.38, 0.84, 0.22);
  cockpitSteeringWheel.rotation.x = -0.35; // angled toward driver

  const wheelRimGeo = new THREE.TorusGeometry(0.17, 0.022, 12, 32);
  const wheelRimMesh = new THREE.Mesh(wheelRimGeo, blackTrimMaterial);
  cockpitSteeringWheel.add(wheelRimMesh);

  const wheelCenterGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.03, 16);
  const wheelCenterMesh = new THREE.Mesh(wheelCenterGeo, blackTrimMaterial);
  wheelCenterMesh.rotation.x = Math.PI / 2;
  cockpitSteeringWheel.add(wheelCenterMesh);

  // 3 Spokes
  for (let a = 0; a < 3; a++) {
    const spokeAngle = (a * 2 * Math.PI) / 3 + Math.PI / 2;
    const spokeGeo = new THREE.BoxGeometry(0.022, 0.14, 0.015);
    const spokeMesh = new THREE.Mesh(spokeGeo, chromeMaterial);
    spokeMesh.position.set(Math.cos(spokeAngle) * 0.075, Math.sin(spokeAngle) * 0.075, 0);
    spokeMesh.rotation.z = spokeAngle - Math.PI / 2;
    cockpitSteeringWheel.add(spokeMesh);
  }
  root.add(cockpitSteeringWheel);

  // 5. LIGHTS & LENSES
  // Headlight lenses
  const headlightLensGeo = new THREE.BoxGeometry(0.34, 0.12, 0.05);
  const headlightLensL = new THREE.Mesh(headlightLensGeo, headlightOffMat);
  headlightLensL.position.set(-0.68, 0.62, 2.18);
  root.add(headlightLensL);

  const headlightLensR = new THREE.Mesh(headlightLensGeo, headlightOffMat.clone());
  headlightLensR.position.set(0.68, 0.62, 2.18);
  root.add(headlightLensR);

  // Spotlights for nighttime illumination
  const headlightL = new THREE.SpotLight(0xfffaed, 0, 70, Math.PI / 6, 0.45, 1.2);
  headlightL.position.set(-0.68, 0.62, 2.2);
  const targetL = new THREE.Object3D();
  targetL.position.set(-0.68, 0.1, 20);
  root.add(targetL);
  headlightL.target = targetL;
  root.add(headlightL);

  const headlightR = new THREE.SpotLight(0xfffaed, 0, 70, Math.PI / 6, 0.45, 1.2);
  headlightR.position.set(0.68, 0.62, 2.2);
  const targetR = new THREE.Object3D();
  targetR.position.set(0.68, 0.1, 20);
  root.add(targetR);
  headlightR.target = targetR;
  root.add(headlightR);

  // Taillights & Brake lights
  const brakeLightGeo = new THREE.BoxGeometry(0.38, 0.12, 0.04);
  const brakeLightMeshL = new THREE.Mesh(brakeLightGeo, brakeLightMat);
  brakeLightMeshL.position.set(-0.68, 0.66, -2.18);
  root.add(brakeLightMeshL);

  const brakeLightMeshR = new THREE.Mesh(brakeLightGeo, brakeLightMat.clone());
  brakeLightMeshR.position.set(0.68, 0.66, -2.18);
  root.add(brakeLightMeshR);

  // Reverse lights
  const reverseLightGeo = new THREE.BoxGeometry(0.14, 0.08, 0.04);
  const reverseLightMeshL = new THREE.Mesh(reverseLightGeo, reverseLightMat);
  reverseLightMeshL.position.set(-0.4, 0.66, -2.18);
  root.add(reverseLightMeshL);

  const reverseLightMeshR = new THREE.Mesh(reverseLightGeo, reverseLightMat.clone());
  reverseLightMeshR.position.set(0.4, 0.66, -2.18);
  root.add(reverseLightMeshR);

  // 6. WHEELS BUILDER
  function createWheel(): THREE.Group {
    const wheelGroup = new THREE.Group();

    // Tire
    const tireGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.26, 24);
    const tire = new THREE.Mesh(tireGeo, tireMaterial);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    wheelGroup.add(tire);

    // Rim outer lip
    const rimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.27, 20);
    const rim = new THREE.Mesh(rimGeo, rimMaterial);
    rim.rotation.z = Math.PI / 2;
    wheelGroup.add(rim);

    // 5 Rim spokes
    for (let s = 0; s < 5; s++) {
      const angle = (s * 2 * Math.PI) / 5;
      const spokeGeo = new THREE.BoxGeometry(0.04, 0.21, 0.272);
      const spoke = new THREE.Mesh(spokeGeo, rimMaterial);
      spoke.rotation.x = angle;
      wheelGroup.add(spoke);
    }

    // Brake disc inside rim
    const rotorGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.02, 16);
    const rotor = new THREE.Mesh(rotorGeo, brakeRotorMat);
    rotor.rotation.z = Math.PI / 2;
    wheelGroup.add(rotor);

    // Brake caliper
    const caliperGeo = new THREE.BoxGeometry(0.07, 0.08, 0.06);
    const caliper = new THREE.Mesh(caliperGeo, brakeCaliperMat);
    caliper.position.set(0, 0.13, 0);
    wheelGroup.add(caliper);

    return wheelGroup;
  }

  // Wheel positions: track width = 1.62m, wheelbase = 2.65m
  const wheelY = 0.35;
  const frontZ = 1.35;
  const rearZ = -1.3;
  const halfTrack = 0.92;

  // Front Left Steering Pivot & Wheel
  const frontLeftSteerPivot = new THREE.Group();
  frontLeftSteerPivot.position.set(-halfTrack, wheelY, frontZ);
  const frontLeftWheel = createWheel();
  frontLeftSteerPivot.add(frontLeftWheel);
  root.add(frontLeftSteerPivot);

  // Front Right Steering Pivot & Wheel
  const frontRightSteerPivot = new THREE.Group();
  frontRightSteerPivot.position.set(halfTrack, wheelY, frontZ);
  const frontRightWheel = createWheel();
  frontRightSteerPivot.add(frontRightWheel);
  root.add(frontRightSteerPivot);

  // Rear Wheels (mounted directly without steer pivot)
  const rearLeftWheel = createWheel();
  rearLeftWheel.position.set(-halfTrack, wheelY, rearZ);
  root.add(rearLeftWheel);

  const rearRightWheel = createWheel();
  rearRightWheel.position.set(halfTrack, wheelY, rearZ);
  root.add(rearRightWheel);

  // 7. CONTACT SHADOW PLANE BENEATH VEHICLE
  const shadowGeo = new THREE.PlaneGeometry(2.3, 4.6);
  // Procedural gradient contact shadow texture
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const radGrad = ctx.createRadialGradient(64, 128, 10, 64, 128, 64);
    radGrad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
    radGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.45)');
    radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, 128, 256);
  }
  const shadowTex = new THREE.CanvasTexture(canvas);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.set(0, 0.02, 0); // slightly above ground to prevent z-fighting
  root.add(shadowPlane);

  return {
    rootGroup: root,
    bodyMesh: chassisMesh,
    frontLeftWheel,
    frontRightWheel,
    rearLeftWheel,
    rearRightWheel,
    frontLeftSteerPivot,
    frontRightSteerPivot,
    cockpitSteeringWheel,
    headlightL,
    headlightR,
    headlightLensL,
    headlightLensR,
    brakeLightMeshL,
    brakeLightMeshR,
    reverseLightMeshL,
    reverseLightMeshR,
    driverSeatPos: new THREE.Vector3(-0.38, 1.15, -0.05),
  };
}
