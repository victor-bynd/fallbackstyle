import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useTypo } from '../context/useTypo';
import LanguageList from './LanguageList';

const LanguageSelectorModal = ({ onClose }) => {
    const {
        languages,
        visibleLanguageIds,
        toggleLanguageVisibility,
        showAllLanguages,
        hideAllLanguages,
        resetVisibleLanguages,
        primaryLanguages, // New
        togglePrimaryLanguage // New
    } = useTypo();

    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mt-12 overflow-hidden flex flex-col max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Language selector"
            >
                <div className="flex items-center justify-between p-5 border-b border-gray-200 shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Languages</h2>
                        <p className="text-xs text-slate-500 mt-1">
                            Showing {visibleLanguageIds.length} of {languages.length}
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

                <div className="px-5 py-3 border-b border-gray-50 bg-white shrink-0">
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={showAllLanguages}
                            className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                            Select all
                        </button>
                        <button
                            onClick={hideAllLanguages}
                            className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                            Select none
                        </button>
                        <button
                            onClick={resetVisibleLanguages}
                            className="px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                        >
                            Reset
                        </button>
                    </div>
                </div>

                <LanguageList
                    selectedIds={visibleLanguageIds}
                    onSelect={toggleLanguageVisibility}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    mode="multi"
                    primaryLanguages={primaryLanguages}
                    onTogglePrimary={togglePrimaryLanguage}
                />

                <div className="p-4 border-t border-gray-200 bg-slate-50 flex items-center justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

LanguageSelectorModal.propTypes = {
    onClose: PropTypes.func.isRequired
};

LanguageSelectorModal.propTypes = {
    onClose: PropTypes.func.isRequired
};

export default LanguageSelectorModal;
