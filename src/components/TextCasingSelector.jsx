import { useTypo } from '../context/useTypo';

const TextCasingSelector = () => {
    const { textCase, setTextCase } = useTypo();

    const options = [
        { id: 'none', label: '–' },
        { id: 'lowercase', label: 'abc' },
        { id: 'uppercase', label: 'ABC' },
        { id: 'capitalize', label: 'Abc' }
    ];

    return (
        <div className="bg-white p-1 rounded-lg border border-gray-200 flex items-center px-2 h-[42px] gap-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-1">CASING</span>
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
