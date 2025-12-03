import React, { useState, useEffect } from 'react';
import { Save, Calendar, Globe, MapPin, Layers, Hash } from 'lucide-react';
import { SoftInput } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { zohoApi } from '@/lib/zoho';

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

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
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
        setLoading(true);
        try {
            if (initialData?.ID) {
                await zohoApi.updateRecord('Event_and_Exhibitor_Admin_Only_Report', initialData.ID, formData);
            } else {
                await zohoApi.addRecord('Show_Details', formData);
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
            title={initialData ? 'Edit Show' : 'Add New Show'}
        >
            <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <SoftInput label="Event Name" value={formData.Event_Name} onChange={(e) => setFormData({ ...formData, Event_Name: e.target.value })} placeholder="e.g. Gitex Global" icon={<Calendar className="w-4 h-4" />} />
                    <SoftInput label="Event Type" value={formData.Event_Type} onChange={(e) => setFormData({ ...formData, Event_Type: e.target.value })} placeholder="e.g. Exhibition" icon={<Layers className="w-4 h-4" />} />

                    <SoftInput label="Starting Date" type="date" value={formData.Starting_Date} onChange={(e) => setFormData({ ...formData, Starting_Date: e.target.value })} />
                    <SoftInput label="Industry" value={formData.Industry} onChange={(e) => setFormData({ ...formData, Industry: e.target.value })} placeholder="e.g. Technology" />

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
