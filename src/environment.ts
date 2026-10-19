import * as THREE from 'three';
import { CollisionObstacle } from './physics';
import { Checkpoint, ParkingBay } from './types';

export interface WorldEnvironment {
  scene: THREE.Scene;
  obstacles: CollisionObstacle[];
  checkpoints: Checkpoint[];
  parkingBays: ParkingBay[];
  updateTraffic: (dt: number, playerPos: THREE.Vector3) => void;
  setTimeOfDay: (time: 'day' | 'sunset' | 'night') => void;
  updateCheckpointVisuals: (activeCheckpointId: number) => void;
  checkpointMeshes: THREE.Group[];
}

export function buildEnvironment(scene: THREE.Scene): WorldEnvironment {
  const obstacles: CollisionObstacle[] = [];
  const checkpoints: Checkpoint[] = [];
  const parkingBays: ParkingBay[] = [];
  const checkpointMeshes: THREE.Group[] = [];

  // 1. SKY & FOG SETUP
  scene.background = new THREE.Color(0x89b6e8);
  scene.fog = new THREE.FogExp2(0x89b6e8, 0.0035);

  // 2. LIGHTING RIG
  const hemiLight = new THREE.HemisphereLight(0xe8f0ff, 0x3d4a38, 0.7);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xfffaed, 1.3);
  sunLight.position.set(60, 90, 50);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 10;
  sunLight.shadow.camera.far = 280;
  const shadowDist = 110;
  sunLight.shadow.camera.left = -shadowDist;
  sunLight.shadow.camera.right = shadowDist;
  sunLight.shadow.camera.top = shadowDist;
  sunLight.shadow.camera.bottom = -shadowDist;
  sunLight.shadow.bias = -0.0004;
  scene.add(sunLight);

  // 3. TERRAIN & GROUND
  // Vast grass ground plane
  const grassMat = new THREE.MeshStandardMaterial({
    color: 0x2e5c26,
    roughness: 0.9,
    metalness: 0.05,
  });
  const groundGeo = new THREE.PlaneGeometry(600, 600, 4, 4);
  const groundMesh = new THREE.Mesh(groundGeo, grassMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.y = -0.01;
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  // 4. PROCEDURAL ASPHALT & ROAD NETWORK
  // Procedural road canvas texture with road markings
  function createRoadTexture(lanes: number = 2, hasCrosswalk: boolean = false): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Asphalt dark gray
    ctx.fillStyle = '#23252b';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle asphalt grain
    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#2b2e36' : '#1c1e23';
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }

    // Yellow solid shoulder lines
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(25, 0);
    ctx.lineTo(25, 512);
    ctx.moveTo(487, 0);
    ctx.lineTo(487, 512);
    ctx.stroke();

    // White dashed center line
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 8;
    ctx.setLineDash([36, 28]);
    ctx.beginPath();
    ctx.moveTo(256, 0);
    ctx.lineTo(256, 512);
    ctx.stroke();

    if (hasCrosswalk) {
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffffff';
      for (let y = 140; y < 360; y += 45) {
        ctx.fillRect(50, y, 412, 24);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  const roadTex = createRoadTexture(2, false);
  roadTex.repeat.set(1, 16);

  const roadCrossTex = createRoadTexture(2, true);
  roadCrossTex.repeat.set(1, 2);

  const roadMaterial = new THREE.MeshStandardMaterial({
    map: roadTex,
    roughness: 0.85,
    metalness: 0.1,
  });

  const roadCrossMat = new THREE.MeshStandardMaterial({
    map: roadCrossTex,
    roughness: 0.85,
    metalness: 0.1,
  });

  const sidewalkMat = new THREE.MeshStandardMaterial({
    color: 0x9ca3af,
    roughness: 0.75,
    metalness: 0.1,
  });

  const curbMat = new THREE.MeshStandardMaterial({
    color: 0x6b7280,
    roughness: 0.8,
  });

  // Helper to add straight road segment with sidewalks and curbs
  function addRoadSegment(x: number, z: number, width: number, length: number, rotY: number = 0, isCrosswalk: boolean = false) {
    const roadGroup = new THREE.Group();
    roadGroup.position.set(x, 0.01, z);
    roadGroup.rotation.y = rotY;

    // Road surface
    const roadPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(width, length),
      isCrosswalk ? roadCrossMat : roadMaterial
    );
    roadPlane.rotation.x = -Math.PI / 2;
    roadPlane.receiveShadow = true;
    roadGroup.add(roadPlane);

    // Left Sidewalk + Curb
    const sidewalkWidth = 3.2;
    const curbHeight = 0.18;

    const leftWalk = new THREE.Mesh(
      new THREE.BoxGeometry(sidewalkWidth, curbHeight, length),
      sidewalkMat
    );
    leftWalk.position.set(-(width / 2 + sidewalkWidth / 2), curbHeight / 2, 0);
    leftWalk.receiveShadow = true;
    roadGroup.add(leftWalk);

    // Right Sidewalk + Curb
    const rightWalk = new THREE.Mesh(
      new THREE.BoxGeometry(sidewalkWidth, curbHeight, length),
      sidewalkMat
    );
    rightWalk.position.set(width / 2 + sidewalkWidth / 2, curbHeight / 2, 0);
    rightWalk.receiveShadow = true;
    roadGroup.add(rightWalk);

    scene.add(roadGroup);
  }

  // 5. CITY ROAD GRID & HIGHWAY CIRCUIT
  const roadW = 15; // 4-lane width
  // North-South Main Boulevards
  addRoadSegment(0, 0, roadW, 260, 0);
  addRoadSegment(-70, 0, roadW, 260, 0);
  addRoadSegment(70, 0, roadW, 260, 0);

  // East-West Connecting Avenues
  addRoadSegment(0, 90, roadW, 220, Math.PI / 2);
  addRoadSegment(0, -90, roadW, 220, Math.PI / 2);
  addRoadSegment(0, 0, roadW, 220, Math.PI / 2);

  // Intersections with crosswalks
  [[-70, 90], [0, 90], [70, 90], [-70, 0], [0, 0], [70, 0], [-70, -90], [0, -90], [70, -90]].forEach(([ix, iz]) => {
    addRoadSegment(ix, iz, roadW, roadW, 0, true);
  });

  // 6. BUILDINGS & CITY BLOCKS
  const buildingColors = [0x253342, 0x1e293b, 0x334155, 0x475569, 0x1f2937, 0x2c3e50];
  const glassWindowMat = new THREE.MeshPhysicalMaterial({
    color: 0x4a7c9f,
    roughness: 0.15,
    metalness: 0.85,
    clearcoat: 1.0,
  });

  function createBuilding(bx: number, bz: number, bw: number, bd: number, bh: number) {
    const col = buildingColors[Math.floor(Math.random() * buildingColors.length)];
    const bMat = new THREE.MeshStandardMaterial({
      color: col,
      roughness: 0.7,
      metalness: 0.25,
    });
    const bGroup = new THREE.Group();
    bGroup.position.set(bx, 0, bz);

    // Main tower
    const tower = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), bMat);
    tower.position.set(0, bh / 2, 0);
    tower.castShadow = true;
    tower.receiveShadow = true;
    bGroup.add(tower);

    // Window decorative bands
    const windowBandCount = Math.floor(bh / 6);
    for (let w = 1; w < windowBandCount; w++) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.15, 1.8, bd + 0.15), glassWindowMat);
      band.position.set(0, w * 5.5, 0);
      bGroup.add(band);
    }

    // Roof parapet / AC units
    const acUnit = new THREE.Mesh(new THREE.BoxGeometry(3, 1.8, 3), new THREE.MeshStandardMaterial({ color: 0x555555 }));
    acUnit.position.set(bw * 0.2, bh + 0.9, bd * 0.2);
    bGroup.add(acUnit);

    scene.add(bGroup);

    // Add to collision obstacles
    obstacles.push({
      id: `building_${bx}_${bz}`,
      type: 'box',
      position: new THREE.Vector3(bx, bh / 2, bz),
      size: new THREE.Vector3(bw + 1.2, bh, bd + 1.2),
    });
  }

  // Populate city blocks between roads
  const blockCenters = [
    // NW Quad
    { x: -35, z: 45 }, { x: -105, z: 45 }, { x: -35, z: 125 }, { x: -105, z: 125 },
    // NE Quad
    { x: 35, z: 45 }, { x: 105, z: 45 }, { x: 35, z: 125 }, { x: 105, z: 125 },
    // SW Quad
    { x: -35, z: -45 }, { x: -105, z: -45 }, { x: -35, z: -125 }, { x: -105, z: -125 },
    // SE Quad (Reserved partially for Driving School & Parking)
    { x: 35, z: -45 }, { x: 105, z: -45 }, { x: 105, z: -125 },
  ];

  blockCenters.forEach((blk, idx) => {
    // Generate cluster of 2-3 buildings per block
    const h1 = 28 + (idx % 5) * 14;
    const h2 = 20 + ((idx * 3) % 4) * 10;
    createBuilding(blk.x - 7, blk.z - 7, 24, 24, h1);
    createBuilding(blk.x + 8, blk.z + 8, 16, 16, h2);
  });

  // 7. INSTANCED TREES & STREETLIGHTS
  const treeTrunkGeo = new THREE.CylinderGeometry(0.22, 0.32, 2.8, 8);
  const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x4a2e18, roughness: 0.9 });
  const treeLeavesGeo = new THREE.ConeGeometry(1.6, 4.2, 8);
  const treeLeavesMat = new THREE.MeshStandardMaterial({ color: 0x226b2d, roughness: 0.8 });

  function plantTree(x: number, z: number) {
    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, 0, z);

    const trunk = new THREE.Mesh(treeTrunkGeo, treeTrunkMat);
    trunk.position.set(0, 1.4, 0);
    trunk.castShadow = true;
    treeGroup.add(trunk);

    const leaves1 = new THREE.Mesh(treeLeavesGeo, treeLeavesMat);
    leaves1.position.set(0, 3.8, 0);
    leaves1.castShadow = true;
    treeGroup.add(leaves1);

    const leaves2 = new THREE.Mesh(new THREE.ConeGeometry(1.2, 3.2, 8), treeLeavesMat);
    leaves2.position.set(0, 5.2, 0);
    leaves2.castShadow = true;
    treeGroup.add(leaves2);

    scene.add(treeGroup);

    obstacles.push({
      id: `tree_${x}_${z}`,
      type: 'cylinder',
      position: new THREE.Vector3(x, 1.5, z),
      size: new THREE.Vector3(0.5, 3, 0.5),
    });
  }

  // Plant trees along sidewalks
  for (let z = -120; z <= 120; z += 24) {
    if (Math.abs(z) === 90 || Math.abs(z) === 0) continue; // skip intersections
    plantTree(-10, z);
    plantTree(10, z);
    plantTree(-60, z);
    plantTree(-80, z);
    plantTree(60, z);
    plantTree(80, z);
  }

  // Streetlights
  const lampPoleGeo = new THREE.CylinderGeometry(0.08, 0.12, 6.5, 8);
  const lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.8, roughness: 0.3 });
  const lampHeadMat = new THREE.MeshStandardMaterial({ color: 0xfff3d4, emissive: 0xffd97d, emissiveIntensity: 0.8 });

  function addStreetLamp(x: number, z: number) {
    const lamp = new THREE.Group();
    lamp.position.set(x, 0, z);

    const pole = new THREE.Mesh(lampPoleGeo, lampPoleMat);
    pole.position.set(0, 3.25, 0);
    lamp.add(pole);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.12), lampPoleMat);
    arm.position.set(x > 0 ? -0.8 : 0.8, 6.3, 0);
    lamp.add(arm);

    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 0.25), lampHeadMat);
    bulb.position.set(x > 0 ? -1.5 : 1.5, 6.15, 0);
    lamp.add(bulb);

    scene.add(lamp);

    obstacles.push({
      id: `lamp_${x}_${z}`,
      type: 'cylinder',
      position: new THREE.Vector3(x, 3, z),
      size: new THREE.Vector3(0.35, 6.5, 0.35),
    });
  }

  [-10.5, 10.5].forEach(lx => {
    [-110, -50, 50, 110].forEach(lz => {
      addStreetLamp(lx, lz);
    });
  });

  // 8. DRIVING SCHOOL & TRAINING GROUNDS ZONE (Located at southeast block x: 35, z: -125)
  const trainingLotW = 54;
  const trainingLotL = 60;
  const trainingLotMat = new THREE.MeshStandardMaterial({
    color: 0x32353b,
    roughness: 0.8,
  });
  const trainingLot = new THREE.Mesh(
    new THREE.PlaneGeometry(trainingLotW, trainingLotL),
    trainingLotMat
  );
  trainingLot.rotation.x = -Math.PI / 2;
  trainingLot.position.set(38, 0.02, -125);
  trainingLot.receiveShadow = true;
  scene.add(trainingLot);

  // Training Ground Entrance curb
  const lotBorderMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });
  const coneMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 });
  const coneStripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });

  function createTrafficCone(cx: number, cz: number) {
    const coneGroup = new THREE.Group();
    coneGroup.position.set(cx, 0, cz);

    const base = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.06, 0.48), coneMat);
    coneGroup.add(base);

    const body = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.72, 16), coneMat);
    body.position.set(0, 0.36, 0);
    coneGroup.add(body);

    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.16, 16), coneStripeMat);
    stripe.position.set(0, 0.36, 0);
    coneGroup.add(stripe);

    scene.add(coneGroup);

    obstacles.push({
      id: `cone_${cx}_${cz}`,
      type: 'cylinder',
      position: new THREE.Vector3(cx, 0.4, cz),
      size: new THREE.Vector3(0.28, 0.8, 0.28),
    });
  }

  // Slalom cone course in training area
  for (let c = 0; c < 5; c++) {
    createTrafficCone(38, -145 + c * 10);
  }

  // 9. PARKING CHALLENGE ZONE (Bays with marked lines)
  // Stop box / Stop line for Lesson 2
  const stopBoxMat = new THREE.MeshBasicMaterial({ color: 0xeab308, transparent: true, opacity: 0.7 });
  const stopBox = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 6.2), stopBoxMat);
  stopBox.rotation.x = -Math.PI / 2;
  stopBox.position.set(0, 0.03, 40);
  scene.add(stopBox);

  // Parking Bays (Parallel, Bay 90°, and Angled)
  function createParkingBay(id: string, name: string, px: number, pz: number, rotY: number, w: number, l: number, type: 'bay90' | 'parallel' | 'angled') {
    const bayGroup = new THREE.Group();
    bayGroup.position.set(px, 0.025, pz);
    bayGroup.rotation.y = rotY;

    // Green translucent target floor indicator
    const bayFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(w - 0.2, l - 0.2),
      new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.35 })
    );
    bayFloor.rotation.x = -Math.PI / 2;
    bayGroup.add(bayFloor);

    // Yellow boundary lines (3 sides)
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const sideLineL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, l), lineMat);
    sideLineL.position.set(-w / 2, 0.01, 0);
    bayGroup.add(sideLineL);

    const sideLineR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, l), lineMat);
    sideLineR.position.set(w / 2, 0.01, 0);
    bayGroup.add(sideLineR);

    const backLine = new THREE.Mesh(new THREE.BoxGeometry(w, 0.02, 0.12), lineMat);
    backLine.position.set(0, 0.01, -l / 2);
    bayGroup.add(backLine);

    // Rubber parking curb stopper at the back
    const stopper = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.75, 0.16, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.7 })
    );
    stopper.position.set(0, 0.08, -l / 2 + 0.45);
    bayGroup.add(stopper);

    scene.add(bayGroup);

    parkingBays.push({
      id,
      name,
      position: [px, 0, pz],
      rotationY: rotY,
      size: [w, l],
      type,
    });
  }

  // Parking Bays placed in training & city lot
  createParkingBay('bay1', 'Bay 90° (Standard)', 24, -120, 0, 3.2, 5.8, 'bay90');
  createParkingBay('bay2', 'Parallel Parking', 52, -120, Math.PI / 2, 3.2, 6.8, 'parallel');
  createParkingBay('bay3', 'Angled Parking', 38, -104, Math.PI / 4, 3.4, 5.8, 'angled');

  // 10. TIME TRIAL CHECKPOINTS & HOLOGRAPHIC GATES
  const checkpointPositions: [number, number, number][] = [
    [0, 0, 20],
    [0, 0, 75],
    [40, 0, 90],
    [70, 0, 45],
    [70, 0, -45],
    [35, 0, -90],
    [-40, 0, -90],
    [-70, 0, -45],
    [-70, 0, 45],
    [-35, 0, 90],
    [0, 0, 0], // Finish line
  ];

  checkpointPositions.forEach((pos, idx) => {
    const isFinish = idx === checkpointPositions.length - 1;
    checkpoints.push({
      id: idx,
      position: pos,
      radius: 8.5,
      passed: false,
      name: isFinish ? 'FINISH' : `CP ${idx + 1}`,
    });

    // Holographic arch ring visual
    const gateGroup = new THREE.Group();
    gateGroup.position.set(pos[0], 0, pos[2]);

    const ringGeo = new THREE.TorusGeometry(5.2, 0.22, 12, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: isFinish ? 0xf59e0b : 0x06b6d4,
      transparent: true,
      opacity: 0.85,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(0, 4.5, 0);
    gateGroup.add(ring);

    // Glowing gate vertical pillars
    [-5, 5].forEach(px => {
      const pGeo = new THREE.CylinderGeometry(0.18, 0.22, 9, 12);
      const pillar = new THREE.Mesh(pGeo, ringMat);
      pillar.position.set(px, 4.5, 0);
      gateGroup.add(pillar);
    });

    scene.add(gateGroup);
    checkpointMeshes.push(gateGroup);
  });

  // 11. TRAFFIC VEHICLES (AI cars)
  const trafficColors = [0xd97706, 0xdc2626, 0x2563eb, 0x16a34a, 0x9333ea, 0x475569];
  const trafficVehicles: Array<{
    mesh: THREE.Group;
    x: number;
    z: number;
    speed: number;
    direction: number; // 1 or -1
    axis: 'x' | 'z';
    fixedCoord: number;
  }> = [];

  function createSimpleTrafficCar(colorHex: number): THREE.Group {
    const car = new THREE.Group();
    const tMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.3, metalness: 0.6 });
    const winMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 });

    const lower = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 4.0), tMat);
    lower.position.y = 0.5;
    lower.castShadow = true;
    car.add(lower);

    const upper = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 2.2), winMat);
    upper.position.set(0, 0.95, -0.2);
    car.add(upper);

    // Wheels
    const wMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    [[-0.9, 0.3, 1.2], [0.9, 0.3, 1.2], [-0.9, 0.3, -1.2], [0.9, 0.3, -1.2]].forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 12), wMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, wy, wz);
      car.add(wheel);
    });

    scene.add(car);
    return car;
  }

  // Spawn 6 traffic cars on different lanes
  const trafficConfigs = [
    { axis: 'z' as const, fixed: 3.5, dir: 1, startZ: -80, speed: 11 },
    { axis: 'z' as const, fixed: -3.5, dir: -1, startZ: 80, speed: 12 },
    { axis: 'z' as const, fixed: 73.5, dir: 1, startZ: -40, speed: 10 },
    { axis: 'z' as const, fixed: -66.5, dir: -1, startZ: 50, speed: 13 },
    { axis: 'x' as const, fixed: 93.5, dir: 1, startX: -80, speed: 10 },
    { axis: 'x' as const, fixed: -86.5, dir: -1, startX: 60, speed: 11 },
  ];

  trafficConfigs.forEach((cfg, idx) => {
    const col = trafficColors[idx % trafficColors.length];
    const mesh = createSimpleTrafficCar(col);
    const startX = cfg.axis === 'z' ? cfg.fixed : (cfg as any).startX;
    const startZ = cfg.axis === 'z' ? (cfg as any).startZ : cfg.fixed;
    mesh.position.set(startX, 0, startZ);
    mesh.rotation.y = cfg.axis === 'z' ? (cfg.dir > 0 ? 0 : Math.PI) : (cfg.dir > 0 ? Math.PI / 2 : -Math.PI / 2);

    trafficVehicles.push({
      mesh,
      x: startX,
      z: startZ,
      speed: cfg.speed,
      direction: cfg.dir,
      axis: cfg.axis,
      fixedCoord: cfg.fixed,
    });

    // Add traffic car obstacle
    obstacles.push({
      id: `traffic_${idx}`,
      type: 'box',
      position: mesh.position,
      size: new THREE.Vector3(2.0, 1.4, 4.2),
      isDynamic: true,
    });
  });

  // Traffic update function
  function updateTraffic(dt: number, playerPos: THREE.Vector3) {
    trafficVehicles.forEach((tv, idx) => {
      let speed = tv.speed;
      const move = speed * dt * tv.direction;

      if (tv.axis === 'z') {
        tv.z += move;
        if (tv.z > 125) tv.z = -125;
        if (tv.z < -125) tv.z = 125;
        tv.mesh.position.set(tv.fixedCoord, 0, tv.z);
      } else {
        tv.x += move;
        if (tv.x > 125) tv.x = -125;
        if (tv.x < -125) tv.x = 125;
        tv.mesh.position.set(tv.x, 0, tv.fixedCoord);
      }

      // Update corresponding dynamic collision obstacle position
      const obs = obstacles.find(o => o.id === `traffic_${idx}`);
      if (obs) {
        obs.position.copy(tv.mesh.position);
      }
    });
  }

  // Time of Day changer
  function setTimeOfDay(mode: 'day' | 'sunset' | 'night') {
    if (mode === 'day') {
      scene.background = new THREE.Color(0x89b6e8);
      (scene.fog as THREE.FogExp2).color.set(0x89b6e8);
      hemiLight.color.set(0xe8f0ff);
      hemiLight.groundColor.set(0x3d4a38);
      hemiLight.intensity = 0.7;
      sunLight.color.set(0xfffaed);
      sunLight.intensity = 1.3;
      sunLight.position.set(60, 90, 50);
    } else if (mode === 'sunset') {
      scene.background = new THREE.Color(0xf59e0b);
      (scene.fog as THREE.FogExp2).color.set(0xf59e0b);
      hemiLight.color.set(0xfde68a);
      hemiLight.groundColor.set(0x78350f);
      hemiLight.intensity = 0.6;
      sunLight.color.set(0xf97316);
      sunLight.intensity = 1.1;
      sunLight.position.set(110, 25, 50);
    } else {
      // Night
      scene.background = new THREE.Color(0x070b14);
      (scene.fog as THREE.FogExp2).color.set(0x070b14);
      hemiLight.color.set(0x1e293b);
      hemiLight.groundColor.set(0x05070a);
      hemiLight.intensity = 0.25;
      sunLight.color.set(0x38bdf8);
      sunLight.intensity = 0.2;
      sunLight.position.set(40, 80, 40);
    }
  }

  function updateCheckpointVisuals(activeId: number) {
    checkpointMeshes.forEach((mesh, idx) => {
      const ring = mesh.children[0] as THREE.Mesh;
      if (idx === activeId) {
        (ring.material as THREE.MeshBasicMaterial).color.set(0x10b981);
        mesh.visible = true;
      } else if (idx < activeId) {
        mesh.visible = false;
      } else {
        (ring.material as THREE.MeshBasicMaterial).color.set(0x0284c7);
        mesh.visible = true;
      }
    });
  }

  return {
    scene,
    obstacles,
    checkpoints,
    parkingBays,
    updateTraffic,
    setTimeOfDay,
    updateCheckpointVisuals,
    checkpointMeshes,
  };
}
