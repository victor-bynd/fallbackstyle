import PropTypes from 'prop-types';

const LanguageEditPanel = ({
    editText,
    setEditText,
    languageDir,
    onCancel,
    onSave,
    onReset
}) => {
    return (
        <div className="p-4 bg-slate-50 border-b border-gray-100">
            <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full h-24 p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none mb-3"
                placeholder="Type something..."
                dir={languageDir || 'ltr'}
            />
            <div className="flex justify-end gap-2">
                <button
                    onClick={onCancel}
                    className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700"
                >
                    Cancel
                </button>
                <button
                    onClick={onReset}
                    className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 mr-auto"
                >
                    Reset to Default
                </button>
                <button
                    onClick={onSave}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                >
                    Save Changes
                </button>
            </div>
        </div>
    );
};

LanguageEditPanel.propTypes = {
    editText: PropTypes.string.isRequired,
    setEditText: PropTypes.func.isRequired,
    languageDir: PropTypes.string,
    onCancel: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    onReset: PropTypes.func.isRequired
};

export default LanguageEditPanel;
