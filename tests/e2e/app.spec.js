/**
 * End-to-end Electron test.
 * Launches real app in headless mode.
 */

const { test, expect } = require('@playwright/test');
const { _electron: electron } = require('playwright');

test('certificate preview loads', async () => {
  const app = await electron.launch({
    args: ['.'],
  });

  const window = await app.firstWindow();
  await expect(window).toHaveTitle(/Certificate/);

  await app.close();
});
