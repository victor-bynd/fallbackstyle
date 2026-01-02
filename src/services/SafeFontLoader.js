import { parseFontFile } from './FontLoader';

// We can reuse a single worker instance if we want, or create one per request.
// For now, creating one per request ensures clean state, but one per session is more efficient.
// Let's use a lazy singleton approach.
let workerInstance = null;

const getWorker = () => {
    if (!workerInstance) {
        workerInstance = new Worker(new URL('../workers/fontValidation.worker.js', import.meta.url), {
            type: 'module'
        });
    }
    return workerInstance;
};

// For testing purposes
export const resetWorker = () => {
    if (workerInstance) {
        workerInstance.terminate();
    }
    workerInstance = null;
};

export const safeParseFontFile = async (file, timeoutMs = 3000) => {
    return new Promise(async (resolve, reject) => {
        try {
            const buffer = await file.arrayBuffer();
            const worker = getWorker();

            // Unique ID for this request (simple random string)
            // Actually, since we are sending one message, we can just track by fileName for now
            // or better, just use a one-off event listener.

            let isResolved = false;
            let timer = null;

            const handleMessage = (e) => {
                const { success, fileName, error } = e.data;
                // Ensure this message matches our file (basic check)
                if (fileName !== file.name) return;

                cleanup();

                if (success) {
                    // Worker approved! Now safe to parse on main thread.
                    // We knowingly accept the double-parse cost for safety.
                    parseFontFile(file)
                        .then(resolve)
                        .catch(reject);
                } else {
                    reject(new Error(`Worker validation failed: ${error}`));
                }
            };

            const handleError = (err) => {
                cleanup();
                reject(new Error(`Worker error: ${err.message}`));
            };

            const cleanup = () => {
                if (isResolved) return;
                isResolved = true;
                clearTimeout(timer);
                worker.removeEventListener('message', handleMessage);
                worker.removeEventListener('error', handleError);
            };

            worker.addEventListener('message', handleMessage);
            worker.addEventListener('error', handleError);

            // Send data
            worker.postMessage({ buffer, fileName: file.name }, [buffer]); // Transfer buffer ownership

            // Set timeout
            timer = setTimeout(() => {
                if (!isResolved) {
                    cleanup();
                    // If we time out, we assume the worker is stuck.
                    // We might want to terminate the worker to be safe?
                    // For now, just reject.
                    console.warn(`SafeFontLoader: Timed out validating ${file.name}`);

                    // Force terminate and recreate worker if it hangs?
                    // This is robust:
                    if (workerInstance) {
                        workerInstance.terminate();
                        workerInstance = null;
                    }

                    reject(new Error("Font validation timed out"));
                }
            }, timeoutMs);

        } catch (e) {
            reject(e);
        }
    });
};
