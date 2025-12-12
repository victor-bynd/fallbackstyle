import { useTypo } from '../context/TypoContext';

const FontTabs = () => {
    const { fonts, activeFont, setActiveFont } = useTypo();

    return (
        <div className="pb-6">
            {fonts.map((font) => {
                const isActive = font.id === activeFont;

                return (
                    <div
                        key={font.id}
                        className={`
                            bg-slate-50 rounded-lg p-4 border cursor-pointer transition-all
                            ${isActive
                                ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                                : 'border-slate-200 hover:border-slate-300'
                            }
                        `}
                        onClick={() => setActiveFont(font.id)}
                    >
                        <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
                            {font.type === 'primary' ? 'Primary Font' : 'Fallback Font'}
                        </div>
                        <div className="font-mono text-sm break-all text-slate-700 font-medium">
                            {font.fileName || font.name || 'No font uploaded'}
                        </div>
                        {font.fontObject && (
                            <div className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                {font.fontObject.numGlyphs} glyphs
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default FontTabs;
