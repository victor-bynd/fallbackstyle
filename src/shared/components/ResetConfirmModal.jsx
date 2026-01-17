
import { createPortal } from 'react-dom';

const ResetConfirmModal = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-white/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-rose-500">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                    </div>

                    <h3 className="text-lg font-bold text-slate-800 text-center mb-2">
                        Reset Application?
                    </h3>

                    <p className="text-sm text-slate-500 text-center mb-6">
                        This will delete all saved fonts, configurations, and overrides. The application will reload and return to its initial state. This action cannot be undone.
                    </p>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 hover:text-slate-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex-1 px-4 py-2.5 rounded-lg bg-rose-500 text-white font-semibold text-sm hover:bg-rose-600 shadow-sm shadow-rose-200 transition-all hover:shadow-md hover:shadow-rose-300"
                        >
                            Yes, Reset App
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ResetConfirmModal;
