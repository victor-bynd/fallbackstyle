import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

const FontSelectionModal = ({ onClose, onSelect, currentFontId, fontOptions, title = "Select Font" }) => {
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    // Filter fonts based on search term
    const filteredFonts = fontOptions.filter(font =>
        font.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (font.fileName && font.fileName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Default options
    const defaultOptions = [
        { id: '', label: 'Auto (Default)', description: 'Automatically select fallback fonts' },
        { id: 'legacy', label: 'System Fallback', description: 'Use browser system fonts' }
    ];

    const filteredDefaults = defaultOptions.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opt.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelect = (fontId) => {
        onSelect(fontId);
        onClose();
    };

    const isSelected = (id) => currentFontId === id;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4" onClick={onClose}>
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label={title}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 shrink-0 bg-slate-50/50">
                    <div>
                        <h2 className="text-base font-bold text-slate-800">{title}</h2>
                        <p className="text-xs text-slate-500 mt-1">
                            {filteredFonts.length + filteredDefaults.length} {filteredFonts.length + filteredDefaults.length === 1 ? 'option' : 'options'} available
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        title="Close"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Search */}
                <div className="p-3 border-b border-gray-100 bg-white shrink-0">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search fonts..."
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                        autoFocus
                    />
                </div>

                {/* Font List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-2 space-y-4">
                        {/* Default Options */}
                        {filteredDefaults.length > 0 && (
                            <div>
                                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2 px-2 sticky top-0 bg-white/95 backdrop-blur-sm py-1 z-10">
                                    Default Options
                                </div>
                                <div className="space-y-1">
                                    {filteredDefaults.map((option) => {
                                        const selected = isSelected(option.id);
                                        return (
                                            <button
                                                key={option.id}
                                                onClick={() => handleSelect(option.id)}
                                                className={`
                                                    w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all border text-left
                                                    ${selected
                                                        ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500/10'
                                                        : 'bg-white border-transparent hover:border-slate-200 hover:bg-slate-50'
                                                    }
                                                `}
                                            >
                                                <div className="min-w-0">
                                                    <div className={`text-sm font-bold ${selected ? 'text-indigo-900' : 'text-slate-700'}`}>
                                                        {option.label}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 font-medium">
                                                        {option.description}
                                                    </div>
                                                </div>
                                                {selected && (
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-indigo-600 flex-shrink-0">
                                                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                                    </svg>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Custom Fonts */}
                        {filteredFonts.length > 0 && (
                            <div>
                                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2 px-2 sticky top-0 bg-white/95 backdrop-blur-sm py-1 z-10">
                                    Custom Fonts
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                    {filteredFonts.map((font) => {
                                        const selected = isSelected(font.id);
                                        return (
                                            <button
                                                key={font.id}
                                                onClick={() => handleSelect(font.id)}
                                                className={`
                                                    flex items-center justify-between gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all border text-left
                                                    ${selected
                                                        ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500/10'
                                                        : 'bg-white border-transparent hover:border-slate-200 hover:bg-slate-50'
                                                    }
                                                `}
                                            >
                                                <div className="min-w-0">
                                                    <div className={`text-sm font-bold truncate ${selected ? 'text-indigo-900' : 'text-slate-700'}`}>
                                                        {font.label}
                                                    </div>
                                                    {font.fileName && (
                                                        <div className="text-[10px] text-slate-400 font-mono font-medium truncate">
                                                            {font.fileName}
                                                        </div>
                                                    )}
                                                </div>
                                                {selected && (
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-indigo-600 flex-shrink-0">
                                                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                                    </svg>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* No Results */}
                        {filteredDefaults.length === 0 && filteredFonts.length === 0 && (
                            <div className="text-center py-12 px-4">
                                <div className="text-slate-300 mb-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mx-auto opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <p className="text-sm text-slate-500 font-medium">No fonts found matching &quot;{searchTerm}&quot;</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

FontSelectionModal.propTypes = {
    onClose: PropTypes.func.isRequired,
    onSelect: PropTypes.func.isRequired,
    currentFontId: PropTypes.string,
    fontOptions: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        fileName: PropTypes.string,
        name: PropTypes.string
    })).isRequired,
    title: PropTypes.string
};

export default FontSelectionModal;
