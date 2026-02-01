/**
 * Compute border segments between districts for overlay drawing.
 * Returns array of line segments: [x0, y0, x1, y1, ...] in cell coordinates.
 */
export function computeBorderSegments(
  districtId: Int32Array,
  width: number,
  height: number
): number[] {
  const segments: number[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const d = districtId[idx];
      if (d < 0) continue;

      // Right neighbor
      if (x + 1 < width) {
        const r = districtId[idx + 1];
        if (r >= 0 && r !== d) {
          segments.push(x + 1, y, x + 1, y + 1);
        }
      }
      // Down neighbor
      if (y + 1 < height) {
        const down = districtId[idx + width];
        if (down >= 0 && down !== d) {
          segments.push(x, y + 1, x + 1, y + 1);
        }
      }
    }
  }

  return segments;
}
