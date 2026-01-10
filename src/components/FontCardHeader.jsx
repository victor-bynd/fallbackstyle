import PropTypes from 'prop-types';

const FontCardHeader = ({
    font,
    isPrimary,
    onResetOverride,
    getFontColor,
    updateFontColor,
    isInherited,
    readOnly
}) => {
    const rawName = font.fileName || font.name || 'No font uploaded';
    let displayName = rawName;
    let extension = '';

    if (rawName && rawName.lastIndexOf('.') !== -1) {
        const lastDot = rawName.lastIndexOf('.');
        if (lastDot > 0) {
            displayName = rawName.substring(0, lastDot);
            extension = rawName.substring(lastDot + 1);
        }
    }

    return (
        <div className="flex gap-3 items-start">
            <div className={`flex-1 min-w-0 ${(onResetOverride || isPrimary) ? 'pr-8' : ''}`}>
                <div className="font-mono text-[13px] font-bold text-slate-800 truncate mb-1">
                    {displayName}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    {(!(!font.fontObject && !font.fileName)) && (
                        <div className="relative w-3.5 h-3.5 flex-shrink-0 rounded-full overflow-hidden border border-slate-200">
                            <div className="absolute inset-0" style={{ backgroundColor: getFontColor(font.id) }} />
                            <input
                                type="color"
                                value={getFontColor(font.id)}
                                onInput={(e) => updateFontColor(font.id, e.target.value)}
                                disabled={isInherited || readOnly}
                                className={`absolute inset-0 w-full h-full opacity-0 ${isInherited || readOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                            />
                        </div>
                    )}
                    {font.fontObject && <span>{font.fontObject.numGlyphs} glyphs</span>}
                    {extension && <span className="uppercase font-bold text-slate-400 bg-slate-100 px-1 rounded">{extension}</span>}
                </div>
            </div>
        </div>
    );
};

FontCardHeader.propTypes = {
    font: PropTypes.object.isRequired,
    isPrimary: PropTypes.bool.isRequired,
    onResetOverride: PropTypes.func, // Optional
    getFontColor: PropTypes.func.isRequired,
    updateFontColor: PropTypes.func.isRequired,
    isInherited: PropTypes.bool,
    readOnly: PropTypes.bool
};

export default FontCardHeader;
