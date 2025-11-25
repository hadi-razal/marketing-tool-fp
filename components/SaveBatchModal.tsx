import React, { useState, useEffect } from 'react';
import { SoftInput } from './ui/Input';

interface SaveBatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (name: string) => void;
    defaultName: string;
}

export const SaveBatchModal: React.FC<SaveBatchModalProps> = ({ isOpen, onClose, onConfirm, defaultName }) => {
    const [name, setName] = useState(defaultName);

    useEffect(() => { setName(defaultName) }, [defaultName, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <h3 className="text-xl font-bold text-white mb-2">Name this Collection</h3>
                <p className="text-zinc-500 text-sm mb-6">Give your search results a name to organize them in the database.</p>

                <SoftInput
                    value={name}
                    onChange={(e: any) => setName(e.target.value)}
                    placeholder="e.g. Q4 Tech Leads"
                    autoFocus
                />

                <div className="flex gap-3 mt-8">
                    <button onClick={onClose} className="flex-1 py-3 rounded-xl font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all">Cancel</button>
                    <button onClick={() => onConfirm(name)} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-orange-500/20 transition-all">
                        Save Batch
                    </button>
                </div>
            </div>
        </div>
    );
}
