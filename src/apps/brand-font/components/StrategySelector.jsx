import React from 'react';
import clsx from 'clsx';
import InfoTooltip from '../../../shared/components/InfoTooltip';

const strategies = [
    {
        id: 'auto',
        label: 'Auto',
        description: 'The browser determines the font display strategy.',
        timeline: {
            block: 'Short',
            swap: 'Infinite',
            failure: 'None'
        },
        recommendation: 'Default behavior, safe for most cases.'
    },
    {
        id: 'block',
        label: 'Block',
        description: 'Gives the font a short period to load before showing a fallback. If it loads, it swaps.',
        timeline: {
            block: '3s',
            swap: 'Infinite',
            failure: 'None'
        },
        recommendation: 'Best for branding-critical fonts where FOUT is unacceptable.'
    },
    {
        id: 'swap',
        label: 'Swap',
        description: 'Shows the fallback font immediately while loading the custom font, then swaps it in.',
        timeline: {
            block: '0s', // technically extremely short
            swap: 'Infinite',
            failure: 'None'
        },
        recommendation: 'Best for content where text visibility is paramount.'
    },
    {
        id: 'fallback',
        label: 'Fallback',
        description: 'Short block period, followed by a short swap period. If it doesn\'t load quickly, the fallback stays.',
        timeline: {
            block: '0.1s',
            swap: '3s',
            failure: 'Permanent'
        },
        recommendation: 'Good for secondary fonts or optional decorative text.'
    },
    {
        id: 'optional',
        label: 'Optional',
        description: 'Extremely short block period and no swap period. If not cached, fallback is used.',
        timeline: {
            block: '0.1s',
            swap: '0s',
            failure: 'Permanent'
        },
        recommendation: 'Best for performance-critical pages with slow connections.'
    }
];

const TimelineVisual = ({ timeline }) => {
    return (
        <div className="mt-2 w-full max-w-[200px] flex flex-col gap-1">
            <div className="flex text-[10px] font-mono text-slate-300 justify-between px-0.5">
                <span>0s</span>
                <span>3s</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                {/* Block Period - Invisible */}
                <div
                    className="h-full bg-slate-300 transition-all duration-500"
                    style={{
                        flex: timeline.block === '3s' ? 3 : (timeline.block === 'Short' || timeline.block === '0.1s') ? 0.3 : 0,
                        opacity: timeline.block === '0s' ? 0 : 1
                    }}
                    title={`Block Period: ${timeline.block}`}
                />

                {/* Swap Period - Fallback Visible */}
                <div
                    className="h-full bg-orange-500 transition-all duration-500"
                    style={{
                        flex: timeline.swap === 'Infinite' ? 10 : (timeline.swap === '3s' ? 3 : 0),
                        opacity: timeline.swap === '0s' ? 0 : 1
                    }}
                    title={`Swap Period: ${timeline.swap}`}
                />

                {/* Failure/Fallback Final */}
                <div
                    className="h-full bg-orange-500 transition-all duration-500"
                    style={{
                        flex: timeline.failure === 'Permanent' ? 10 : 0,
                        opacity: timeline.failure === 'None' ? 0 : 1
                    }}
                    title={`Fallback Used: ${timeline.failure}`}
                />
            </div>
            <div className="flex gap-3 justify-center mt-2.5">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Invisible</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Fallback</span>
                </div>
            </div>
        </div>
    );
};

const StrategySelector = ({ value = 'auto', onChange }) => {
    return (
        <div className="space-y-4">
            <div className="flex flex-col">
                <h3 className="text-[13px] font-bold text-slate-900 uppercase tracking-wider">Loading Strategy</h3>
                <p className="text-[10px] text-slate-500 font-medium tracking-tight">
                    CONTROL HOW FONTS RENDER WHILE LOADING
                </p>
            </div>

            <div className="grid grid-cols-1 gap-2">
                {strategies.map((strategy) => (
                    <label
                        key={strategy.id}
                        className={clsx(
                            "flex flex-col gap-3 p-4 rounded-xl border cursor-pointer transition-all group hover:border-indigo-200",
                            value === strategy.id
                                ? "bg-indigo-50/50 border-indigo-200 ring-1 ring-indigo-500/10"
                                : "bg-white border-slate-100 hover:bg-slate-50"
                        )}
                    >
                        <div className="flex items-start gap-3 w-full">
                            <div className="pt-0.5">
                                <input
                                    type="radio"
                                    name="font-display"
                                    value={strategy.id}
                                    checked={value === strategy.id}
                                    onChange={() => onChange(strategy.id)}
                                    className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <span className={clsx(
                                        "text-xs font-bold uppercase tracking-wider transition-colors",
                                        value === strategy.id ? "text-indigo-700" : "text-slate-700"
                                    )}>
                                        {strategy.label}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                    {strategy.description}
                                </p>
                                <p className="text-[11px] text-slate-400 mt-1.5 leading-snug italic">
                                    {strategy.recommendation}
                                </p>
                            </div>
                        </div>

                        {/* Inline Visualization */}
                        <div className="pl-7 pr-2">
                            <div className="bg-slate-900/5 rounded-lg p-3">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Timeline</div>
                                <TimelineVisual timeline={strategy.timeline} />
                            </div>
                        </div>
                    </label>
                ))}
            </div>
        </div>
    );
};

export default StrategySelector;
