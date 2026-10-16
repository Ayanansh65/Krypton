/**
 * Precision Geometry Engine for Krypton Vision AI
 * Computes coordinates, lengths, angles, polygons, circles, and geometric invariants.
 */

export interface Point2D {
  x: number;
  y: number;
  label?: string;
}

export interface LineSegment {
  id: string;
  p1: Point2D;
  p2: Point2D;
}

export interface TriangleMetrics {
  sides: [number, number, number]; // a, b, c
  anglesDeg: [number, number, number]; // A, B, C opposite to a, b, c
  perimeter: number;
  areaShoelace: number;
  areaHeron: number;
  inradius: number;
  circumradius: number;
  isRightAngled: boolean;
  centroid: Point2D;
}

export interface PolygonMetrics {
  vertexCount: number;
  perimeter: number;
  area: number;
  centroid: Point2D;
  isConvex: boolean;
  interiorAngleSum: number;
  theoreticalAngleSum: number;
}

export interface CircleMetrics {
  center: Point2D;
  radius: number;
  diameter: number;
  circumference: number;
  area: number;
}

export function distance(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.hypot(dx, dy);
}

export function midpoint(p1: Point2D, p2: Point2D): Point2D {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

export function angleBetweenVectors(v1: { x: number; y: number }, v2: { x: number; y: number }): number {
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.hypot(v1.x, v1.y);
  const mag2 = Math.hypot(v2.x, v2.y);
  if (mag1 === 0 || mag2 === 0) return 0;
  const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.acos(cosTheta) * (180 / Math.PI);
}

/**
 * Calculates polygon area using the Shoelace formula
 */
export function calculateShoelaceArea(points: Point2D[]): number {
  const n = points.length;
  if (n < 3) return 0;
  let sum1 = 0;
  let sum2 = 0;
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    sum1 += points[i].x * points[next].y;
    sum2 += points[i].y * points[next].x;
  }
  return Math.abs(sum1 - sum2) / 2;
}

export function calculatePerimeter(points: Point2D[], closed: boolean = true): number {
  let total = 0;
  const n = points.length;
  if (n < 2) return 0;
  for (let i = 0; i < n - 1; i++) {
    total += distance(points[i], points[i + 1]);
  }
  if (closed && n > 2) {
    total += distance(points[n - 1], points[0]);
  }
  return total;
}

export function calculateCentroid(points: Point2D[]): Point2D {
  if (points.length === 0) return { x: 0, y: 0 };
  let sumX = 0;
  let sumY = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
  }
  return {
    x: sumX / points.length,
    y: sumY / points.length,
  };
}

export function analyzeTriangle(p1: Point2D, p2: Point2D, p3: Point2D): TriangleMetrics {
  const a = distance(p2, p3); // side opposite to p1
  const b = distance(p1, p3); // side opposite to p2
  const c = distance(p1, p2); // side opposite to p3

  // Law of Cosines for angles in degrees
  // cos(A) = (b^2 + c^2 - a^2) / (2bc)
  const angleA = Math.acos(Math.max(-1, Math.min(1, (b * b + c * c - a * a) / (2 * b * c)))) * (180 / Math.PI);
  const angleB = Math.acos(Math.max(-1, Math.min(1, (a * a + c * c - b * b) / (2 * a * c)))) * (180 / Math.PI);
  const angleC = Math.acos(Math.max(-1, Math.min(1, (a * a + b * b - c * c) / (2 * a * b)))) * (180 / Math.PI);

  const perimeter = a + b + c;
  const s = perimeter / 2;
  const heronRadicand = Math.max(0, s * (s - a) * (s - b) * (s - c));
  const areaHeron = Math.sqrt(heronRadicand);
  const areaShoelace = calculateShoelaceArea([p1, p2, p3]);

  const inradius = s > 0 ? areaHeron / s : 0;
  const circumradius = areaHeron > 0 ? (a * b * c) / (4 * areaHeron) : 0;

  // Check if right-angled: any angle close to 90 deg or a^2+b^2=c^2
  const sortedSides = [a, b, c].sort((x, y) => x - y);
  const pythDiff = Math.abs(sortedSides[0] ** 2 + sortedSides[1] ** 2 - sortedSides[2] ** 2);
  const isRightAngled = Math.abs(angleA - 90) < 0.2 || Math.abs(angleB - 90) < 0.2 || Math.abs(angleC - 90) < 0.2 || pythDiff < 0.05 * (sortedSides[2] ** 2);

  return {
    sides: [a, b, c],
    anglesDeg: [angleA, angleB, angleC],
    perimeter,
    areaShoelace,
    areaHeron,
    inradius,
    circumradius,
    isRightAngled,
    centroid: calculateCentroid([p1, p2, p3]),
  };
}

export function analyzePolygon(points: Point2D[]): PolygonMetrics {
  const n = points.length;
  const perimeter = calculatePerimeter(points, true);
  const area = calculateShoelaceArea(points);
  const centroid = calculateCentroid(points);
  const theoreticalAngleSum = Math.max(0, (n - 2) * 180);

  // Check convexity via cross products
  let isConvex = true;
  let prevSign = 0;
  let interiorAngleSum = 0;

  for (let i = 0; i < n; i++) {
    const pPrev = points[(i - 1 + n) % n];
    const pCurr = points[i];
    const pNext = points[(i + 1) % n];

    const v1 = { x: pPrev.x - pCurr.x, y: pPrev.y - pCurr.y };
    const v2 = { x: pNext.x - pCurr.x, y: pNext.y - pCurr.y };
    const angle = angleBetweenVectors(v1, v2);
    interiorAngleSum += angle;

    const cross = (pCurr.x - pPrev.x) * (pNext.y - pCurr.y) - (pCurr.y - pPrev.y) * (pNext.x - pCurr.x);
    if (Math.abs(cross) > 1e-6) {
      const sign = cross > 0 ? 1 : -1;
      if (prevSign === 0) {
        prevSign = sign;
      } else if (prevSign !== sign) {
        isConvex = false;
      }
    }
  }

  return {
    vertexCount: n,
    perimeter,
    area,
    centroid,
    isConvex,
    interiorAngleSum,
    theoreticalAngleSum,
  };
}

export function analyzeCircle(center: Point2D, edgePoint: Point2D): CircleMetrics {
  const radius = distance(center, edgePoint);
  return {
    center,
    radius,
    diameter: radius * 2,
    circumference: 2 * Math.PI * radius,
    area: Math.PI * radius * radius,
  };
}
