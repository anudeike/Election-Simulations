/**
 * Rectangular partition: divide grid into rows x cols rectangles
 * with near-equal cell counts. Contiguous, compact, balanced.
 */
export function rectangularDistricting(
  districtId: Int32Array,
  activeMask: Uint8Array,
  width: number,
  height: number,
  numDistricts: number
): void {
  const cellCount = width * height;
  districtId.fill(-1);

  // Choose rows and cols so rows * cols >= numDistricts and aspect close to grid
  const aspect = width / height;
  let cols = Math.max(1, Math.round(Math.sqrt(numDistricts * aspect)));
  let rows = Math.max(1, Math.ceil(numDistricts / cols));
  if (rows * cols < numDistricts) {
    rows = Math.ceil(numDistricts / cols);
    if (rows * cols < numDistricts) cols++;
  }

  // Cell counts per row and per col for roughly equal splits
  const rowsArr: number[] = [];
  let rem = height;
  for (let r = 0; r < rows; r++) {
    const n = Math.ceil(rem / (rows - r));
    rowsArr.push(Math.min(n, rem));
    rem -= n;
  }
  const colsArr: number[] = [];
  rem = width;
  for (let c = 0; c < cols; c++) {
    const n = Math.ceil(rem / (cols - c));
    colsArr.push(Math.min(n, rem));
    rem -= n;
  }

  let districtIndex = 0;
  let y0 = 0;
  for (let ri = 0; ri < rows && districtIndex < numDistricts; ri++) {
    const rowH = rowsArr[ri];
    let x0 = 0;
    for (let ci = 0; ci < cols && districtIndex < numDistricts; ci++) {
      const colW = colsArr[ci];
      const d = districtIndex;
      for (let y = y0; y < y0 + rowH && y < height; y++) {
        for (let x = x0; x < x0 + colW && x < width; x++) {
          const idx = y * width + x;
          if (activeMask[idx]) districtId[idx] = d;
        }
      }
      x0 += colW;
      districtIndex++;
    }
    y0 += rowH;
  }
}
