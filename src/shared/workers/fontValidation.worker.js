import opentype from 'opentype.js';

self.onmessage = async (e) => {
    const { buffer, fileName } = e.data;

    try {
        const font = opentype.parse(buffer);
        // We just need to know if it parses successfully. 
        // We can optionally extract basic metadata here if we want to avoid double-parsing,
        // but for now, the primary goal is safety. 
        // Returning true means "it's safe to parse on main thread".

        // Basic check to ensure it's a valid font object
        if (!font.tables || !font.unitsPerEm) {
            throw new Error("Invalid font object structure");
        }

        self.postMessage({ success: true, fileName });
    } catch (error) {
        self.postMessage({
            success: false,
            fileName,
            error: error.message || "Unknown parsing error"
        });
    }
};
