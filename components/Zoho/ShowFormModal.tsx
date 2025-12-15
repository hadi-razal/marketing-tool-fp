import React, { useState, useEffect } from 'react';
import { Save, Calendar, Globe, MapPin, Layers, Hash } from 'lucide-react';
import { SoftInput } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { zohoApi } from '@/lib/zoho';
import { toast } from 'sonner';
import { INDUSTRIES } from '@/lib/industries';

interface ShowFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any;
}

export const ShowFormModal: React.FC<ShowFormModalProps> = ({ isOpen, onClose, onSuccess, initialData }) => {
    const [formData, setFormData] = useState({
        Event_Name: '',
        Event_Type: '',
        Starting_Date: '',
        Industry: '',
        Level: '',
        World_Area: '',
        Country: '',
        City: '',
        Frequency: ''
    });
    const [loading, setLoading] = useState(false);

    // Helper to extract value from Zoho field (handles objects, arrays, etc.)
    const extractValue = (val: any): string => {
        if (!val) return '';
        if (typeof val === 'string') return val;
        if (typeof val === 'object') {
            if ('url' in val) return val.url || '';
            if ('name' in val) return val.name || '';
            if (Array.isArray(val)) return val[0] || '';
            return val.toString() || '';
        }
        return String(val);
    };

    // Helper to format date for input field (YYYY-MM-DD)
    const formatDateForInput = (dateStr: string): string => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '';
            // Format as YYYY-MM-DD
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch {
            return '';
        }
    };

    // Helper to format date for Zoho API
    // Zoho Creator expects dates in dd-MMM-yyyy format (e.g., "01-Jan-2024")
    // Based on the field properties showing format "dd-MMM-yyyy"
    const formatDateForZoho = (dateStr: string): string | undefined => {
        if (!dateStr || dateStr.trim() === '') return undefined;
        
        try {
            let date: Date;
            
            // If already in YYYY-MM-DD format (from date input), parse it
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                const [year, month, day] = dateStr.split('-').map(Number);
                // Create date using local timezone to avoid shifts
                date = new Date(year, month - 1, day);
            } else {
                // Try to parse other formats
                date = new Date(dateStr);
            }
            
            if (isNaN(date.getTime())) return undefined;
            
            // Format as dd-MMM-yyyy (e.g., "01-Jan-2024")
            const day = String(date.getDate()).padStart(2, '0');
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = months[date.getMonth()];
            const year = date.getFullYear();
            
            return `${day}-${month}-${year}`;
        } catch {
            return undefined;
        }
    };

    useEffect(() => {
        // Reset form when modal opens/closes or initialData changes
        if (!isOpen) {
            // Reset form when modal closes
            setFormData({
                Event_Name: '',
                Event_Type: '',
                Starting_Date: '',
                Industry: '',
                Level: '',
                World_Area: '',
                Country: '',
                City: '',
                Frequency: ''
            });
            return;
        }
        
        // When modal opens, initialize form with initialData immediately
        // No delay needed - React will handle the state update properly
        if (initialData) {
            // Map Zoho fields to form fields, handling different field name variations
            setFormData({
                Event_Name: extractValue(initialData.Event_Name || initialData.Event || initialData.Name || ''),
                Event_Type: extractValue(initialData.Event_Type || initialData.Type || ''),
                Starting_Date: formatDateForInput(initialData.Starting_Date || initialData.Date || ''),
                Industry: extractValue(initialData.Industry || ''),
                Level: extractValue(initialData.Level || ''),
                World_Area: extractValue(initialData.World_Area || initialData.Area || ''),
                Country: extractValue(initialData.Country || ''),
                City: extractValue(initialData.City || ''),
                Frequency: extractValue(initialData.Frequency || '')
            });
        } else {
            setFormData({
                Event_Name: '',
                Event_Type: '',
                Starting_Date: '',
                Industry: '',
                Level: '',
                World_Area: '',
                Country: '',
                City: '',
                Frequency: ''
            });
        }
    }, [initialData, isOpen]);

    const handleSubmit = async () => {
        // Prevent submission if we're in edit mode but don't have initialData or ID
        if (isOpen && initialData && !initialData.ID) {
            console.error('Edit mode but no ID found:', initialData);
            toast.error('Cannot update: Record ID is missing');
            return;
        }
        
        setLoading(true);
        try {
            // Prepare data for submission - ensure all fields are strings or empty strings
            const submitData: any = {
                Event_Name: formData.Event_Name || '',
                Event_Type: formData.Event_Type || '',
                Industry: formData.Industry || '',
                Level: formData.Level || '',
                World_Area: formData.World_Area || '',
                Country: formData.Country || '',
                City: formData.City || '',
                Frequency: formData.Frequency || ''
            };

            // Format date for Zoho (dd-MMM-yyyy format)
            const formattedDate = formatDateForZoho(formData.Starting_Date);
            if (formattedDate) {
                submitData.Starting_Date = formattedDate;
            }

            // Remove empty fields to avoid sending unnecessary data
            Object.keys(submitData).forEach(key => {
                if (submitData[key] === '') {
                    delete submitData[key];
                }
            });

            // Check if this is an update (has ID) or new record
            if (initialData?.ID) {
                const recordId = initialData.ID;
                // Use Show_List report name (matches what's used for fetching/deleting)
                console.log('Updating record:', recordId, 'with data:', submitData);
                const updateResult = await zohoApi.updateRecord('Show_List', recordId, submitData);
                console.log('Update result:', updateResult);
                
                // Verify the update was successful
                if (updateResult.code === 3000 || updateResult.code === 3001) {
                    toast.success('Show updated successfully');
                    // Wait a moment for Zoho to process the update before refreshing
                    await new Promise(resolve => setTimeout(resolve, 500));
                    onSuccess();
                    onClose();
                } else {
                    throw new Error('Update failed: ' + (updateResult.error || 'Unknown error'));
                }
            } else {
                console.log('Adding new record with data:', submitData);
                await zohoApi.addRecord('Show_Details', submitData);
                toast.success('Show created successfully');
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
            console.error('Show save error details:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? 'Edit Show' : 'Add New Show'}
        >
            <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <SoftInput label="Event Name" value={formData.Event_Name} onChange={(e) => setFormData({ ...formData, Event_Name: e.target.value })} placeholder="e.g. Gitex Global" icon={<Calendar className="w-4 h-4" />} />
                    <SoftInput label="Event Type" value={formData.Event_Type} onChange={(e) => setFormData({ ...formData, Event_Type: e.target.value })} placeholder="e.g. Exhibition" icon={<Layers className="w-4 h-4" />} />

                    <SoftInput label="Starting Date" type="date" value={formData.Starting_Date} onChange={(e) => setFormData({ ...formData, Starting_Date: e.target.value })} />
                    <div className="space-y-2 w-full">
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">
                            Industry
                        </label>
                        <div className="relative group">
                            <select
                                value={formData.Industry}
                                onChange={(e) => setFormData({ ...formData, Industry: e.target.value })}
                                className="w-full bg-zinc-900/50 border border-zinc-800 text-white rounded-xl px-4 py-3.5 outline-none transition-all duration-200 appearance-none cursor-pointer focus:border-orange-500/50 focus:bg-zinc-900 focus:shadow-[0_0_20px_-5px_rgba(249,115,22,0.3)] hover:border-zinc-700"
                            >
                                <option value="" className="bg-zinc-900 text-zinc-600">Select Industry</option>
                                {INDUSTRIES.map((industry) => (
                                    <option key={industry} value={industry} className="bg-zinc-900 text-white">
                                        {industry}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 group-focus-within:text-orange-500 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                </svg>
                            </div>
                        </div>
                    </div>

                    <SoftInput label="Level" value={formData.Level} onChange={(e) => setFormData({ ...formData, Level: e.target.value })} placeholder="e.g. Tier 1" />
                    <SoftInput label="World Area" value={formData.World_Area} onChange={(e) => setFormData({ ...formData, World_Area: e.target.value })} placeholder="e.g. MENA" />

                    <SoftInput label="Country" value={formData.Country} onChange={(e) => setFormData({ ...formData, Country: e.target.value })} placeholder="e.g. UAE" icon={<Globe className="w-4 h-4" />} />
                    <SoftInput label="City" value={formData.City} onChange={(e) => setFormData({ ...formData, City: e.target.value })} placeholder="e.g. Dubai" icon={<MapPin className="w-4 h-4" />} />
                </div>

                <div className="space-y-3">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Frequency</label>
                    <div className="flex gap-4">
                        {['Annual', '2Y', '3Y', '4Y'].map((freq) => (
                            <label key={freq} className="flex items-center gap-2 cursor-pointer group">
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${formData.Frequency === freq ? 'border-orange-500 bg-orange-500/20' : 'border-zinc-700 group-hover:border-zinc-500'}`}>
                                    {formData.Frequency === freq && <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />}
                                </div>
                                <input type="radio" name="frequency" className="hidden" checked={formData.Frequency === freq} onChange={() => setFormData({ ...formData, Frequency: freq })} />
                                <span className={`text-sm font-medium ${formData.Frequency === freq ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>{freq}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} isLoading={loading} leftIcon={<Save className="w-4 h-4" />}>
                        Save Show
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
