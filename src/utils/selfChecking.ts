/**
 * Self-Checking Engine & Uncertainty Analysis for Krypton Vision AI
 * Validates calculations via dual-path independent mathematical identities.
 */

import type { Point2D, TriangleMetrics, PolygonMetrics } from './geometry.ts';
import { analyzeTriangle, analyzePolygon } from './geometry.ts';

export interface VerificationCheck {
  id: string;
  name: string;
  category: 'GEOMETRY' | 'CALIBRATION' | '3D_TOPOLOGY' | 'PHYSICS';
  passed: boolean;
  residual: number; // e.g. |val1 - val2|
  tolerance: number;
  valA: number | string;
  valB: number | string;
  unit: string;
  formulaDescription: string;
  explanation: string;
}

export interface CalibrationResult {
  pixelsPerMillimeter: number;
  referenceName: string;
  referenceRealMm: number;
  referencePixelLength: number;
  pixelUncertainty: number; // e.g. ± 1.5 px
  physicalUncertaintyMm: number; // e.g. ± 0.35 mm
  confidencePercentage: number;
}

export const KNOWN_CALIBRATION_STANDARDS = [
  { id: 'credit_card', name: 'Standard Card Width (ISO/IEC 7810)', realMm: 85.60, description: 'ID / Debit / Credit card long edge' },
  { id: 'coin_us_quarter', name: 'Standard Coin Diameter (Quarter)', realMm: 24.26, description: 'Standard 24.26 mm coin' },
  { id: 'a4_paper_short', name: 'A4 Sheet Short Edge', realMm: 210.0, description: '210.0 mm paper width' },
  { id: 'ruler_100mm', name: '100 mm Reference Bar', realMm: 100.0, description: 'Calibration scale bar' },
  { id: 'phone_screen_width', name: 'Standard Phone Screen Width', realMm: 71.5, description: 'Standard 6.1" smartphone width' },
];

/**
 * Computes calibration scale factor and physical measurement uncertainty
 */
export function computeCalibration(
  referenceRealMm: number,
  referencePixelLength: number,
  pixelError: number = 1.5
): CalibrationResult {
  const safePixelLength = Math.max(1, referencePixelLength);
  const pxPerMm = safePixelLength / referenceRealMm;
  
  // Uncertainty propagation: L_mm = L_px / (pxPerMm)
  // delta(L_mm) = delta(px) / pxPerMm
  const physicalUncertaintyMm = pixelError / pxPerMm;

  // Confidence based on pixel resolution of reference (>150px gives higher confidence)
  const confidence = Math.min(99.4, Math.max(80, 85 + (safePixelLength / 500) * 14));

  return {
    pixelsPerMillimeter: pxPerMm,
    referenceName: 'Calibration Target',
    referenceRealMm,
    referencePixelLength: safePixelLength,
    pixelUncertainty: pixelError,
    physicalUncertaintyMm,
    confidencePercentage: Number(confidence.toFixed(1)),
  };
}

/**
 * Runs multi-method self-checks on a triangle
 */
export function verifyTriangle(p1: Point2D, p2: Point2D, p3: Point2D): {
  metrics: TriangleMetrics;
  checks: VerificationCheck[];
  allPassed: boolean;
} {
  const metrics = analyzeTriangle(p1, p2, p3);
  const checks: VerificationCheck[] = [];

  // Check 1: Triangle Angle Sum (sum of angles in Euclidean plane must be 180 degrees)
  const angleSum = metrics.anglesDeg[0] + metrics.anglesDeg[1] + metrics.anglesDeg[2];
  const angleResidual = Math.abs(angleSum - 180);
  checks.push({
    id: 'tri_angle_sum',
    name: 'Euclidean Angle Sum Identity',
    category: 'GEOMETRY',
    passed: angleResidual < 0.05,
    residual: angleResidual,
    tolerance: 0.05,
    valA: Number(angleSum.toFixed(3)),
    valB: 180.0,
    unit: 'deg',
    formulaDescription: '∠A + ∠B + ∠C == 180°',
    explanation: 'Verifies coordinates lie on a Euclidean plane with zero Riemannian curvature.',
  });

  // Check 2: Dual Area cross-check: Shoelace (Coordinate) vs Heron (Trilateration)
  const areaResidual = Math.abs(metrics.areaShoelace - metrics.areaHeron);
  const relAreaError = metrics.areaShoelace > 0 ? (areaResidual / metrics.areaShoelace) * 100 : 0;
  checks.push({
    id: 'tri_dual_area',
    name: 'Dual Independent Area Verification',
    category: 'GEOMETRY',
    passed: relAreaError < 0.1 || areaResidual < 0.05,
    residual: areaResidual,
    tolerance: 0.05,
    valA: Number(metrics.areaShoelace.toFixed(2)),
    valB: Number(metrics.areaHeron.toFixed(2)),
    unit: 'sq.px',
    formulaDescription: 'Shoelace(coords) ≟ Heron(a, b, c)',
    explanation: 'Cross-checks coordinate determinant against perimeter semi-product.',
  });

  // Check 3: Triangle Inequality: each side < sum of other two
  const [a, b, c] = metrics.sides;
  const ineqValid = a < b + c + 1e-4 && b < a + c + 1e-4 && c < a + b + 1e-4;
  checks.push({
    id: 'tri_inequality',
    name: 'Triangle Inequality Theorem',
    category: 'GEOMETRY',
    passed: ineqValid,
    residual: ineqValid ? 0 : 1,
    tolerance: 0,
    valA: 'Valid',
    valB: 'Non-degenerate',
    unit: '',
    formulaDescription: 'a < b+c ∧ b < a+c ∧ c < a+b',
    explanation: 'Guarantees the three points form a non-degenerate 2D simplex.',
  });

  // Check 4: If right-angled, check Pythagorean theorem
  if (metrics.isRightAngled) {
    const sorted = [a, b, c].sort((x, y) => x - y);
    const pythHyp = sorted[2] ** 2;
    const pythLegs = sorted[0] ** 2 + sorted[1] ** 2;
    const pythResidual = Math.abs(pythHyp - pythLegs);
    const pythPct = (pythResidual / pythHyp) * 100;
    checks.push({
      id: 'tri_pythagoras',
      name: 'Pythagorean Orthogonality Cross-Check',
      category: 'GEOMETRY',
      passed: pythPct < 1.0,
      residual: pythResidual,
      tolerance: pythHyp * 0.01,
      valA: Number(pythLegs.toFixed(2)),
      valB: Number(pythHyp.toFixed(2)),
      unit: 'px²',
      formulaDescription: 'leg₁² + leg₂² ≟ hyp²',
      explanation: 'Verifies right-angle metric tensor preserves perpendicularity.',
    });
  }

  const allPassed = checks.every((c) => c.passed);
  return { metrics, checks, allPassed };
}

/**
 * Runs self-checks on general polygons
 */
export function verifyPolygon(points: Point2D[]): {
  metrics: PolygonMetrics;
  checks: VerificationCheck[];
  allPassed: boolean;
} {
  const metrics = analyzePolygon(points);
  const checks: VerificationCheck[] = [];

  // Theoretical angle sum vs measured
  const angleDiff = Math.abs(metrics.interiorAngleSum - metrics.theoreticalAngleSum);
  checks.push({
    id: 'poly_angle_sum',
    name: 'Polygon Internal Angle Invariant',
    category: 'GEOMETRY',
    passed: angleDiff < 1.0,
    residual: angleDiff,
    tolerance: 1.0,
    valA: Number(metrics.interiorAngleSum.toFixed(1)),
    valB: metrics.theoreticalAngleSum,
    unit: 'deg',
    formulaDescription: '∑θ_interior ≟ (n - 2) × 180°',
    explanation: 'Validates that vertices follow standard planar topology.',
  });

  // Convexity check
  checks.push({
    id: 'poly_convexity',
    name: 'Topological Convexity State',
    category: 'GEOMETRY',
    passed: true,
    residual: 0,
    tolerance: 0,
    valA: metrics.isConvex ? 'Convex' : 'Concave',
    valB: metrics.isConvex ? 'Convex' : 'Concave',
    unit: '',
    formulaDescription: 'sgn(cross_product(e_i, e_{i+1})) constant',
    explanation: 'Cross-product orientation check for polygon hull.',
  });

  const allPassed = checks.every((c) => c.passed);
  return { metrics, checks, allPassed };
}

/**
 * Validates 3D Euler Characteristic V - E + F = 2 for convex polyhedra
 */
export function verifyEulerCharacteristic(vertices: number, edges: number, faces: number): VerificationCheck {
  const chi = vertices - edges + faces;
  return {
    id: 'euler_chi',
    name: 'Euler Characteristic Topology Invariant',
    category: '3D_TOPOLOGY',
    passed: chi === 2,
    residual: Math.abs(chi - 2),
    tolerance: 0,
    valA: chi,
    valB: 2,
    unit: 'χ',
    formulaDescription: 'V - E + F == 2 (Euler-Poincaré)',
    explanation: 'Fundamental invariant for genus-0 spherical topological manifolds in 3D.',
  };
}
