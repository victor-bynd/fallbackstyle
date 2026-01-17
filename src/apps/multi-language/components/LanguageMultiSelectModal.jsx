import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import LanguageList from './LanguageList';

import { createPortal } from 'react-dom';

const LanguageMultiSelectModal = ({ onClose, onConfirm, title = "Select Languages", confirmLabel = "Add", initialSelectedIds = [] }) => {
    const [selectedIds, setSelectedIds] = useState(new Set(initialSelectedIds));
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

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

    return createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-[9999] p-4 font-sans" onClick={onClose}>
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mt-12 overflow-hidden flex flex-col max-h-[85vh]"
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

                <LanguageList
                    selectedIds={selectedIds}
                    onSelect={toggleSelection}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    mode="multi"
                />

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
        </div>,
        document.body
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
