import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useTypo } from '../context/useTypo';

const LanguageMultiSelectModal = ({ onClose, onConfirm, title = "Select Languages", confirmLabel = "Add", initialSelectedIds = [] }) => {
    const { languages } = useTypo();
    const [selectedIds, setSelectedIds] = useState(new Set(initialSelectedIds));
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    const groups = useMemo(() => {
        const grouped = {
            Latin: [],
            Greek: [],
            Cyrillic: [],
            RTL: [],
            Indic: [],
            'Southeast Asia': [],
            CJK: [],
            Other: []
        };

        const push = (key, lang) => {
            if (!grouped[key]) grouped.Other.push(lang);
            else grouped[key].push(lang);
        };

        languages.forEach((lang) => {
            // Filter by search term
            if (searchTerm && !lang.name.toLowerCase().includes(searchTerm.toLowerCase()) && !lang.id.toLowerCase().includes(searchTerm.toLowerCase())) {
                return;
            }

            if (lang.dir === 'rtl') {
                push('RTL', lang);
                return;
            }

            if (lang.script === 'Latn') push('Latin', lang);
            else if (lang.script === 'Grek') push('Greek', lang);
            else if (lang.script === 'Cyrl') push('Cyrillic', lang);
            else if (['Deva', 'Beng', 'Knda', 'Telu', 'Gujr', 'Guru', 'Mlym', 'Taml'].includes(lang.script)) push('Indic', lang);
            else if (lang.script === 'Thai') push('Southeast Asia', lang);
            else if (['Hans', 'Hant', 'Jpan', 'Kore'].includes(lang.script)) push('CJK', lang);
            else push('Other', lang);
        });

        const order = ['Latin', 'Greek', 'Cyrillic', 'RTL', 'Indic', 'Southeast Asia', 'CJK', 'Other'];
        return order
            .map((key) => ({ key, items: grouped[key] }))
            .filter((g) => g.items.length > 0);
    }, [languages, searchTerm]);

    const toggleSelection = (langId) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(langId)) {
                next.delete(langId);
            } else {
                next.add(langId);
            }
            return next;
        });
    };

    const handleConfirm = () => {
        onConfirm(Array.from(selectedIds));
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-xl mt-12 overflow-hidden flex flex-col max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label={title}
            >
                <div className="flex items-center justify-between p-5 border-b border-gray-200 shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
                        <p className="text-xs text-slate-500 mt-1">
                            {selectedIds.size} selected
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        title="Close"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className="p-3 border-b border-gray-100 bg-slate-50/50 shrink-0">
                    <input
                        type="text"
                        placeholder="Search languages..."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoFocus
                    />
                </div>

                <div className="p-5 overflow-auto custom-scrollbar flex-1">
                    <div className="space-y-6">
                        {groups.map((group) => (
                            <div key={group.key}>
                                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2 sticky top-0 bg-white/95 backdrop-blur-sm py-1 z-10">
                                    {group.key}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {group.items.map((lang) => {
                                        const isSelected = selectedIds.has(lang.id);
                                        return (
                                            <label
                                                key={lang.id}
                                                className={`
                                                    flex items-center justify-between gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all border
                                                    ${isSelected
                                                        ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500/20'
                                                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                                    }
                                                `}
                                            >
                                                <div className="min-w-0 flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleSelection(lang.id)}
                                                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <div className="min-w-0">
                                                        <div className={`text-sm font-medium truncate ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>
                                                            {lang.name}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 font-mono">
                                                            {lang.id}
                                                        </div>
                                                    </div>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                        {groups.length === 0 && (
                            <div className="text-center py-8 text-slate-400 text-sm">
                                No languages found matching "{searchTerm}"
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-gray-200 bg-slate-50/50 shrink-0 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={selectedIds.size === 0}
                        className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
                    >
                        {confirmLabel} ({selectedIds.size})
                    </button>
                </div>
            </div>
        </div>
    );
};

LanguageMultiSelectModal.propTypes = {
    onClose: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired,
    title: PropTypes.string,
    confirmLabel: PropTypes.string,
    initialSelectedIds: PropTypes.arrayOf(PropTypes.string)
};

export default LanguageMultiSelectModal;
