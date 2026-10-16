/**
 * What-If Simulation Engine for Krypton Vision AI
 * Computes physics simulation paths, dynamic variable perturbations, and energy invariants.
 */

export interface ProjectileParams {
  initialVelocity: number; // m/s
  angleDeg: number; // degrees
  gravity: number; // m/s^2, default 9.80665
  initialHeight: number; // meters
  airDragCoefficient: number; // 0 for vacuum, e.g. 0.05 for linear air drag
}

export interface TrajectoryPoint {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  kineticEnergy: number;
  potentialEnergy: number;
  totalEnergy: number;
}

export interface ProjectileResult {
  maxHeight: number;
  timeToMaxHeight: number;
  totalFlightTime: number;
  horizontalRange: number;
  impactVelocity: number;
  path: TrajectoryPoint[];
  energyConservationErrorPercent: number;
}

export function simulateProjectile(params: ProjectileParams): ProjectileResult {
  const { initialVelocity, angleDeg, gravity = 9.80665, initialHeight = 0, airDragCoefficient = 0 } = params;
  const angleRad = (angleDeg * Math.PI) / 180;
  
  let vx = initialVelocity * Math.cos(angleRad);
  let vy = initialVelocity * Math.sin(angleRad);
  let x = 0;
  let y = Math.max(0, initialHeight);
  let t = 0;
  const dt = 0.02; // 50 Hz simulation step
  const path: TrajectoryPoint[] = [];

  const mass = 1.0; // 1 kg reference
  const initialTotalEnergy = 0.5 * mass * (initialVelocity ** 2) + mass * gravity * initialHeight;
  let maxHeight = y;
  let timeToMaxHeight = 0;

  while (y >= 0 && t < 30) {
    const speed = Math.hypot(vx, vy);
    const ke = 0.5 * mass * (speed ** 2);
    const pe = mass * gravity * Math.max(0, y);
    const totalE = ke + pe;

    path.push({
      t: Number(t.toFixed(3)),
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
      vx: Number(vx.toFixed(2)),
      vy: Number(vy.toFixed(2)),
      speed: Number(speed.toFixed(2)),
      kineticEnergy: Number(ke.toFixed(2)),
      potentialEnergy: Number(pe.toFixed(2)),
      totalEnergy: Number(totalE.toFixed(2)),
    });

    if (y > maxHeight) {
      maxHeight = y;
      timeToMaxHeight = t;
    }

    // Drag forces
    const fDragX = -airDragCoefficient * vx * speed;
    const fDragY = -airDragCoefficient * vy * speed;

    const ax = fDragX / mass;
    const ay = -gravity + (fDragY / mass);

    vx += ax * dt;
    vy += ay * dt;
    x += vx * dt;
    y += vy * dt;
    t += dt;
  }

  const finalSpeed = path.length > 0 ? path[path.length - 1].speed : initialVelocity;
  const lastE = path.length > 0 ? path[path.length - 1].totalEnergy : initialTotalEnergy;
  const energyLoss = airDragCoefficient === 0 && initialTotalEnergy > 0
    ? Math.abs(initialTotalEnergy - lastE) / initialTotalEnergy * 100
    : 0;

  return {
    maxHeight: Number(maxHeight.toFixed(2)),
    timeToMaxHeight: Number(timeToMaxHeight.toFixed(2)),
    totalFlightTime: Number(t.toFixed(2)),
    horizontalRange: Number(x.toFixed(2)),
    impactVelocity: Number(finalSpeed.toFixed(2)),
    path,
    energyConservationErrorPercent: Number(energyLoss.toFixed(4)),
  };
}

export interface OscillatorParams {
  mass: number; // kg
  springConstant: number; // N/m
  dampingCoefficient: number; // N*s/m
  initialDisplacement: number; // meters
  duration: number; // seconds
}

export interface OscillatorPoint {
  t: number;
  x: number;
  v: number;
  ke: number;
  pe: number;
  totalE: number;
}

export function simulateOscillator(params: OscillatorParams): {
  points: OscillatorPoint[];
  naturalFreqHz: number;
  dampingRatio: number;
  regime: 'UNDERDAMPED' | 'CRITICALLY_DAMPED' | 'OVERDAMPED';
} {
  const { mass, springConstant, dampingCoefficient, initialDisplacement, duration = 6 } = params;
  const omega0 = Math.sqrt(springConstant / mass);
  const naturalFreqHz = omega0 / (2 * Math.PI);
  const gamma = dampingCoefficient / (2 * mass);
  const dampingRatio = gamma / omega0;

  let regime: 'UNDERDAMPED' | 'CRITICALLY_DAMPED' | 'OVERDAMPED' = 'UNDERDAMPED';
  if (Math.abs(dampingRatio - 1) < 0.05) regime = 'CRITICALLY_DAMPED';
  else if (dampingRatio > 1) regime = 'OVERDAMPED';

  const dt = 0.02;
  let t = 0;
  let x = initialDisplacement;
  let v = 0;
  const points: OscillatorPoint[] = [];

  while (t <= duration) {
    const ke = 0.5 * mass * v * v;
    const pe = 0.5 * springConstant * x * x;
    points.push({
      t: Number(t.toFixed(3)),
      x: Number(x.toFixed(3)),
      v: Number(v.toFixed(3)),
      ke: Number(ke.toFixed(3)),
      pe: Number(pe.toFixed(3)),
      totalE: Number((ke + pe).toFixed(3)),
    });

    const fSpring = -springConstant * x;
    const fDamp = -dampingCoefficient * v;
    const a = (fSpring + fDamp) / mass;

    v += a * dt;
    x += v * dt;
    t += dt;
  }

  return {
    points,
    naturalFreqHz: Number(naturalFreqHz.toFixed(2)),
    dampingRatio: Number(dampingRatio.toFixed(3)),
    regime,
  };
}

export interface OpticsParams {
  focalLengthMm: number; // positive for convex lens, negative for concave
  objectDistanceMm: number; // positive distance from lens
  objectHeightMm: number;
}

export function simulateThinLens(params: OpticsParams): {
  imageDistanceMm: number;
  imageHeightMm: number;
  magnification: number;
  isReal: boolean;
  isInverted: boolean;
  formulaResidual: number;
} {
  const { focalLengthMm, objectDistanceMm, objectHeightMm } = params;
  // Gaussian lens equation: 1/f = 1/do + 1/di => 1/di = 1/f - 1/do
  const invDi = (1 / focalLengthMm) - (1 / objectDistanceMm);
  const imageDistanceMm = Math.abs(invDi) > 1e-6 ? 1 / invDi : Infinity;
  const magnification = isFinite(imageDistanceMm) ? - (imageDistanceMm / objectDistanceMm) : 0;
  const imageHeightMm = magnification * objectHeightMm;

  // Cross check 1/f vs 1/do + 1/di
  const residual = isFinite(imageDistanceMm) 
    ? Math.abs((1 / focalLengthMm) - (1 / objectDistanceMm + 1 / imageDistanceMm))
    : 0;

  return {
    imageDistanceMm: Number(imageDistanceMm.toFixed(2)),
    imageHeightMm: Number(imageHeightMm.toFixed(2)),
    magnification: Number(magnification.toFixed(2)),
    isReal: imageDistanceMm > 0,
    isInverted: magnification < 0,
    formulaResidual: residual,
  };
}
