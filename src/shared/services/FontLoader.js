import opentype from 'opentype.js';

export const parseFontFile = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const buffer = e.target.result;
                const font = opentype.parse(buffer);

                // Extract metadata
                const metadata = {
                    isVariable: false,
                    axes: { weight: null },
                    staticWeight: 400
                };

                // Check for Variable Font 'fvar' table
                if (font.tables.fvar && font.tables.fvar.axes) {
                    const weightAxis = font.tables.fvar.axes.find(a => a.tag === 'wght');
                    if (weightAxis) {
                        metadata.isVariable = true;
                        metadata.axes.weight = {
                            min: weightAxis.minValue,
                            max: weightAxis.maxValue,
                            default: weightAxis.defaultValue,
                            name: weightAxis.name && weightAxis.name.en ? weightAxis.name.en : 'Weight'
                        };
                    }
                }

                // Get static weight from OS/2 table usWeightClass
                if (font.tables.os2 && font.tables.os2.usWeightClass) {
                    metadata.staticWeight = font.tables.os2.usWeightClass;
                }

                // If variable but no weight axis found (unlikely but possible), treat as static
                // If weight axis found, we can use the default as a starting point.

                resolve({ font, metadata });
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
};

export const createFontUrl = (file) => {
    return URL.createObjectURL(file);
};
