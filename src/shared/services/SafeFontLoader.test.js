import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { safeParseFontFile } from './SafeFontLoader';
import { parseFontFile } from './FontLoader';

vi.mock('./FontLoader', () => ({
    parseFontFile: vi.fn()
}));

class MockWorker {
    static instances = [];

    constructor() {
        this.listeners = {
            message: new Set(),
            error: new Set()
        };
        this.terminated = false;
        MockWorker.instances.push(this);
    }

    addEventListener(type, listener) {
        this.listeners[type]?.add(listener);
    }

    removeEventListener(type, listener) {
        this.listeners[type]?.delete(listener);
    }

    postMessage({ fileName }) {
        // Simulate one worker hanging while another succeeds.
        if (fileName === 'fast.ttf') {
            setTimeout(() => {
                this.emit('message', { success: true, fileName });
            }, 10);
        }
        // slow.ttf intentionally never posts back to force timeout
    }

    terminate() {
        this.terminated = true;
    }

    emit(type, data) {
        this.listeners[type]?.forEach((listener) => listener({ data }));
    }
}

describe('SafeFontLoader', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        MockWorker.instances = [];
        global.Worker = MockWorker;
        parseFontFile.mockReset();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('keeps sibling validations alive when one request times out', async () => {
        const fastFile = {
            name: 'fast.ttf',
            arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
        };

        const slowFile = {
            name: 'slow.ttf',
            arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
        };

        parseFontFile.mockResolvedValue({ font: { names: { fullName: { en: 'Fast Font' } } } });

        const slowPromise = safeParseFontFile(slowFile, 50);
        const fastPromise = safeParseFontFile(fastFile, 200);
        const slowExpectation = expect(slowPromise).rejects.toThrow('Font validation timed out');

        await vi.advanceTimersByTimeAsync(20);
        await expect(fastPromise).resolves.toEqual({
            font: { names: { fullName: { en: 'Fast Font' } } }
        });

        await vi.advanceTimersByTimeAsync(60);
        await slowExpectation;

        expect(parseFontFile).toHaveBeenCalledTimes(1);
        expect(parseFontFile).toHaveBeenCalledWith(fastFile);

        // Both workers should be independently terminated by their own lifecycle.
        expect(MockWorker.instances).toHaveLength(2);
        expect(MockWorker.instances.every((w) => w.terminated)).toBe(true);
    });
});
