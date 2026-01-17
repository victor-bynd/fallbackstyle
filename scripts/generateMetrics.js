
import fs from 'fs';
import path from 'path';
import opentype from 'opentype.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_DIR = path.join(__dirname, '../reference_fonts');
const OUTPUT_FILE = path.join(__dirname, '../src/constants/systemFonts.json');

// Ensure output directory exists
const outputDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Function to calculate x-height and cap-height if not directly available (though opentype usually provides them via os2/hhea or measuring 'x'/'H')
function measureGlyph(font, char) {
    const glyph = font.charToGlyph(char);
    if (glyph) {
        // yMax is often a good proxy for height if bounded correctly, but usually we look at the bounding box
        // For 'x', yMax ~ xHeight. For 'H', yMax ~ CapHeight.
        return glyph.yMax;
    }
    return null;
}

// Check for input directory
if (!fs.existsSync(INPUT_DIR)) {
    console.error(`Error: Reference fonts directory not found at: ${INPUT_DIR}`);
    console.log('Please create this directory and add your .ttf/.otf files.');
    process.exit(1);
}

const files = fs.readdirSync(INPUT_DIR).filter(file => /\.(ttf|otf|woff|woff2)$/i.test(file));

if (files.length === 0) {
    console.warn('No font files found in reference_fonts directory.');
    process.exit(0);
}

console.log(`Found ${files.length} font(s). Processing...`);

const systemFonts = [];

files.forEach(file => {
    const filePath = path.join(INPUT_DIR, file);
    try {
        // Opentype.js synchronous load is not supported in Node usually? 
        // Wait, loadSync is available in node build of opentype.js
        const font = opentype.loadSync(filePath);

        const upem = font.unitsPerEm;
        const os2 = font.tables.os2;
        const hhea = font.tables.hhea;
        // head var unused

        // Preferred Metrics: hhea is usually what browsers use for layout unless overrides exist
        // But for "standard" metrics, we usually want sTypoAscender/Descender if available (OS/2) 
        // because that's what we want to target for "normalized" look.
        // Actually, CSS matching usually looks at actual rendered height.
        // Let's grab all and decide.

        const ascender = hhea?.ascender || font.ascender;
        const descender = hhea?.descender || font.descender; // usually negative
        const lineGap = hhea?.lineGap || font.tables.os2?.sTypoLineGap || 0;

        // Measure x-height and cap-height
        // sxHeight/sCapHeight might be in OS/2
        let xHeight = os2?.sxHeight;
        let capHeight = os2?.sCapHeight;

        if (!xHeight) xHeight = measureGlyph(font, 'x');
        if (!capHeight) capHeight = measureGlyph(font, 'H');

        // Fallbacks if measurement fails
        if (!xHeight) xHeight = upem * 0.5; // Rough guess
        if (!capHeight) capHeight = upem * 0.7; // Rough guess

        const fontData = {
            id: path.parse(file).name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            name: font.names.fontFamily?.en || path.parse(file).name,
            fullName: font.names.fullName?.en || path.parse(file).name,
            postscriptName: font.names.postScriptName?.en,
            category: 'sans-serif', // Default, maybe we can guess from panose?
            metrics: {
                unitsPerEm: upem,
                ascent: ascender,
                descent: descender, // Keep raw value (negative)
                lineGap: lineGap,
                xHeight: xHeight,
                capHeight: capHeight
            },
            // Normalized (0-1 relative to UPEM) for easier comparison
            normalized: {
                ascent: ascender / upem,
                descent: Math.abs(descender) / upem, // Magnitude
                lineGap: lineGap / upem,
                xHeight: xHeight / upem,
                capHeight: capHeight / upem
            }
        };

        systemFonts.push(fontData);
        console.log(`Processed: ${fontData.name}`);

    } catch (err) {
        console.error(`Failed to parse ${file}:`, err.message);
    }
});

// Write JSON
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(systemFonts, null, 2));
console.log(`\nSuccessfully generated metrics for ${systemFonts.length} fonts.`);
console.log(`Database saved to: ${OUTPUT_FILE}`);
