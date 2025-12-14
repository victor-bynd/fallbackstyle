import PropTypes from 'prop-types';
import clsx from 'clsx';

const WeightToggleGroup = ({ options, value, onChange, className }) => {
    return (
        <div className={clsx('flex gap-1 bg-slate-100 p-1 rounded-lg', className)}>
            {options.map(opt => {
                const isActive = value === opt.value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        disabled={opt.disabled}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (opt.disabled) return;
                            onChange(opt.value);
                        }}
                        className={clsx(
                            'px-2 py-1 text-[10px] font-bold rounded-md transition-all whitespace-nowrap',
                            opt.disabled && 'opacity-40 cursor-not-allowed',
                            !opt.disabled && !isActive && 'text-slate-500 hover:text-slate-700 hover:bg-white/60',
                            !opt.disabled && isActive && 'bg-white text-indigo-600 shadow-sm'
                        )}
                        title={opt.disabled ? `${opt.label} (Unavailable)` : opt.label}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
};

WeightToggleGroup.propTypes = {
    options: PropTypes.arrayOf(
        PropTypes.shape({
            label: PropTypes.string.isRequired,
            value: PropTypes.number.isRequired,
            disabled: PropTypes.bool
        })
    ).isRequired,
    value: PropTypes.number,
    onChange: PropTypes.func.isRequired,
    className: PropTypes.string
};

export default WeightToggleGroup;
