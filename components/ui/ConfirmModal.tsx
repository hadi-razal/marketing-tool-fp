import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle } from 'lucide-react';
import { cn } from './Button';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDestructive = false
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-110 bg-zinc-950/45 backdrop-blur-sm"
                    />
                    <div className="fixed inset-0 z-111 flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: "spring", duration: 0.5 }}
                            className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl shadow-2xl shadow-zinc-950/20 overflow-hidden pointer-events-auto flex flex-col"
                        >
                            <div className="p-6">
                                <div className="flex items-start gap-4">
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0 border",
                                        isDestructive
                                            ? "bg-red-50 border-red-200 text-red-600"
                                            : "bg-orange-50 border-orange-200 text-orange-600"
                                    )}>
                                        <AlertTriangle className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-zinc-950 mb-2 leading-none">{title}</h3>
                                        <p className="text-sm text-zinc-600 leading-relaxed">{message}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 p-4 bg-zinc-50 border-t border-zinc-200">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-600 hover:text-zinc-950 hover:bg-orange-50 transition-colors"
                                >
                                    {cancelText}
                                </button>
                                <button
                                    onClick={() => {
                                        onConfirm();
                                        onClose();
                                    }}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-sm font-medium text-white shadow-lg transition-all active:scale-95",
                                        isDestructive
                                            ? "bg-linear-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 shadow-red-500/20"
                                            : "bg-linear-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 shadow-orange-500/20"
                                    )}
                                >
                                    {confirmText}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};
