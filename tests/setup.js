/**
 * Global Jest setup
 * Runs before every test file
 */

jest.clearAllMocks();

// Increase timeout for Electron-related async ops
jest.setTimeout(20000);
