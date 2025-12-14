import React, { useState, useEffect } from 'react';
import { Save, Globe, MapPin, Phone, Linkedin, Building2, Hash } from 'lucide-react';
import { SoftInput } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { zohoApi } from '@/lib/zoho';
import { toast } from 'sonner';

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
                    <SoftInput label="Type" value={formData.Company_Type} onChange={(e) => setFormData({ ...formData, Company_Type: e.target.value })} placeholder="e.g. Technology" />
                    <SoftInput label="Website" value={formData.Website} onChange={(e) => setFormData({ ...formData, Website: e.target.value })} placeholder="e.g. acme.com" icon={<Globe className="w-4 h-4" />} />

                    <SoftInput label="City" value={formData.City} onChange={(e) => setFormData({ ...formData, City: e.target.value })} placeholder="e.g. London" icon={<MapPin className="w-4 h-4" />} />
                    <SoftInput label="Country" value={formData.Country} onChange={(e) => setFormData({ ...formData, Country: e.target.value })} placeholder="e.g. UK" />

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
