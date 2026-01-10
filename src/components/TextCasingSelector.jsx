import { useUI } from '../context/UIContext';

const TextCasingSelector = ({ variant = 'default' }) => {
    const { textCase, setTextCase } = useUI();

    const options = [
        { id: 'none', label: '–' },
        { id: 'lowercase', label: 'abc' },
        { id: 'uppercase', label: 'ABC' },
        { id: 'capitalize', label: 'Abc' }
    ];

    if (variant === 'simple') {
        return (
            <div className="flex items-center gap-1">
                {options.map(opt => (
                    <button
                        key={opt.id}
                        onClick={() => setTextCase(opt.id)}
                        className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all whitespace-nowrap min-w-[32px] ${textCase === opt.id
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                            }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        );
    }

    return (
        <div className="bg-white p-1 rounded-lg border border-gray-200 flex items-center px-2 h-[42px] gap-1">
            <span className="text-[10px] text-slate-400 font-bold tracking-wider mr-1">Casing</span>
            {options.map(opt => (
                <button
                    key={opt.id}
                    onClick={() => setTextCase(opt.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap min-w-[32px] ${textCase === opt.id
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'text-slate-500 hover:bg-gray-50'
                        }`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
};

export default TextCasingSelector;
