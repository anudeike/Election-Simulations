import { beliefToBin } from '../histogram';

describe('histogram binning', () => {
  const binCount = 51;

  it('maps -50 to bin 0', () => {
    expect(beliefToBin(-50, binCount)).toBe(0);
  });

  it('maps 50 to last bin', () => {
    expect(beliefToBin(50, binCount)).toBe(binCount - 1);
  });

  it('maps 0 to middle bin', () => {
    const bin = beliefToBin(0, binCount);
    expect(bin).toBe(Math.floor((binCount - 1) / 2));
  });

  it('clamps values outside [-50, 50]', () => {
    expect(beliefToBin(-100, binCount)).toBe(0);
    expect(beliefToBin(100, binCount)).toBe(binCount - 1);
  });

  it('uses correct bin count', () => {
    expect(beliefToBin(0, 101)).toBe(50);
  });
});
