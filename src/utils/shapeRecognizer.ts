/**
 * Geometric Shape Recognizer for Krypton Vision AI
 * Classifies hand-drawn air strokes or camera-extracted contours into clean geometric primitives:
 * Triangles, Circles, Rectangles, Regular Polygons, and Line Segments.
 */

import type { Point2D } from './geometry.ts';
import { distance, calculateShoelaceArea, calculatePerimeter } from './geometry.ts';

export interface RecognizedShape {
  type: 'TRIANGLE' | 'CIRCLE' | 'RECTANGLE' | 'POLYGON' | 'LINE' | 'FREEFORM';
  confidence: number; // 0 to 1
  vertices: Point2D[];
  center?: Point2D;
  radius?: number;
  area: number;
  perimeter: number;
  label: string;
}

/**
 * Ramer-Douglas-Peucker algorithm to simplify polylines and find dominant corner vertices
 */
export function ramerDouglasPeucker(points: Point2D[], epsilon: number): Point2D[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let index = 0;
  const p1 = points[0];
  const p2 = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], p1, p2);
    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }

  if (maxDist > epsilon) {
    const recResults1 = ramerDouglasPeucker(points.slice(0, index + 1), epsilon);
    const recResults2 = ramerDouglasPeucker(points.slice(index), epsilon);
    return recResults1.slice(0, recResults1.length - 1).concat(recResults2);
  } else {
    return [p1, p2];
  }
}

function perpendicularDistance(p: Point2D, lineStart: Point2D, lineEnd: Point2D): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lineLenSq = dx * dx + dy * dy;
  if (lineLenSq === 0) return distance(p, lineStart);

  const t = Math.max(0, Math.min(1, ((p.x - lineStart.x) * dx + (p.y - lineStart.y) * dy) / lineLenSq));
  const projX = lineStart.x + t * dx;
  const projY = lineStart.y + t * dy;
  return distance(p, { x: projX, y: projY });
}

/**
 * Analyzes a raw path of points drawn by hand or detected from camera
 */
export function recognizeDrawnShape(rawPoints: Point2D[]): RecognizedShape {
  if (rawPoints.length < 5) {
    return {
      type: 'FREEFORM',
      confidence: 0.5,
      vertices: rawPoints,
      area: 0,
      perimeter: calculatePerimeter(rawPoints, false),
      label: 'Stroke too short',
    };
  }

  const startPoint = rawPoints[0];
  const endPoint = rawPoints[rawPoints.length - 1];
  const strokeLen = calculatePerimeter(rawPoints, false);
  const endGap = distance(startPoint, endPoint);

  // Closed loop check: start and end are close relative to overall length
  const isClosed = endGap < strokeLen * 0.28 || endGap < 60;

  // Compute bounding box
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let sumX = 0, sumY = 0;
  for (const p of rawPoints) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
    sumX += p.x;
    sumY += p.y;
  }
  const center = { x: sumX / rawPoints.length, y: sumY / rawPoints.length };
  const bboxWidth = maxX - minX;
  const bboxHeight = maxY - minY;
  const bboxDiag = Math.hypot(bboxWidth, bboxHeight);

  // Circularity test (isoperimetric quotient: 4 * pi * Area / Perimeter^2)
  const shoelaceArea = calculateShoelaceArea(rawPoints);
  const perimeter = calculatePerimeter(rawPoints, true);
  const circularity = perimeter > 0 ? (4 * Math.PI * shoelaceArea) / (perimeter * perimeter) : 0;

  // Check if Circle (circularity close to 1, e.g. > 0.70)
  if (isClosed && circularity > 0.72) {
    const avgRadius = (bboxWidth + bboxHeight) / 4;
    return {
      type: 'CIRCLE',
      confidence: Number(Math.min(0.98, circularity).toFixed(2)),
      vertices: [center, { x: center.x + avgRadius, y: center.y }],
      center,
      radius: Math.round(avgRadius),
      area: Math.round(Math.PI * avgRadius * avgRadius),
      perimeter: Math.round(2 * Math.PI * avgRadius),
      label: `Circle ○ (r = ${Math.round(avgRadius)}px)`,
    };
  }

  // Simplify polygon corners with adaptive epsilon
  const epsilon = Math.max(12, bboxDiag * 0.08);
  const simplified = ramerDouglasPeucker(rawPoints, epsilon);
  
  // If closed, ensure first and last aren't duplicate
  let cornerVertices = [...simplified];
  if (isClosed && cornerVertices.length > 2) {
    const last = cornerVertices[cornerVertices.length - 1];
    if (distance(cornerVertices[0], last) < epsilon * 1.5) {
      cornerVertices.pop();
    }
  }

  const cornerCount = cornerVertices.length;

  if (isClosed && cornerCount === 3) {
    return {
      type: 'TRIANGLE',
      confidence: 0.94,
      vertices: cornerVertices.map((p, i) => ({ ...p, label: String.fromCharCode(65 + i) })),
      area: Math.round(calculateShoelaceArea(cornerVertices)),
      perimeter: Math.round(calculatePerimeter(cornerVertices, true)),
      label: `Triangle Δ (3 corners detected)`,
    };
  }

  if (isClosed && cornerCount === 4) {
    const area = calculateShoelaceArea(cornerVertices);
    return {
      type: 'RECTANGLE',
      confidence: 0.91,
      vertices: cornerVertices.map((p, i) => ({ ...p, label: String.fromCharCode(65 + i) })),
      area: Math.round(area),
      perimeter: Math.round(calculatePerimeter(cornerVertices, true)),
      label: `Quadrilateral ▱ (4 corners detected)`,
    };
  }

  if (isClosed && cornerCount >= 5 && cornerCount <= 8) {
    return {
      type: 'POLYGON',
      confidence: 0.88,
      vertices: cornerVertices.map((p, i) => ({ ...p, label: String.fromCharCode(65 + i) })),
      area: Math.round(calculateShoelaceArea(cornerVertices)),
      perimeter: Math.round(calculatePerimeter(cornerVertices, true)),
      label: `Polygon (${cornerCount} vertices)`,
    };
  }

  if (!isClosed && cornerCount === 2) {
    return {
      type: 'LINE',
      confidence: 0.95,
      vertices: [rawPoints[0], rawPoints[rawPoints.length - 1]],
      area: 0,
      perimeter: Math.round(distance(rawPoints[0], rawPoints[rawPoints.length - 1])),
      label: `Line Segment (L = ${Math.round(distance(rawPoints[0], rawPoints[rawPoints.length - 1]))}px)`,
    };
  }

  // Default fallback
  return {
    type: 'FREEFORM',
    confidence: 0.75,
    vertices: cornerVertices,
    area: Math.round(shoelaceArea),
    perimeter: Math.round(perimeter),
    label: `Freehand Curve (${cornerCount} nodes)`,
  };
}
