import React, { useState, useEffect, useMemo } from 'react';
import { Save, Globe, MapPin, Phone, Linkedin, Building2, Hash, X, Search } from 'lucide-react';
import { SoftInput } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { zohoApi } from '@/lib/zoho';
import { toast } from 'sonner';

// Comprehensive country list with UAE as "UAE" and others with full names
const COUNTRIES = [
    'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria',
    'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan',
    'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon',
    'Canada', 'Cape Verde', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica',
    'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'East Timor', 'Ecuador',
    'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France',
    'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau',
    'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland',
    'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Korea, North', 'Korea, South',
    'Kosovo', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein',
    'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania',
    'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar',
    'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Macedonia', 'Norway',
    'Oman', 'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland',
    'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino',
    'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands',
    'Somalia', 'South Africa', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria',
    'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan',
    'Tuvalu', 'UAE', 'Uganda', 'Ukraine', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City',
    'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
].sort();

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

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // Map form data to API format - convert Area to World_Area
            const { Area, ...restData } = formData;
            const apiData = {
                ...restData,
                World_Area: Area || ''
            };

            if (initialData?.ID) {
                await zohoApi.updateRecord('Exhibitor_List', initialData.ID, apiData);
            } else {
                // Try 'Exhibitor' first (common form name pattern, similar to 'Show_Details')
                // If that fails, try 'Exhibitor_List' as fallback
                try {
                    await zohoApi.addRecord('Exhibitor', apiData);
                } catch (firstError: any) {
                    console.log('Trying with form name "Exhibitor" failed, trying "Exhibitor_List"...', firstError);
                    await zohoApi.addRecord('Exhibitor_List', apiData);
                }
            }
            onSuccess();
            toast.success('Exhibitor saved successfully');
            onClose();
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
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Type</label>
                        <div className="relative">
                            <select
                                value={formData.Company_Type}
                                onChange={(e) => setFormData({ ...formData, Company_Type: e.target.value })}
                                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all hover:bg-white/5 appearance-none cursor-pointer"
                            >
                                <option value="" className="bg-zinc-900 text-zinc-500">Select Type</option>
                                <option value="LLP" className="bg-zinc-900">LLP (Limited Liability Partnership)</option>
                                <option value="LTD / LLC" className="bg-zinc-900">LTD / LLC (Limited / Limited Liability Company)</option>
                                <option value="Partnership" className="bg-zinc-900">Partnership</option>
                                <option value="PLC / INC" className="bg-zinc-900">PLC / INC (Public Limited Company / Incorporated)</option>
                                <option value="Sole Ownership" className="bg-zinc-900">Sole Ownership</option>
                                <option value="Other" className="bg-zinc-900">Other</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                </svg>
                            </div>
                        </div>
                    </div>
                    <SoftInput label="Website" value={formData.Website} onChange={(e) => setFormData({ ...formData, Website: e.target.value })} placeholder="e.g. acme.com" icon={<Globe className="w-4 h-4" />} />

                    <SoftInput label="City" value={formData.City} onChange={(e) => setFormData({ ...formData, City: e.target.value })} placeholder="e.g. London" icon={<MapPin className="w-4 h-4" />} />
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Country</label>
                        <div className="relative">
                            <div
                                onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all hover:bg-white/5 cursor-pointer min-h-[44px] flex items-center justify-between"
                            >
                                <span className={formData.Country ? 'text-white' : 'text-zinc-500'}>
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
