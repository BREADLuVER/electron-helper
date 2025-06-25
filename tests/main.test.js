import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import { EventEmitter } from 'events';

jest.setTimeout(10000);

// Mock child_process.spawn before importing the module
const spawnMock = jest.fn();

jest.unstable_mockModule('child_process', () => ({ spawn: spawnMock }));
// Mock ffmpeg path resolver so the code doesn't try to locate a real binary
jest.unstable_mockModule('../electron/ffmpegResolver.js', () => ({ resolveFfmpegPath: () => 'ffmpeg' }));

let listAudioDevices;

beforeAll(async () => {
  const mod = await import('../electron/audioDevices.js');
  listAudioDevices = mod.listAudioDevices;
});

describe('listAudioDevices', () => {
  const makeFakeSpawn = (stderr) => {
    const proc = new EventEmitter();
    proc.stderr = new EventEmitter();
    process.nextTick(() => {
      proc.stderr.emit('data', stderr);
      proc.emit('close');
    });
    return proc;
  };

  beforeEach(() => {
    spawnMock.mockClear();
    Object.defineProperty(process, 'platform', { value: 'win32' });
  });

  it('returns empty arrays on non-Windows platforms', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    const { micDevices, sysDevices } = await listAudioDevices();
    expect(micDevices).toEqual([]);
    expect(sysDevices).toEqual([]);
  });
}); 