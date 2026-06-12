// Helper functions for fitting and extruding a wall shape along an axis and splitting into polygons
import { GeoJSONLayer, mercatorToWgs84Transformer } from '@vcmap/core';
import { GeoJSONRewind } from './GeoJSONRewind.js';
import {
  getExtendedCenterlineAndIntersectionsWithEdgesFrom3D,
  toGeoJSONFeatureCollection,
} from './polygonhelper.js';
import rooftypes from './roofTypes.js';
import { VcsUiApp } from '@vcmap/ui';
import style from 'ol/style/Fill.js';

// Find the shortest and longest axis of a polygon (array of [x, y])
export function findShortestAndLongestAxis(coords: number[][]): {
  shortest: [number[], number[]];
  longest: [number[], number[]];
  shortestLength: number;
  longestLength: number;
} {
  let minDist = Infinity;
  let maxDist = 0;
  let shortest: [number[], number[]] = [coords[0], coords[1]];
  let longest: [number[], number[]] = [coords[0], coords[1]];
  const n = coords.length;
  for (let i = 0; i < n; i++) {
    const a = coords[i];
    const b = coords[(i + 1) % n]; // wrap around to first point
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist && dist > 0.00001) {
      minDist = dist;
      shortest = [a, b];
    }
    if (dist > maxDist) {
      maxDist = dist;
      longest = [a, b];
    }
  }
  return { shortest, longest, shortestLength: minDist, longestLength: maxDist };
}

// Find the shortest edge (line) of a polygon (array of [x, y])
export function findShortestEdge(coords: number[][]): [number[], number[]] {
  let minDist = Infinity;
  let shortest: [number[], number[]] = [coords[0], coords[1]];
  const n = coords.length;
  for (let i = 0; i < n; i++) {
    const a = coords[i];
    const b = coords[(i + 1) % n]; // wrap around to first point
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist && dist > 0.00001) {
      minDist = dist;
      shortest = [a, b];
    }
  }
  return shortest;
}

// Find the middle axis: perpendicular to the given shortest edge, centered at its midpoint, and with length equal to the longest axis
export function findMiddleAxis(
  coords: number[][],
  shortest: [number[], number[]],
  longestLength?: number,
): [number[], number[]] {
  const [a, b] = shortest;
  const n = coords.length;
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  // Perpendicular direction (normalized)
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const perp = [-dy, dx];
  const perpLen = Math.sqrt(perp[0] * perp[0] + perp[1] * perp[1]);
  const perpNorm = [perp[0] / perpLen, perp[1] / perpLen];

  // Use the provided longestLength, or estimate from polygon if not given
  let axisLength = longestLength;
  if (!axisLength) {
    // Fallback: estimate as the max distance between any two points
    axisLength = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = coords[i][0] - coords[j][0];
        const dy = coords[i][1] - coords[j][1];
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > axisLength) axisLength = dist;
      }
    }
  }
  // Half length for each side
  const halfLen = axisLength / 2;
  // Construct axis endpoints
  const pA = [mid[0] - perpNorm[0] * halfLen, mid[1] - perpNorm[1] * halfLen];
  const pB = [mid[0] + perpNorm[0] * halfLen, mid[1] + perpNorm[1] * halfLen];
  return [pA, pB];
}

// Fit the basic wall shape to the shortest axis (scaling and rotating, using full 3D axis, and proper plane alignment)
export function fitWallShapeToAxis(
  shape: number[][],
  axis: [number[], number[]],
  polygonCoords?: number[][],
  height: number = 1.0,
): number[][] {
  const [start, end] = axis;

  // 1. Find the lowest z value of the polygon and flatten all points to that height
  let baseZ = 0;
  if (polygonCoords && polygonCoords[0].length > 2) {
    baseZ = Math.min(...polygonCoords.map((p) => p[2] ?? 0));
  }

  // Compute axis vector in XY
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const axis2DLength = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dx, dy);

  // Step 1: Scale px (now y) to axis2DLength, py (now z) to axis2DLength (or keep as height)
  let wallXY = shape.map(([px, py, pz]) => [
    px * axis2DLength,
    py * axis2DLength,
    pz * height,
  ]);

  // Step 2: Rotate by axis angle
  wallXY = wallXY.map(([px, py, pz]) => {
    const rotX = px * Math.cos(-angle) - py * Math.sin(-angle);
    const rotY = px * Math.sin(-angle) + py * Math.cos(-angle);
    return [rotX, rotY, pz];
  });

  // Step 3: Translate to axis start and baseZ
  wallXY = wallXY.map(([px, py, pz]) => [
    start[0] + px,
    start[1] + py,
    baseZ + pz,
  ]);

  // Step 4: Ensure ground points of fittedWall match axis endpoints exactly (for first and last point)
  if (wallXY.length > 0) {
    wallXY[0][0] = start[0];
    wallXY[0][1] = start[1];
    wallXY[0][2] = baseZ;
    wallXY[wallXY.length - 1][0] = end[0];
    wallXY[wallXY.length - 1][1] = end[1];
    wallXY[wallXY.length - 1][2] = baseZ;
  }

  return wallXY;
}

// Extrude the wall shape along the longest axis (returns all vertices of the 3D mesh)
export function extrudeWallShapeAlongAxis(
  wall: number[][],
  axis: [number[], number[]],
): number[][][] {
  const [start, end] = axis;
  // Compute translation vector from start to end
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const dz = (end[2] ?? 0) - (start[2] ?? 0);

  // Create start wall (as is) and end wall (translated)
  const startWall = wall;
  const endWall = wall.map(([x, y, z]) => [x + dx, y + dy, z + dz]);

  const polygons: number[][][] = [];

  // Add side polygons
  for (let i = 0; i < wall.length - 1; i++) {
    const poly = [
      startWall[i],
      startWall[i + 1],
      endWall[i + 1],
      endWall[i],
      startWall[i],
    ];
    polygons.push(poly);
  }
  // Add start wall as a polygon
  polygons.push([...startWall].reverse());
  // Add end wall as a polygon (reverse to keep consistent winding)
  polygons.push([...endWall]);
  return polygons;
}

// Convert 3D mesh polygons to GeoJSON FeatureCollection (in WGS84)
export function meshPolygonsToGeoJSON(polygons: number[][][]): any {
  function mercator3DtoWgs84([x, y, z]: number[]) {
    const [lon, lat] = mercatorToWgs84Transformer([x, y]);
    return [lon, lat, z];
  }
  // Convert each polygon to WGS84
  const multipolygonCoords = polygons.map((poly) => [
    poly.map(mercator3DtoWgs84),
  ]);
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'MultiPolygon',
          coordinates: multipolygonCoords,
        },
        properties: {
          olcs_altitudeMode: 'absolute',
        },
      },
    ],
  };
}

// Output fittedWall as GeoJSON Polygon (for debugging/visualization)
export function fittedWallToGeoJSON(fittedWall: number[][]): any {
  function mercator3DtoWgs84([x, y, z]: number[]) {
    const [lon, lat] = mercatorToWgs84Transformer([x, y]);
    return [lon, lat, z];
  }
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [fittedWall.map(mercator3DtoWgs84)],
        },
        properties: {},
      },
    ],
  };
}

// Utility: Remove consecutive duplicate points
function removeDuplicatePoints(coords: number[][]): number[][] {
  if (coords.length < 2) return coords;
  const result = [coords[0]];
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1];
    const curr = coords[i];
    if (
      !(
        prev[0] === curr[0] &&
        prev[1] === curr[1] &&
        (prev[2] ?? 0) === (curr[2] ?? 0)
      )
    ) {
      result.push(curr);
    }
  }
  // Optionally, if first and last are the same, remove last
  if (result.length > 2) {
    const first = result[0],
      last = result[result.length - 1];
    if (
      first[0] === last[0] &&
      first[1] === last[1] &&
      (first[2] ?? 0) === (last[2] ?? 0)
    ) {
      result.pop();
    }
  }
  return result;
}

// Utility: Remove collinear points (point lies on edge between neighbors)
function removeCollinearPoints(
  coords: number[][],
  epsilon = 1e-10,
): number[][] {
  if (coords.length < 3) return coords;
  const result = [];
  for (let i = 0; i < coords.length; i++) {
    const prev = coords[(i - 1 + coords.length) % coords.length];
    const curr = coords[i];
    const next = coords[(i + 1) % coords.length];
    // 2D cross product to check collinearity
    const dx1 = curr[0] - prev[0];
    const dy1 = curr[1] - prev[1];
    const dx2 = next[0] - curr[0];
    const dy2 = next[1] - curr[1];
    const cross = dx1 * dy2 - dy1 * dx2;
    if (Math.abs(cross) > epsilon) {
      result.push(curr);
    }
  }
  // If result is not closed, close it if input was closed
  if (result.length > 2) {
    const first = result[0],
      last = result[result.length - 1];
    if (
      !(
        first[0] === last[0] &&
        first[1] === last[1] &&
        (first[2] ?? 0) === (last[2] ?? 0)
      )
    ) {
      result.push([...first]);
    }
  }
  return result;
}

// Computes the area of a 3D polygon using the general 3D formula (no projection)
function polygonArea3D(points: number[][]): number {
  if (points.length < 3) return 0.0;
  const P1 = points[0];
  const P2 = points[1];
  const P3 = points[2];
  const a =
    Math.pow(
      (P2[1] - P1[1]) * (P3[2] - P1[2]) - (P3[1] - P1[1]) * (P2[2] - P1[2]),
      2,
    ) +
    Math.pow(
      (P3[0] - P1[0]) * (P2[2] - P1[2]) - (P2[0] - P1[0]) * (P3[2] - P1[2]),
      2,
    ) +
    Math.pow(
      (P2[0] - P1[0]) * (P3[1] - P1[1]) - (P3[0] - P1[0]) * (P2[1] - P1[1]),
      2,
    );
  const sqrtA = Math.sqrt(a);
  if (sqrtA === 0) return 0.0;
  const cosnx =
    ((P2[1] - P1[1]) * (P3[2] - P1[2]) - (P3[1] - P1[1]) * (P2[2] - P1[2])) /
    sqrtA;
  const cosny =
    ((P3[0] - P1[0]) * (P2[2] - P1[2]) - (P2[0] - P1[0]) * (P3[2] - P1[2])) /
    sqrtA;
  const cosnz =
    ((P2[0] - P1[0]) * (P3[1] - P1[1]) - (P3[0] - P1[0]) * (P2[1] - P1[1])) /
    sqrtA;
  let s =
    cosnz *
      (points[points.length - 1][0] * P1[1] -
        P1[0] * points[points.length - 1][1]) +
    cosnx *
      (points[points.length - 1][1] * P1[2] -
        P1[1] * points[points.length - 1][2]) +
    cosny *
      (points[points.length - 1][2] * P1[0] -
        P1[2] * points[points.length - 1][0]);
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    s +=
      cosnz * (p1[0] * p2[1] - p2[0] * p1[1]) +
      cosnx * (p1[1] * p2[2] - p2[1] * p1[2]) +
      cosny * (p1[2] * p2[0] - p2[2] * p1[0]);
  }
  s = Math.abs(s / 2.0);
  return s;
}

export function createExtrudedPileGeoJSON(
  coords: number[][],
  height: number,
  type: string,
  buildingType: string,
  area: number,
): any {
  // Sanitize input: remove duplicate and collinear points
  let cleanCoords = removeDuplicatePoints(coords);
  cleanCoords = removeCollinearPoints(cleanCoords);
  let shape;
  shape = rooftypes.find((r) => r.name === buildingType)?.shape;
  if (!shape) {
    throw new Error(`Unsupported building type: ${buildingType}`);
  }

  if (type === 'BBox') {
    // Find the shortest and longest axis of the polygon
    const { shortest, longestLength } = findShortestAndLongestAxis(cleanCoords);
    const fittedWall = fitWallShapeToAxis(shape, shortest, coords, height);

    // Calculate area of the fitted wall (projected to XY)
    const wallArea = polygonArea3D(fittedWall);

    // Find the middle axis for extrusion
    const middleAxis = findMiddleAxis(coords, shortest, longestLength);

    // Calculate length of the middle axis
    const axisLen = Math.sqrt(
      Math.pow(middleAxis[1][0] - middleAxis[0][0], 2) +
        Math.pow(middleAxis[1][1] - middleAxis[0][1], 2),
    );

    // Calculate volume (area * axis length)
    const Volume = wallArea * axisLen;

    // Output area and volume (add to GeoJSON properties)
    // Extrude the fitted wall along the middle axis
    const meshPolygons = extrudeWallShapeAlongAxis(fittedWall, middleAxis);

    // Convert the mesh polygons to GeoJSON FeatureCollection (in WGS84)
    let geojson = meshPolygonsToGeoJSON(meshPolygons);

    // Ensure right-hand rule for GeoJSON MultiPolygon using GeoJSONRewind
    const rewriter = new GeoJSONRewind();
    geojson = rewriter.rewind(geojson, true); // mutate = true

    // Add area and volume to GeoJSON properties
    if (
      geojson.features &&
      geojson.features[0] &&
      geojson.features[0].properties
    ) {
      geojson.features[0].properties.wallArea = wallArea;
      geojson.features[0].properties.Volume = Volume;
      geojson.features[0].properties.area = area;
    }

    return geojson;
  } else if (type === 'Polygon') {
    //console.log(coords);
    const { centerline, extendedCenterline, intersections, intersectedEdges } =
      getExtendedCenterlineAndIntersectionsWithEdgesFrom3D(
        coords.map(([x, y, z = 0]) => [x, y, z]),
      );

    const fittedWall = fitWallShapeToAxis(
      shape,
      [
        [intersectedEdges[0].start.x, intersectedEdges[0].start.y],
        [intersectedEdges[0].end.x, intersectedEdges[0].end.y],
      ],
      cleanCoords,
      height,
    );

    // Calculate area of the fitted wall (projected to XY)
    const wallArea = polygonArea3D(fittedWall);

    // Extrude the fitted wall along the middle axis
    const meshPolygons = extrudeWallShapeAlongAxis(fittedWall, [
      [intersections[0].x, intersections[0].y],
      [intersections[1].x, intersections[1].y],
    ]);

    // Calculate length of the middle axis
    const axisLen = Math.sqrt(
      Math.pow(intersections[1].x - intersections[0].x, 2) +
        Math.pow(intersections[1].y - intersections[0].y, 2),
    );
    // Calculate volume (area * axis length)
    const Volume = wallArea * axisLen;
    // Convert the mesh polygons to GeoJSON FeatureCollection (in WGS84)
    let geojson = meshPolygonsToGeoJSON(meshPolygons);

    // Ensure right-hand rule for GeoJSON MultiPolygon using GeoJSONRewind
    const rewriter = new GeoJSONRewind();
    geojson = rewriter.rewind(geojson, true); // mutate = true

    // Add area and volume to GeoJSON properties
    if (
      geojson.features &&
      geojson.features[0] &&
      geojson.features[0].properties
    ) {
      geojson.features[0].properties.wallArea = wallArea;
      geojson.features[0].properties.Volume = Volume;
      geojson.features[0].properties.area = area;
    }
    return geojson;
  }
}
