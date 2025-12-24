const { test, expect } = require('@playwright/test');
const { _electron: electron } = require('playwright');

test('application launches', async () => {
  const app = await electron.launch({ args: ['.'] });
  const window = await app.firstWindow();

  await expect(window).toHaveTitle(/Certificate/i);

  await app.close();
});
