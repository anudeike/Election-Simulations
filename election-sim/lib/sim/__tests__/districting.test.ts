import { rectangularDistricting } from '../districting/rectangular';

function countByDistrict(districtId: Int32Array): Map<number, number> {
  const m = new Map<number, number>();
  for (let i = 0; i < districtId.length; i++) {
    const d = districtId[i];
    if (d >= 0) {
      m.set(d, (m.get(d) ?? 0) + 1);
    }
  }
  return m;
}

describe('rectangular districting', () => {
  it('assigns all active cells to districts', () => {
    const width = 10;
    const height = 10;
    const activeMask = new Uint8Array(width * height).fill(1);
    const districtId = new Int32Array(width * height);
    rectangularDistricting(districtId, activeMask, width, height, 4);

    let assigned = 0;
    for (let i = 0; i < districtId.length; i++) {
      if (districtId[i] >= 0) assigned++;
    }
    expect(assigned).toBe(100);
  });

  it('produces district sizes differing by at most 1', () => {
    const width = 20;
    const height = 20;
    const activeMask = new Uint8Array(width * height).fill(1);
    const districtId = new Int32Array(width * height);
    rectangularDistricting(districtId, activeMask, width, height, 4);

    const counts = countByDistrict(districtId);
    const sizes = Array.from(counts.values()).sort((a, b) => a - b);
    const min = sizes[0];
    const max = sizes[sizes.length - 1];
    expect(max - min).toBeLessThanOrEqual(1);
  });

  it('uses exactly D districts when D <= cells', () => {
    const width = 10;
    const height = 10;
    const activeMask = new Uint8Array(width * height).fill(1);
    const districtId = new Int32Array(width * height);
    rectangularDistricting(districtId, activeMask, width, height, 5);

    const counts = countByDistrict(districtId);
    expect(counts.size).toBe(5);
  });
});
