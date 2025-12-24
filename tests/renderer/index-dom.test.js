/**
 * Renderer test using jsdom
 */

const fs = require('fs');
const path = require('path');

describe('index.html loads correctly', () => {
  test('contains expected title', () => {
    const html = fs.readFileSync(
      path.resolve(__dirname, '../../public/index.html'),
      'utf8'
    );

    expect(html).toContain('Certificate');
  });
});
