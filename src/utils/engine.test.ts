import test from 'node:test';
import assert from 'node:assert/strict';
import { distance, analyzeTriangle, analyzePolygon, calculateShoelaceArea } from './geometry.ts';
import { verifyTriangle, verifyEulerCharacteristic, computeCalibration } from './selfChecking.ts';
import { simulateProjectile, simulateOscillator, simulateThinLens } from './physics.ts';
import { solveQuadratic, solveLinear } from './mathSolver.ts';

test('distance calculates Euclidean metric correctly', () => {
  const d = distance({ x: 0, y: 0 }, { x: 3, y: 4 });
  assert.equal(d, 5);
});

test('Shoelace formula computes correct polygon area', () => {
  // Rectangle of width 10, height 5 => area 50
  const rect = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 5 },
    { x: 0, y: 5 },
  ];
  assert.equal(calculateShoelaceArea(rect), 50);
});

test('analyzeTriangle validates right triangle 3-4-5', () => {
  const p1 = { x: 0, y: 0 };
  const p2 = { x: 3, y: 0 };
  const p3 = { x: 0, y: 4 };
  const t = analyzeTriangle(p1, p2, p3);
  assert.equal(t.isRightAngled, true);
  assert.equal(Math.round(t.areaShoelace), 6);
  assert.equal(Math.round(t.areaHeron), 6);
  assert.equal(Math.round(t.perimeter), 12);
});

test('verifyTriangle passes self-checking invariants', () => {
  const p1 = { x: 0, y: 0 };
  const p2 = { x: 60, y: 0 };
  const p3 = { x: 30, y: 51.9615 }; // Equilateral triangle approx
  const res = verifyTriangle(p1, p2, p3);
  assert.equal(res.allPassed, true);
  assert.ok(res.checks.length >= 3);
});

test('verifyEulerCharacteristic verifies cube topology V-E+F=2', () => {
  // Cube: 8 vertices, 12 edges, 6 faces => 8 - 12 + 6 = 2
  const check = verifyEulerCharacteristic(8, 12, 6);
  assert.equal(check.passed, true);
  assert.equal(check.valA, 2);
});

test('computeCalibration correctly scales px to mm and calculates uncertainty', () => {
  // Reference card: 85.6 mm across 856 px => 10 px/mm
  const calib = computeCalibration(85.6, 856, 2.0);
  assert.equal(Math.round(calib.pixelsPerMillimeter), 10);
  assert.equal(calib.physicalUncertaintyMm, 0.2); // 2.0 px / 10 px/mm = 0.2 mm
});

test('simulateProjectile calculates parabolic path and energy', () => {
  const res = simulateProjectile({
    initialVelocity: 20,
    angleDeg: 45,
    gravity: 9.8,
    initialHeight: 0,
    airDragCoefficient: 0,
  });
  assert.ok(res.maxHeight > 9 && res.maxHeight < 11);
  assert.ok(res.horizontalRange > 39 && res.horizontalRange < 42);
  assert.ok(res.path.length > 10);
});

test('solveQuadratic computes correct roots for x^2 - 5x + 6 = 0', () => {
  const sol = solveQuadratic(1, -5, 6);
  assert.equal(sol.verification.passed, true);
  assert.deepEqual(sol.solutions, [3, 2]);
});

test('simulateThinLens satisfies Gaussian lens equation', () => {
  // f = 50mm, do = 100mm => di = 100mm (magnification = -1)
  const lens = simulateThinLens({
    focalLengthMm: 50,
    objectDistanceMm: 100,
    objectHeightMm: 10,
  });
  assert.equal(lens.imageDistanceMm, 100);
  assert.equal(lens.magnification, -1);
  assert.equal(lens.isReal, true);
  assert.ok(lens.formulaResidual < 1e-5);
});

test('recognizeDrawnShape detects hand-drawn triangle', async () => {
  const { recognizeDrawnShape } = await import('./shapeRecognizer.ts');
  // Generate points forming a triangle (0,0) -> (100, 0) -> (50, 80) -> (0,0)
  const trianglePoints = [];
  for (let x = 0; x <= 100; x += 10) trianglePoints.push({ x, y: 0 });
  for (let t = 0; t <= 1; t += 0.1) trianglePoints.push({ x: 100 - t * 50, y: t * 80 });
  for (let t = 0; t <= 1; t += 0.1) trianglePoints.push({ x: 50 - t * 50, y: 80 - t * 80 });

  const recognized = recognizeDrawnShape(trianglePoints);
  assert.equal(recognized.type, 'TRIANGLE');
  assert.ok(recognized.vertices.length === 3);
  assert.ok(recognized.area > 3500 && recognized.area < 4500);
});

test('recognizeDrawnShape detects circular air gesture stroke', async () => {
  const { recognizeDrawnShape } = await import('./shapeRecognizer.ts');
  const circlePoints = [];
  const r = 50;
  for (let a = 0; a <= 2 * Math.PI; a += 0.2) {
    circlePoints.push({ x: 100 + r * Math.cos(a), y: 100 + r * Math.sin(a) });
  }
  const recognized = recognizeDrawnShape(circlePoints);
  assert.equal(recognized.type, 'CIRCLE');
  assert.ok(recognized.radius && recognized.radius > 45 && recognized.radius < 55);
});

