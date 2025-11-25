import React, { useState, useEffect } from 'react';
import { Save, Database, Hash, Calendar } from 'lucide-react';
import { SoftInput } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { zohoApi } from '@/lib/zoho';

interface DatabaseFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any;
}

export const DatabaseFormModal: React.FC<DatabaseFormModalProps> = ({ isOpen, onClose, onSuccess, initialData }) => {
    const [formData, setFormData] = useState({
        Show: '',
        Booth_No: '',
        Booth_Sqm: '',
        Attended_Year: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData({
                Show: '',
                Booth_No: '',
                Booth_Sqm: '',
                Attended_Year: ''
            });
        }
    }, [initialData, isOpen]);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            if (initialData?.ID) {
                await zohoApi.updateRecord('Database_Report', initialData.ID, formData);
            } else {
                await zohoApi.addRecord('Database_Form', formData);
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
            title={initialData ? 'Edit Record' : 'Add New Record'}
            maxWidth="max-w-md"
        >
            <div className="p-6 space-y-6">
                <SoftInput label="Show Name" value={formData.Show} onChange={(e) => setFormData({ ...formData, Show: e.target.value })} placeholder="e.g. Gitex" icon={<Database className="w-4 h-4" />} />
                <div className="grid grid-cols-2 gap-6">
                    <SoftInput label="Booth No" value={formData.Booth_No} onChange={(e) => setFormData({ ...formData, Booth_No: e.target.value })} placeholder="e.g. A-123" icon={<Hash className="w-4 h-4" />} />
                    <SoftInput label="Booth Sqm" value={formData.Booth_Sqm} onChange={(e) => setFormData({ ...formData, Booth_Sqm: e.target.value })} placeholder="e.g. 24" />
                </div>
                <SoftInput label="Attended Year" value={formData.Attended_Year} onChange={(e) => setFormData({ ...formData, Attended_Year: e.target.value })} placeholder="e.g. 2024" icon={<Calendar className="w-4 h-4" />} />

                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} isLoading={loading} leftIcon={<Save className="w-4 h-4" />}>
                        Save Record
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
