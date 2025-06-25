import os from 'os';
import path from 'path';
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock os.homedir() to provide a consistent temp directory
const MOCK_HOME_DIR = '/tmp/test-home';
os.homedir = jest.fn(() => MOCK_HOME_DIR);

const CONFIG_DIR = path.join(MOCK_HOME_DIR, ".config", "PrepDock");
const CONFIG_PATH = path.join(CONFIG_DIR, "userConfig.json");

const mockFs = {
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
};

jest.unstable_mockModule('fs', () => ({
  ...mockFs,
  default: mockFs,
}));

describe('config', () => {
  beforeEach(() => {
    // Reset mocks and modules before each test
    jest.resetModules();
    mockFs.readFileSync.mockClear();
    mockFs.writeFileSync.mockClear();
    mockFs.existsSync.mockClear();
    mockFs.mkdirSync.mockClear();
    
    // Reset process.env
    delete process.env.TEST_VAR_ENV;
  });

  it('should load config from file and merge with process.env', async () => {
    process.env.TEST_VAR_ENV = 'env_value';
    const mockFileConfig = { TEST_VAR_FILE: 'file_value' };
    mockFs.readFileSync.mockReturnValue(JSON.stringify(mockFileConfig));

    const { config } = await import('../electron/config.js');

    expect(mockFs.readFileSync).toHaveBeenCalledWith(CONFIG_PATH, 'utf8');
    expect(config.TEST_VAR_ENV).toBe('env_value');
    expect(config.TEST_VAR_FILE).toBe('file_value');
  });

  it('should handle missing config file gracefully', async () => {
    mockFs.readFileSync.mockImplementation(() => {
      throw new Error('File not found');
    });

    const { config } = await import('../electron/config.js');

    expect(config).toBeDefined();
    expect(config.TEST_VAR_FILE).toBeUndefined();
  });

  it('should save config to the correct file path', async () => {
    mockFs.readFileSync.mockImplementation(() => { throw new Error('not found'); });

    const { saveConfig } = await import('../electron/config.js');
    const newConfig = { NEW_KEY: 'new_value' };

    mockFs.existsSync.mockReturnValue(true);

    saveConfig(newConfig);

    const expectedConfig = { ...newConfig };
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      CONFIG_PATH,
      JSON.stringify(expectedConfig, null, 2)
    );
  });

  it('should create config directory if it does not exist', async () => {
    mockFs.readFileSync.mockImplementation(() => { throw new Error('not found'); });

    const { saveConfig } = await import('../electron/config.js');
    const newConfig = { ANOTHER_KEY: 'another_value' };

    mockFs.existsSync.mockReturnValue(false);

    saveConfig(newConfig);

    const expectedConfig = { ...newConfig };
    expect(mockFs.mkdirSync).toHaveBeenCalledWith(CONFIG_DIR, { recursive: true });
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      CONFIG_PATH,
      JSON.stringify(expectedConfig, null, 2)
    );
  });
}); 