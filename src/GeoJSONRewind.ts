// GeoJSONRewind.ts
// Utility class to ensure right-hand rule for GeoJSON polygons and multipolygons

export class GeoJSONRewind {
  // Rewind a single ring (array of [x, y, z?]) to the desired winding direction
  rewindRing(ring: number[][], dir: boolean): void {
    let area = 0,
      err = 0;
    for (let i = 0, len = ring.length, j = len - 1; i < len; j = i++) {
      const k = (ring[i][0] - ring[j][0]) * (ring[j][1] + ring[i][1]);
      const m = area + k;
      err += Math.abs(area) >= Math.abs(k) ? area - m + k : k - m + area;
      area = m;
    }
    if (area + err >= 0 !== !!dir) ring.reverse();
  }

  // Rewind all rings in a polygon (first is outer, rest are holes)
  rewindRings(rings: number[][][], outer: boolean): void {
    if (rings.length === 0) return;
    this.rewindRing(rings[0], outer);
    for (let i = 1; i < rings.length; i++) {
      this.rewindRing(rings[i], !outer);
    }
  }

  // Rewind a GeoJSON object (FeatureCollection, Feature, Polygon, MultiPolygon, etc.)
  rewind(gj: any, outer: boolean): any {
    if (!gj) return gj;
    const type = gj.type;
    if (type === 'FeatureCollection') {
      for (let i = 0; i < gj.features.length; i++)
        this.rewind(gj.features[i], outer);
    } else if (type === 'GeometryCollection') {
      for (let i = 0; i < gj.geometries.length; i++)
        this.rewind(gj.geometries[i], outer);
    } else if (type === 'Feature') {
      this.rewind(gj.geometry, outer);
    } else if (type === 'Polygon') {
      this.rewindRings(gj.coordinates, outer);
    } else if (type === 'MultiPolygon') {
      for (let i = 0; i < gj.coordinates.length; i++)
        this.rewindRings(gj.coordinates[i], outer);
    }
    return gj;
  }
}
