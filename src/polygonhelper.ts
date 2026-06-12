export interface Point {
  x: number;
  y: number;
}

export interface LineSegment {
  start: Point;
  end: Point;
}

/**
 * Type alias for 3D coordinate arrays [x, y, z]
 */
export type Coordinate3D = [number, number, number];

/**
 * Converts 3D coordinate arrays to Point objects (ignoring z-coordinate for 2D calculations)
 * @param coordinates Array of 3D coordinate arrays
 * @returns Array of Point objects
 */
function coordinates3DToPoints(coordinates: Coordinate3D[]): Point[] {
  return coordinates.map((coord) => ({
    x: coord[0],
    y: coord[1],
  }));
}

/**
 * Helper function to get the midpoint between two points
 */
function getMidpoint(point1: Point, point2: Point): Point {
  return {
    x: (point1.x + point2.x) / 2,
    y: (point1.y + point2.y) / 2,
  };
}

/**
 * Helper function to calculate distance between two points
 */
function getDistance(point1: Point, point2: Point): number {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Helper function to check if two points are equal
 */
function isPointEqual(
  point1: Point,
  point2: Point,
  tolerance: number = 1e-10,
): boolean {
  return (
    Math.abs(point1.x - point2.x) < tolerance &&
    Math.abs(point1.y - point2.y) < tolerance
  );
}

/**
 * Returns the intersection point of two line segments, or null if they do not intersect
 */
function getLineSegmentIntersection(
  p1: Point,
  p2: Point,
  q1: Point,
  q2: Point,
): Point | null {
  // Line AB represented as a1x + b1y = c1
  const a1 = p2.y - p1.y;
  const b1 = p1.x - p2.x;
  const c1 = a1 * p1.x + b1 * p1.y;

  // Line CD represented as a2x + b2y = c2
  const a2 = q2.y - q1.y;
  const b2 = q1.x - q2.x;
  const c2 = a2 * q1.x + b2 * q1.y;

  const determinant = a1 * b2 - a2 * b1;
  if (Math.abs(determinant) < 1e-10) {
    // Lines are parallel
    return null;
  }

  const x = (b2 * c1 - b1 * c2) / determinant;
  const y = (a1 * c2 - a2 * c1) / determinant;

  // Check if the intersection point is on both segments
  if (
    isBetween(x, p1.x, p2.x) &&
    isBetween(y, p1.y, p2.y) &&
    isBetween(x, q1.x, q2.x) &&
    isBetween(y, q1.y, q2.y)
  ) {
    return { x, y };
  }
  return null;
}

function isBetween(val: number, a: number, b: number): boolean {
  return val >= Math.min(a, b) - 1e-10 && val <= Math.max(a, b) + 1e-10;
}

/**
 * Extends a line segment in both directions by a given length
 */
function extendLineSegment(line: LineSegment, extension: number): LineSegment {
  const dx = line.end.x - line.start.x;
  const dy = line.end.y - line.start.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length === 0) return { ...line };
  const ux = dx / length;
  const uy = dy / length;
  return {
    start: {
      x: line.start.x - ux * extension,
      y: line.start.y - uy * extension,
    },
    end: {
      x: line.end.x + ux * extension,
      y: line.end.y + uy * extension,
    },
  };
}

/**
 * Calculates a true centerline for a regular polygon: passes through centroid and connects midpoints of two opposite sides
 * @param coordinates Array of points representing the polygon vertices
 * @returns A single line segment representing the main centerline
 */
export function calculateRegularPolygonCenterline(
  coordinates: Point[],
): LineSegment {
  if (coordinates.length < 4) {
    throw new Error('Polygon must have at least 4 vertices');
  }
  // Ensure closed
  const polygon = [...coordinates];
  if (!isPointEqual(polygon[0], polygon[polygon.length - 1])) {
    polygon.push({ ...polygon[0] });
  }
  const n = polygon.length - 1;
  // Find all edge lengths
  const edges = [];
  for (let i = 0; i < n; i++) {
    edges.push({
      index: i,
      length: getDistance(polygon[i], polygon[i + 1]),
    });
  }
  // Sort edges by length (ascending)
  edges.sort((a, b) => a.length - b.length);
  // Take the two shortest edges
  const edge1 = edges[0];
  // Find the edge opposite to edge1
  const oppositeIndex = (edge1.index + Math.floor(n / 2)) % n;
  // Among all edges with this index, pick the one with the shortest length
  let edge2 = edges.find((e) => e.index === oppositeIndex);
  if (!edge2) {
    // fallback: just use the next shortest edge
    edge2 = edges[1];
  }
  // Get midpoints
  const mid1 = getMidpoint(
    polygon[edge1.index],
    polygon[(edge1.index + 1) % n],
  );
  const mid2 = getMidpoint(
    polygon[edge2.index],
    polygon[(edge2.index + 1) % n],
  );
  return { start: mid1, end: mid2 };
}

/**
 * Calculates the centerline, intersection points, and intersected edges for a polygon given as 3D coordinates,
 * extending the centerline in both directions by the longest polygon edge.
 * @param coordinates Array of 3D coordinate arrays [x, y, z]
 * @returns An object with the extended centerline, intersection points, and intersected edges
 */
export function getExtendedCenterlineAndIntersectionsWithEdgesFrom3D(
  coordinates: Coordinate3D[],
): {
  centerline: LineSegment;
  extendedCenterline: LineSegment;
  intersections: Point[];
  intersectedEdges: LineSegment[];
} {
  const points = coordinates3DToPoints(coordinates);
  const centerline = calculateRegularPolygonCenterline(points);
  const polygon = [...points];
  if (!isPointEqual(polygon[0], polygon[polygon.length - 1])) {
    polygon.push({ ...polygon[0] });
  }
  // Find the longest polygon edge
  let maxEdgeLength = 0;
  for (let i = 0; i < polygon.length - 1; i++) {
    const len = getDistance(polygon[i], polygon[i + 1]);
    if (len > maxEdgeLength) maxEdgeLength = len;
  }
  // Extend the centerline in both directions
  const extendedCenterline = extendLineSegment(centerline, maxEdgeLength);
  // Find intersections and intersected edges
  const intersectedEdges: LineSegment[] = [];
  const intersections: Point[] = [];
  for (let i = 0; i < polygon.length - 1; i++) {
    const p1 = polygon[i];
    const p2 = polygon[i + 1];
    const intersection = getLineSegmentIntersection(
      extendedCenterline.start,
      extendedCenterline.end,
      p1,
      p2,
    );
    if (intersection) {
      intersections.push(intersection);
      intersectedEdges.push({ start: p1, end: p2 });
    }
  }
  return { centerline, extendedCenterline, intersections, intersectedEdges };
}

/**
 * Converts the centerline, extended centerline, intersections, intersected edges, and polygon to a GeoJSON FeatureCollection
 * @param params The result object from getExtendedCenterlineAndIntersectionsWithEdgesFrom3D
 * @param polygonCoords The original polygon as Coordinate3D[]
 * @returns A GeoJSON FeatureCollection object
 */
export function toGeoJSONFeatureCollection(
  params: {
    centerline: LineSegment;
    extendedCenterline: LineSegment;
    intersections: Point[];
    intersectedEdges: LineSegment[];
  },
  polygonCoords: Coordinate3D[],
): any {
  // Polygon as GeoJSON
  const polygonFeature = {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          ...polygonCoords.map(([x, y]) => [x, y]),
          [polygonCoords[0][0], polygonCoords[0][1]],
        ],
      ],
    },
    properties: { type: 'polygon' },
  };

  // Centerline as LineString
  const centerlineFeature = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [
        [params.centerline.start.x, params.centerline.start.y],
        [params.centerline.end.x, params.centerline.end.y],
      ],
    },
    properties: { type: 'centerline' },
  };

  // Extended centerline as LineString
  const extendedCenterlineFeature = {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [
        [params.extendedCenterline.start.x, params.extendedCenterline.start.y],
        [params.extendedCenterline.end.x, params.extendedCenterline.end.y],
      ],
    },
    properties: { type: 'extendedCenterline' },
  };

  // Intersections as Points
  const intersectionFeatures = params.intersections.map((pt) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [pt.x, pt.y],
    },
    properties: { type: 'intersection' },
  }));

  // Intersected edges as LineStrings
  const edgeFeatures = params.intersectedEdges.map((edge) => ({
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [
        [edge.start.x, edge.start.y],
        [edge.end.x, edge.end.y],
      ],
    },
    properties: { type: 'intersectedEdge' },
  }));

  return {
    type: 'FeatureCollection',
    features: [
      polygonFeature,
      centerlineFeature,
      extendedCenterlineFeature,
      ...intersectionFeatures,
      ...edgeFeatures,
    ],
  };
}
