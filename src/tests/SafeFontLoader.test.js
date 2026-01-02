import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { safeParseFontFile, resetWorker } from '../services/SafeFontLoader';
import * as FontLoader from '../services/FontLoader';

// Mock FontLoader.parseFontFile to avoid actual parsing
vi.mock('../services/FontLoader', () => ({
    parseFontFile: vi.fn(),
    createFontUrl: vi.fn(),
}));

describe('SafeFontLoader', () => {
    let originalWorker;
    let mockWorker;

    beforeEach(() => {
        // Reset the singleton in SafeFontLoader
        resetWorker();

        // Save original Worker
        originalWorker = window.Worker;

        // Mock Worker class
        mockWorker = {
            postMessage: vi.fn(),
            terminate: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        };

        // Mock window.Worker as a class to support 'new Worker()'
        window.Worker = class {
            constructor() {
                return mockWorker;
            }
        };

        // Reset FontLoader mock
        FontLoader.parseFontFile.mockReset();

        // Mock File.prototype.arrayBuffer
        if (!File.prototype.arrayBuffer) {
            File.prototype.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));
        } else {
            vi.spyOn(File.prototype, 'arrayBuffer').mockResolvedValue(new ArrayBuffer(8));
        }
    });

    afterEach(() => {
        window.Worker = originalWorker;
        vi.restoreAllMocks();
    });

    it('resolves when worker validates successfully', async () => {
        // Mock FontLoader.parseFontFile to return success
        FontLoader.parseFontFile.mockResolvedValue({ font: 'mockFont', metadata: 'mockMeta' });

        const file = new File(['dummy content'], 'test.ttf', { type: 'font/ttf' });
        const promise = safeParseFontFile(file);

        // Wait for worker interaction
        await vi.waitUntil(() => mockWorker.addEventListener.mock.calls.length > 0);

        // Find message handler
        const calls = mockWorker.addEventListener.mock.calls;
        const messageHandler = calls.find(call => call[0] === 'message')[1];

        // Trigger success message
        messageHandler({
            data: { success: true, fileName: 'test.ttf' }
        });

        const result = await promise;

        expect(result).toEqual({ font: 'mockFont', metadata: 'mockMeta' });
        expect(FontLoader.parseFontFile).toHaveBeenCalledWith(file);
        expect(mockWorker.removeEventListener).toHaveBeenCalledWith('message', messageHandler);
    });

    it('rejects when worker reports failure', async () => {
        const file = new File(['dummy content'], 'bad.ttf', { type: 'font/ttf' });
        const promise = safeParseFontFile(file);

        await vi.waitUntil(() => mockWorker.addEventListener.mock.calls.length > 0);

        const calls = mockWorker.addEventListener.mock.calls;
        const messageHandler = calls.find(call => call[0] === 'message')[1];

        // Trigger failure message
        messageHandler({
            data: { success: false, fileName: 'bad.ttf', error: 'Invalid font' }
        });

        await expect(promise).rejects.toThrow('Worker validation failed: Invalid font');

        expect(FontLoader.parseFontFile).not.toHaveBeenCalled();
        expect(mockWorker.removeEventListener).toHaveBeenCalled();
    });

    it('rejects on timeout', async () => {
        vi.useFakeTimers();
        const file = new File(['dummy content'], 'slow.ttf', { type: 'font/ttf' });

        const promise = safeParseFontFile(file, 1000); // 1s timeout

        // Wait for arrayBuffer to resolve and timer to set
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();

        // Fast-forward time
        vi.advanceTimersByTime(1100);

        await expect(promise).rejects.toThrow('Font validation timed out');
        expect(mockWorker.terminate).toHaveBeenCalled();

        vi.useRealTimers();
    });
});
