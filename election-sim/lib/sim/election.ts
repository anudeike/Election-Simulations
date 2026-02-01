import type { SimState } from './types';

/**
 * For each cell, belief >= 0 votes red else blue.
 * Aggregate per district; set district winner (1=red, -1=blue, 0=tie purple).
 */
export function runElection(state: SimState): void {
  const { beliefs, districtId, activeMask, districtRedCounts, districtBlueCounts, districtWinners } = state;
  const numDistricts = districtRedCounts.length;
  districtRedCounts.fill(0);
  districtBlueCounts.fill(0);

  const n = beliefs.length;
  for (let i = 0; i < n; i++) {
    if (!activeMask[i]) continue;
    const d = districtId[i];
    if (d < 0) continue;
    if (beliefs[i] >= 0) {
      districtRedCounts[d]++;
    } else {
      districtBlueCounts[d]++;
    }
  }

  for (let d = 0; d < numDistricts; d++) {
    const red = districtRedCounts[d];
    const blue = districtBlueCounts[d];
    if (red > blue) districtWinners[d] = 1;
    else if (blue > red) districtWinners[d] = -1;
    else districtWinners[d] = 0;
  }
}
