import opentype from 'opentype.js';

export const parseFontFile = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const buffer = e.target.result;
                const font = opentype.parse(buffer);
                resolve(font);
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
