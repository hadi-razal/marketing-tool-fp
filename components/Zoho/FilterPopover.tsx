import React, { useState, useMemo } from 'react';
import { Search, X, Check, Filter, ChevronDown, ChevronRight, MapPin, Building2, Layers, Globe2, RefreshCw, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';

/* ─── Types ─────────────────────────────────────────────── */

export interface FilterCategory {
    key: string;
    label: string;
    icon: React.ReactNode;
    options: string[];
}

export interface FilterSelections {
    [key: string]: string[];
}

interface FilterPopoverProps {
    isOpen: boolean;
    onClose: () => void;
    categories: FilterCategory[];
    selections: FilterSelections;
    onApply: (selections: FilterSelections) => void;
    onClear: () => void;
    /** @deprecated — kept for backward compat, ignored */
    availableCountries?: string[];
    availableContinents?: string[];
    selectedCountries?: string[];
    selectedContinents?: string[];
}

/* ─── Section ─────────────────────────────────────────────── */

const FilterSection: React.FC<{
    category: FilterCategory;
    selected: string[];
    onToggle: (value: string) => void;
}> = ({ category, selected, onToggle }) => {
    const [expanded, setExpanded] = useState(selected.length > 0);
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        if (!search.trim()) return category.options;
        const q = search.toLowerCase();
        return category.options.filter(o => o.toLowerCase().includes(q));
    }, [category.options, search]);

    const selectedCount = selected.length;

    return (
        <div className="border-b border-zinc-100 last:border-b-0">
            <button
                type="button"
                onClick={() => setExpanded(e => !e)}
                className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-zinc-50"
            >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-500">
                    {category.icon}
                </span>
                <span className="flex-1 text-xs font-bold uppercase tracking-wider text-zinc-600">
                    {category.label}
                </span>
                {selectedCount > 0 && (
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">
                        {selectedCount}
                    </span>
                )}
                {expanded ? (
                    <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
                )}
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-3 space-y-2">
                            {/* Search within section */}
                            {category.options.length > 6 && (
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-400" />
                                    <input
                                        type="text"
                                        placeholder={`Search ${category.label.toLowerCase()}...`}
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        className="w-full rounded-lg border border-zinc-200 bg-zinc-50/80 py-1.5 pl-7 pr-3 text-xs text-zinc-950 outline-none transition-all placeholder:text-zinc-400 focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                                    />
                                </div>
                            )}

                            {/* Options */}
                            <div className="max-h-40 space-y-0.5 overflow-y-auto custom-scrollbar pr-1">
                                {filtered.map(option => {
                                    const isChecked = selected.includes(option);
                                    return (
                                        <label
                                            key={option}
                                            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-orange-50 group"
                                        >
                                            <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${isChecked ? 'border-orange-500 bg-orange-500' : 'border-zinc-300 group-hover:border-orange-400'}`}>
                                                {isChecked && <Check className="h-3 w-3 text-white" />}
                                            </div>
                                            <span className={`truncate text-sm ${isChecked ? 'font-medium text-zinc-950' : 'text-zinc-600 group-hover:text-zinc-950'}`}>
                                                {option || 'Unknown'}
                                            </span>
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={isChecked}
                                                onChange={() => onToggle(option)}
                                            />
                                        </label>
                                    );
                                })}
                                {filtered.length === 0 && (
                                    <p className="py-2 text-center text-xs text-zinc-400">No results</p>
                                )}
                            </div>

                            {/* Quick actions */}
                            {selectedCount > 0 && (
                                <button
                                    type="button"
                                    onClick={() => selected.forEach(s => onToggle(s))}
                                    className="text-[10px] font-semibold text-orange-600 hover:text-orange-700 transition-colors"
                                >
                                    Clear {category.label.toLowerCase()}
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

/* ─── Popover ─────────────────────────────────────────────── */

export const FilterPopover: React.FC<FilterPopoverProps> = ({
    isOpen,
    onClose,
    categories = [],
    selections = {},
    onApply,
    onClear,
}) => {
    const [tempSelections, setTempSelections] = useState<FilterSelections>(selections);

    // Reset temp state when opening
    React.useEffect(() => {
        if (isOpen) {
            setTempSelections(selections);
        }
    }, [isOpen, selections]);

    const toggleOption = (key: string, value: string) => {
        setTempSelections(prev => {
            const current = prev[key] || [];
            const next = current.includes(value)
                ? current.filter(v => v !== value)
                : [...current, value];
            return { ...prev, [key]: next };
        });
    };

    const totalSelected = Object.values(tempSelections).reduce((sum, arr) => sum + arr.length, 0);

    const handleApply = () => {
        onApply(tempSelections);
        onClose();
    };

    const handleClear = () => {
        const empty: FilterSelections = {};
        categories.forEach(c => { empty[c.key] = []; });
        setTempSelections(empty);
        onClear();
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-40 bg-zinc-950/20 backdrop-blur-[2px]"
                        onClick={onClose}
                    />

                    {/* Sidebar Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 bottom-0 w-[340px] max-w-[90vw] bg-white border-l border-zinc-200 shadow-2xl z-50 overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-5 py-4">
                            <h3 className="flex items-center gap-2 text-base font-bold text-zinc-950">
                                <Filter className="h-4 w-4 text-orange-500" />
                                Filters
                                {totalSelected > 0 && (
                                    <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">
                                        {totalSelected}
                                    </span>
                                )}
                            </h3>
                            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-950">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Filter sections */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {categories.map(category => (
                                <FilterSection
                                    key={category.key}
                                    category={category}
                                    selected={tempSelections[category.key] || []}
                                    onToggle={(value) => toggleOption(category.key, value)}
                                />
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="flex gap-3 border-t border-zinc-200 bg-white p-5">
                            <Button variant="ghost" onClick={handleClear} className="flex-1 h-11 text-sm font-semibold text-zinc-600 hover:bg-zinc-100">
                                Clear all
                            </Button>
                            <Button onClick={handleApply} className="flex-1 h-11 text-sm font-bold bg-orange-500 hover:bg-orange-600 text-white border-0 shadow-lg shadow-orange-500/20">
                                Apply Filters
                            </Button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
