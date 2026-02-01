import { getNeighborIndices } from '../update';

describe('neighbor indexing', () => {
  const width = 5;
  const height = 5;

  it('Von Neumann returns 4 neighbors for interior cell', () => {
    const idx = 2 * width + 2;
    const neighbors = getNeighborIndices(idx, width, height, 'von-neumann');
    expect(neighbors).toHaveLength(4);
    expect(neighbors.sort()).toEqual([7, 11, 12, 17]);
  });

  it('Moore returns 8 neighbors for interior cell', () => {
    const idx = 2 * width + 2;
    const neighbors = getNeighborIndices(idx, width, height, 'moore');
    expect(neighbors).toHaveLength(8);
  });

  it('corner cell has fewer neighbors (clamped)', () => {
    const idx = 0;
    const vn = getNeighborIndices(idx, width, height, 'von-neumann');
    const moore = getNeighborIndices(idx, width, height, 'moore');
    expect(vn).toHaveLength(2);
    expect(moore).toHaveLength(3);
  });

  it('edge cell has 3 Von Neumann neighbors', () => {
    const idx = width; // (1, 0)
    const neighbors = getNeighborIndices(idx, width, height, 'von-neumann');
    expect(neighbors).toHaveLength(3);
  });
});
