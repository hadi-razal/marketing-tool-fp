import React, { useState, useEffect, useMemo } from 'react';
import { Save, Globe, MapPin, Phone, Linkedin, Building2, Hash, X, Search } from 'lucide-react';
import { SoftInput } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { zohoApi } from '@/lib/zoho';
import { toast } from 'sonner';

import { COUNTRIES } from '@/lib/countries';

interface ExhibitorFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any;
}

export const ExhibitorFormModal: React.FC<ExhibitorFormModalProps> = ({ isOpen, onClose, onSuccess, initialData }) => {
    const [formData, setFormData] = useState({
        Company: '',
        Company_Type: '',
        Website: '',
        City: '',
        Country: '',
        Area: '',
        Contact_Details: '',
        Company_Linkedin: '',
        FP_Level: '',
        Events: ''
    });
    const [loading, setLoading] = useState(false);
    const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
    const [countrySearch, setCountrySearch] = useState('');

    const extractValue = (val: any): string => {
        if (!val) return '';
        if (typeof val === 'string') return val;
        if (Array.isArray(val)) {
            return val.length > 0 ? extractValue(val[0]) : '';
        }
        if (typeof val === 'object') {
            return val.url || val.value || '';
        }
        return '';
    };

    useEffect(() => {
        // Reset form when modal opens/closes or initialData changes
        if (!isOpen) {
            // Reset form when modal closes
            setFormData({
                Company: '',
                Company_Type: '',
                Website: '',
                City: '',
                Country: '',
                Area: '',
                Contact_Details: '',
                Company_Linkedin: '',
                FP_Level: '',
                Events: ''
            });
            return;
        }
        
        // When modal opens, initialize form with initialData immediately
        if (initialData) {
            setFormData({
                Company: initialData.Company || '',
                Company_Type: initialData.Company_Type || initialData.Type || '',
                Website: extractValue(initialData.Website || initialData.Company_Website || initialData.website),
                City: initialData.City || '',
                Country: initialData.Country || '',
                Area: initialData.Area || initialData.World_Area || '',
                Contact_Details: initialData.Contact_Details || '',
                Company_Linkedin: extractValue(initialData.Company_Linkedin || initialData.Linkedin),
                FP_Level: initialData.FP_Level || '',
                Events: Array.isArray(initialData.Events) ? initialData.Events.join(', ') : (initialData.Events || '')
            });
        } else {
            setFormData({
                Company: '',
                Company_Type: '',
                Website: '',
                City: '',
                Country: '',
                Area: '',
                Contact_Details: '',
                Company_Linkedin: '',
                FP_Level: '',
                Events: ''
            });
        }
    }, [initialData, isOpen]);

    const handleCountrySelect = (country: string) => {
        setFormData({ ...formData, Country: country });
        setIsCountryDropdownOpen(false);
        setCountrySearch('');
    };

    const filteredCountries = useMemo(() => {
        if (!countrySearch) return COUNTRIES;
        return COUNTRIES.filter(country => 
            country.toLowerCase().includes(countrySearch.toLowerCase())
        );
    }, [countrySearch]);

    // Helper function to format URL fields for Zoho
    const formatUrlField = (url: string): string | undefined => {
        if (!url || url.trim() === '') return undefined; // Omit field if empty
        const trimmedUrl = url.trim();
        // If URL doesn't start with http:// or https://, add https://
        if (!trimmedUrl.match(/^https?:\/\//i)) {
            return `https://${trimmedUrl}`;
        }
        return trimmedUrl;
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // Map form data to API format - convert Area to World_Area
            const { Area, Website, Company_Linkedin, ...restData } = formData;
            const apiData: any = {
                ...restData,
                World_Area: Area || ''
            };

            // Format URL fields - Zoho URL fields require valid URLs or should be omitted
            // Don't send empty strings or null - only send if there's a valid value
            const formattedWebsite = formatUrlField(Website);
            if (formattedWebsite !== undefined) {
                apiData.Website = formattedWebsite;
            }
            // If empty, omit the field entirely (don't send null or empty string)

            const formattedLinkedin = formatUrlField(Company_Linkedin);
            if (formattedLinkedin !== undefined) {
                apiData.Company_Linkedin = formattedLinkedin;
            }
            // If empty, omit the field entirely (don't send null or empty string)

            // Check if this is an update (has ID) or new record
            if (initialData?.ID) {
                const recordId = initialData.ID;
                console.log('Updating exhibitor record:', recordId, 'with data:', apiData);
                // Use Exhibitor_List report name (matches what's used for fetching/deleting)
                const updateResult = await zohoApi.updateRecord('Exhibitor_List', recordId, apiData);
                console.log('Update result:', updateResult);
                
                // Verify the update was successful
                if (updateResult.code === 3000 || updateResult.code === 3001) {
                    toast.success('Exhibitor updated successfully');
                    // Wait a moment for Zoho to process the update before refreshing
                    await new Promise(resolve => setTimeout(resolve, 500));
                    onSuccess();
                    onClose();
                } else {
                    throw new Error('Update failed: ' + (updateResult.error || 'Unknown error'));
                }
            } else {
                console.log('Adding new exhibitor record with data:', apiData);
                // Try 'Exhibitor' first (common form name pattern, similar to 'Show_Details')
                // If that fails, try 'Exhibitor_List' as fallback
                try {
                    await zohoApi.addRecord('Exhibitor', apiData);
                } catch (firstError: any) {
                    console.log('Trying with form name "Exhibitor" failed, trying "Exhibitor_List"...', firstError);
                    await zohoApi.addRecord('Exhibitor_List', apiData);
                }
                toast.success('Exhibitor created successfully');
                onSuccess();
                onClose();
            }
        } catch (error: any) {
            // Extract detailed error message from Zoho API response
            let errorMessage = 'Failed to save record';
            if (error?.message) {
                errorMessage = error.message;
            } else if (error?.error) {
                errorMessage = typeof error.error === 'string' ? error.error : JSON.stringify(error.error);
            } else if (typeof error === 'string') {
                errorMessage = error;
            }
            
            toast.error(errorMessage);
            console.error('Exhibitor save error details:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? 'Edit Exhibitor' : 'Add New Exhibitor'}
        >
            <div className="p-6 space-y-6">
                <SoftInput
                    label="Company Name"
                    value={formData.Company}
                    onChange={(e) => setFormData({ ...formData, Company: e.target.value })}
                    placeholder="e.g. Acme Corp"
                    icon={<Building2 className="w-4 h-4" />}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 w-full">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Type</label>
                        <div className="relative group">
                            <select
                                value={formData.Company_Type}
                                onChange={(e) => setFormData({ ...formData, Company_Type: e.target.value })}
                                className="w-full bg-zinc-900/50 border border-zinc-800 text-white rounded-xl px-4 py-3.5 outline-none transition-all duration-200 appearance-none cursor-pointer focus:border-orange-500/50 focus:bg-zinc-900 focus:shadow-[0_0_20px_-5px_rgba(249,115,22,0.3)] hover:border-zinc-700"
                            >
                                <option value="" className="bg-zinc-900 text-zinc-600">Select Type</option>
                                <option value="LLP" className="bg-zinc-900 text-white">LLP (Limited Liability Partnership)</option>
                                <option value="LTD / LLC" className="bg-zinc-900 text-white">LTD / LLC (Limited / Limited Liability Company)</option>
                                <option value="Partnership" className="bg-zinc-900 text-white">Partnership</option>
                                <option value="PLC / INC" className="bg-zinc-900 text-white">PLC / INC (Public Limited Company / Incorporated)</option>
                                <option value="Sole Ownership" className="bg-zinc-900 text-white">Sole Ownership</option>
                                <option value="Other" className="bg-zinc-900 text-white">Other</option>
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 group-focus-within:text-orange-500 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                </svg>
                            </div>
                        </div>
                    </div>
                    <SoftInput label="Website" value={formData.Website} onChange={(e) => setFormData({ ...formData, Website: e.target.value })} placeholder="e.g. acme.com" icon={<Globe className="w-4 h-4" />} />

                    <SoftInput label="City" value={formData.City} onChange={(e) => setFormData({ ...formData, City: e.target.value })} placeholder="e.g. London" icon={<MapPin className="w-4 h-4" />} />
                    <div className="space-y-2 w-full">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Country</label>
                        <div className="relative group">
                            <div
                                onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                                className="w-full bg-zinc-900/50 border border-zinc-800 text-white rounded-xl px-4 py-3.5 outline-none transition-all duration-200 cursor-pointer focus-within:border-orange-500/50 focus-within:bg-zinc-900 focus-within:shadow-[0_0_20px_-5px_rgba(249,115,22,0.3)] hover:border-zinc-700 flex items-center justify-between min-h-[44px]"
                            >
                                <span className={formData.Country ? 'text-white' : 'text-zinc-600'}>
                                    {formData.Country || 'Select country...'}
                                </span>
                                {formData.Country && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setFormData({ ...formData, Country: '' });
                                        }}
                                        className="hover:bg-white/10 rounded-full p-1 transition-colors"
                                    >
                                        <X className="w-4 h-4 text-zinc-400" />
                                    </button>
                                )}
                            </div>
                            {isCountryDropdownOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => {
                                            setIsCountryDropdownOpen(false);
                                            setCountrySearch('');
                                        }}
                                    />
                                    <div className="absolute z-20 w-full mt-1 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                                        <div className="p-2 border-b border-white/5">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                                <input
                                                    type="text"
                                                    placeholder="Search countries..."
                                                    value={countrySearch}
                                                    onChange={(e) => setCountrySearch(e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="w-full bg-zinc-800 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all placeholder:text-zinc-600"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                            {filteredCountries.length === 0 ? (
                                                <div className="p-4 text-center text-sm text-zinc-500">
                                                    No countries found
                                                </div>
                                            ) : (
                                                <div className="p-2">
                                                    {filteredCountries.map((country) => (
                                                        <button
                                                            key={country}
                                                            type="button"
                                                            onClick={() => handleCountrySelect(country)}
                                                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                                                                formData.Country === country
                                                                    ? 'bg-orange-500/20 text-orange-400'
                                                                    : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                                                            }`}
                                                        >
                                                            {country}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <SoftInput label="World Area" value={formData.Area} onChange={(e) => setFormData({ ...formData, Area: e.target.value })} placeholder="e.g. Europe" />
                    <SoftInput label="FP Level" value={formData.FP_Level} onChange={(e) => setFormData({ ...formData, FP_Level: e.target.value })} placeholder="1, 2, 3, 4" icon={<Hash className="w-4 h-4" />} />
                </div>

                <SoftInput label="Contact Details" value={formData.Contact_Details} onChange={(e) => setFormData({ ...formData, Contact_Details: e.target.value })} placeholder="Phone or Email" icon={<Phone className="w-4 h-4" />} />
                <SoftInput label="LinkedIn" value={formData.Company_Linkedin} onChange={(e) => setFormData({ ...formData, Company_Linkedin: e.target.value })} placeholder="LinkedIn URL" icon={<Linkedin className="w-4 h-4" />} />
                <SoftInput label="Events" value={formData.Events} onChange={(e) => setFormData({ ...formData, Events: e.target.value })} placeholder="Associated Events" />

                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} isLoading={loading} leftIcon={<Save className="w-4 h-4" />}>
                        Save Exhibitor
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
