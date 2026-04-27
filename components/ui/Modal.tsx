import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from './Button';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, className, maxWidth = "max-w-2xl" }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-100 bg-zinc-950/45 backdrop-blur-sm"
                    />
                    <div className="fixed inset-0 z-101 flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: "spring", duration: 0.5 }}
                            className={cn(
                                "w-full bg-white border border-zinc-200 rounded-3xl shadow-2xl shadow-zinc-950/20 overflow-hidden pointer-events-auto flex flex-col max-h-[90vh]",
                                maxWidth,
                                className
                            )}
                        >
                            <div className="flex items-center justify-between p-6 border-b border-zinc-200 bg-zinc-50">
                                <div className="text-xl font-bold text-zinc-950">{title}</div>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-full hover:bg-orange-50 text-zinc-500 hover:text-zinc-950 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="overflow-y-auto custom-scrollbar">
                                {children}
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};
