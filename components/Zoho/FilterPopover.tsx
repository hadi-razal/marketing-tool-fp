import React, { useState, useMemo } from 'react';
import { Search, X, Check, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';

interface FilterPopoverProps {
    isOpen: boolean;
    onClose: () => void;
    availableCountries: string[];
    availableContinents: string[];
    selectedCountries: string[];
    selectedContinents: string[];
    onApply: (countries: string[], continents: string[]) => void;
    onClear: () => void;
}

export const FilterPopover: React.FC<FilterPopoverProps> = ({
    isOpen,
    onClose,
    availableCountries,
    availableContinents,
    selectedCountries,
    selectedContinents,
    onApply,
    onClear
}) => {
    const [tempCountries, setTempCountries] = useState<string[]>(selectedCountries);
    const [tempContinents, setTempContinents] = useState<string[]>(selectedContinents);
    const [search, setSearch] = useState('');

    // Reset temp state when opening
    React.useEffect(() => {
        if (isOpen) {
            setTempCountries(selectedCountries);
            setTempContinents(selectedContinents);
        }
    }, [isOpen, selectedCountries, selectedContinents]);

    const filteredCountries = useMemo(() => {
        return availableCountries.filter(c => c.toLowerCase().includes(search.toLowerCase()));
    }, [availableCountries, search]);

    const toggleCountry = (country: string) => {
        setTempCountries(prev =>
            prev.includes(country) ? prev.filter(c => c !== country) : [...prev, country]
        );
    };

    const toggleContinent = (continent: string) => {
        setTempContinents(prev =>
            prev.includes(continent) ? prev.filter(c => c !== continent) : [...prev, continent]
        );
    };

    const handleApply = () => {
        onApply(tempCountries, tempContinents);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={onClose} />
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full right-0 mt-2 w-80 bg-[#09090b] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[600px]"
                    >
                        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <Filter className="w-4 h-4 text-orange-500" /> Filters
                            </h3>
                            <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
                            {/* Continents */}
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Continent / Area</label>
                                <div className="space-y-1">
                                    {availableContinents.map(continent => (
                                        <label key={continent} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer group transition-colors">
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${tempContinents.includes(continent) ? 'bg-orange-500 border-orange-500' : 'border-zinc-700 group-hover:border-zinc-500'}`}>
                                                {tempContinents.includes(continent) && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                            <span className={`text-sm ${tempContinents.includes(continent) ? 'text-white font-medium' : 'text-zinc-400 group-hover:text-zinc-300'}`}>
                                                {continent || 'Unknown'}
                                            </span>
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={tempContinents.includes(continent)}
                                                onChange={() => toggleContinent(continent)}
                                            />
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Countries */}
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Country</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                                    <input
                                        type="text"
                                        placeholder="Search countries..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500/50 transition-all placeholder:text-zinc-600"
                                    />
                                </div>
                                <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                    {filteredCountries.map(country => (
                                        <label key={country} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer group transition-colors">
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${tempCountries.includes(country) ? 'bg-orange-500 border-orange-500' : 'border-zinc-700 group-hover:border-zinc-500'}`}>
                                                {tempCountries.includes(country) && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                            <span className={`text-sm ${tempCountries.includes(country) ? 'text-white font-medium' : 'text-zinc-400 group-hover:text-zinc-300'}`}>
                                                {country || 'Unknown'}
                                            </span>
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={tempCountries.includes(country)}
                                                onChange={() => toggleCountry(country)}
                                            />
                                        </label>
                                    ))}
                                    {filteredCountries.length === 0 && (
                                        <p className="text-xs text-zinc-600 text-center py-2">No countries found</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-white/5 bg-zinc-900/50 flex gap-3">
                            <Button variant="ghost" onClick={onClear} className="flex-1 h-9 text-xs">Clear</Button>
                            <Button onClick={handleApply} className="flex-1 h-9 text-xs bg-orange-500 hover:bg-orange-600 text-white border-0">Apply Filters</Button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
