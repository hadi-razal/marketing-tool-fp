import React, { useState, useEffect } from 'react';
import { Save, Globe, MapPin, Phone, Linkedin, Building2, Hash } from 'lucide-react';
import { SoftInput } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { zohoApi } from '@/lib/zoho';

interface ExhibitorFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any;
}

export const ExhibitorFormModal: React.FC<ExhibitorFormModalProps> = ({ isOpen, onClose, onSuccess, initialData }) => {
    const [formData, setFormData] = useState({
        Company: '',
        Type: '',
        Website: '',
        City: '',
        Country: '',
        World_Area: '',
        Contact_Details: '',
        Linkedin: '',
        FP_Level: '',
        Events: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData({
                Company: '',
                Type: '',
                Website: '',
                City: '',
                Country: '',
                World_Area: '',
                Contact_Details: '',
                Linkedin: '',
                FP_Level: '',
                Events: ''
            });
        }
    }, [initialData, isOpen]);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            if (initialData?.ID) {
                await zohoApi.updateRecord('Exhibitor_List', initialData.ID, formData);
            } else {
                await zohoApi.addRecord('Exhibitor', formData);
            }
            onSuccess();
            onClose();
        } catch (error) {
            alert('Failed to save record');
            console.error(error);
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
                    <SoftInput label="Type" value={formData.Type} onChange={(e) => setFormData({ ...formData, Type: e.target.value })} placeholder="e.g. Technology" />
                    <SoftInput label="Website" value={formData.Website} onChange={(e) => setFormData({ ...formData, Website: e.target.value })} placeholder="e.g. acme.com" icon={<Globe className="w-4 h-4" />} />

                    <SoftInput label="City" value={formData.City} onChange={(e) => setFormData({ ...formData, City: e.target.value })} placeholder="e.g. London" icon={<MapPin className="w-4 h-4" />} />
                    <SoftInput label="Country" value={formData.Country} onChange={(e) => setFormData({ ...formData, Country: e.target.value })} placeholder="e.g. UK" />

                    <SoftInput label="World Area" value={formData.World_Area} onChange={(e) => setFormData({ ...formData, World_Area: e.target.value })} placeholder="e.g. Europe" />
                    <SoftInput label="FP Level" value={formData.FP_Level} onChange={(e) => setFormData({ ...formData, FP_Level: e.target.value })} placeholder="1, 2, 3, 4" icon={<Hash className="w-4 h-4" />} />
                </div>

                <SoftInput label="Contact Details" value={formData.Contact_Details} onChange={(e) => setFormData({ ...formData, Contact_Details: e.target.value })} placeholder="Phone or Email" icon={<Phone className="w-4 h-4" />} />
                <SoftInput label="LinkedIn" value={formData.Linkedin} onChange={(e) => setFormData({ ...formData, Linkedin: e.target.value })} placeholder="LinkedIn URL" icon={<Linkedin className="w-4 h-4" />} />
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
