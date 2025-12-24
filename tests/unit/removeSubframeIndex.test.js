const removeSubframeIndex = require('../../utils/removeSubframeIndex');

describe('removeSubframeIndex()', () => {
  test('returns rows array unchanged structurally', () => {
    const input = [{ 'SPEED[1]': 100, ALTITUDE: 2000 }];

    const result = removeSubframeIndex(input);

    expect(Array.isArray(result)).toBe(true);

    // ✅ CORRECT way to test bracketed keys
    expect(result[0]['SPEED[1]']).toBe(100);
    expect(result[0].ALTITUDE).toBe(2000);
  });
});
