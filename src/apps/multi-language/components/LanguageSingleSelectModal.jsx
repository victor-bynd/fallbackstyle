import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import LanguageList from './LanguageList';

const LanguageSingleSelectModal = ({ onClose, onSelect, currentId, title = "Select Language", subtitle = null }) => {
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    return createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-[100] p-4" onClick={onClose}>
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mt-12 overflow-hidden flex flex-col max-h-[75vh] animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label={title}
            >
                <div className="flex items-center justify-between p-4 border-b border-gray-200 shrink-0 bg-slate-50/50">
                    <div>
                        <h2 className="text-base font-bold text-slate-800">{title}</h2>
                        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
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

                <LanguageList
                    onSelect={onSelect}
                    selectedIds={currentId}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    mode="single"
                    showAuto={true}
                />
            </div>
        </div>,
        document.body
    );
};

LanguageSingleSelectModal.propTypes = {
    onClose: PropTypes.func.isRequired,
    onSelect: PropTypes.func.isRequired,
    currentId: PropTypes.string,
    title: PropTypes.string,
    subtitle: PropTypes.node
};

export default LanguageSingleSelectModal;
