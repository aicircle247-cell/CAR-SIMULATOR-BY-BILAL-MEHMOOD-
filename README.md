# CAR SIMULATOR — By Engr. Bilal Mehmood

**Designed and Developed with Google AI Studio**

A complete, high-fidelity browser-based 3D Car Driving Simulator built with Three.js, TypeScript, and Tailwind CSS. Features realistic vehicle dynamics, interactive on-screen steering wheel with centering spring physics, dedicated accelerator and brake pedals, automatic and manual transmissions, digital dashboard instrumentation, multiple camera perspectives, and interactive driving modes.

---

## 🏎 Features

- **Realistic Vehicle Physics**:
  - Longitudinal powertrain simulation with gear-dependent torque curves.
  - Aerodynamic drag ($F = \frac{1}{2} \rho C_d A v^2$) and rolling resistance.
  - Speed-dependent steering angle for realistic high-speed stability and sharp low-speed maneuvering.
  - Lateral tire slip and controllable drift mechanics with procedural screech audio.
  - Realistic suspension pitch (dive on braking, squat on acceleration) and cornering roll.
  - Physical collision detection against world obstacles, curbs, cones, and AI traffic.

- **Interactive Driving Controls**:
  - **Virtual Steering Wheel**: Touch/drag to steer with natural rotation (up to $\pm 180^\circ$) and smooth configurable spring-return centering.
  - **Pedals**: Dedicated Accelerator (Gas) and Brake pedals with multi-touch pointer capture.
  - **Transmission Selector**: Automatic (P, R, N, D) with safety interlock, plus Manual 5-speed sequential mode with reverse.
  - **Full Desktop Keyboard Support**: WASD / Arrow Keys, Spacebar for handbrake, E for ignition, C for camera cycle, L for headlights, R for reset.

- **Dynamic Camera Modes**:
  - **Cockpit View**: Driver-seat perspective behind the windshield, showing interior animated steering wheel and dashboard gauges.
  - **Chase Camera**: Third-person follow camera with smooth spring damping and speed-widened dynamic FOV.
  - **Overhead View**: Bird's-eye tactical camera for parking and intersections.

- **Driving Modes & Challenges**:
  - **Free Drive**: Infinite exploration of urban boulevards and highway curves.
  - **Driving School**: 4 progressive lessons (Ignition & Acceleration, Target Braking, Slalom Cone Weaving, Reverse Bay Parking).
  - **Parking Challenge**: Precision bay and parallel parking with real-time alignment and angle score detection.
  - **Time Trial**: 11-checkpoint city circuit with lap timer, splits, and local record saving.
  - **Traffic Practice**: Navigate around live AI traffic vehicles without collisions.

- **Procedural Web Audio Engine**:
  - Pure Web Audio API synthesis (zero external `.mp3` files or 404s).
  - Throaty multi-oscillator engine with dynamic pitch and low-pass filtering based on RPM and throttle load.
  - Starter crank & ignition roar.
  - Tire squeal, collision thuds, and transmission gear clunks.

---

## 🕹 Controls Guide

| Action | Desktop Keyboard | Mobile / Touch |
|---|---|---|
| **Accelerate** | `W` or `Up Arrow` | Hold **GAS** pedal |
| **Brake / Stop** | `S`, `Down Arrow`, or `Space` | Hold **BRAKE** pedal |
| **Steer Left / Right** | `A` / `D` or `Left` / `Right Arrow` | Drag **Steering Wheel** |
| **Start / Stop Engine** | `E` | Tap **ENGINE** button |
| **Change Camera View** | `C` | Tap **CAMERA** button |
| **Toggle Headlights** | `L` | Tap **💡** button |
| **Reset Vehicle Position** | `R` | Tap **RESET (R)** button |
| **Handbrake / Park** | `Space` | Tap **P-BRAKE** button |
| **Manual Shift Up / Down**| `Shift` / `Ctrl` | Tap `+` / `-` paddles |
| **Pause / Resume** | `P` or `Escape` | Tap **⏸** button |

---

## 🚀 Installation & Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:3000`.

3. **Type-check and Lint**:
   ```bash
   npm run lint
   ```

4. **Production Build**:
   ```bash
   npm run build
   ```

5. **Preview Production Build**:
   ```bash
   npm run preview
   ```

---

## 🌐 Static Hosting & Deployment

The build output in `./dist` is 100% client-side and static:

### Deploy to Vercel
```bash
npx vercel deploy --prod
```

### Deploy to Netlify
```bash
npx netlify deploy --dir=dist --prod
```

### Deploy to GitHub Pages
1. Build the production bundle: `npm run build`
2. Push `./dist` to `gh-pages` branch using `gh-pages` package:
   ```bash
   npx gh-pages -d dist
   ```

### Testing on Android & Mobile Devices
1. Ensure your computer and Android phone are connected to the same Wi-Fi network.
2. Run `npm run dev -- --host`.
3. Open the Network IP displayed in the terminal (e.g. `http://192.168.1.X:3000`) on your mobile Chrome/Firefox browser.
4. Rotate your phone to Landscape mode for an authentic cockpit driving experience.
