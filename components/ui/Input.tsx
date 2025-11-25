import React from 'react';
import { cn } from './Button';

interface SoftInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
}

export const SoftInput = React.forwardRef<HTMLInputElement, SoftInputProps>(
    ({ className, label, error, icon, ...props }, ref) => {
        return (
            <div className="space-y-2 w-full">
                {label && (
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">
                        {label}
                    </label>
                )}
                <div className="relative group">
                    {icon && (
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-orange-500 transition-colors">
                            {icon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        className={cn(
                            "w-full bg-zinc-900/50 border border-zinc-800 text-white rounded-xl px-4 py-3.5 outline-none transition-all duration-200 placeholder:text-zinc-600",
                            "focus:border-orange-500/50 focus:bg-zinc-900 focus:shadow-[0_0_20px_-5px_rgba(249,115,22,0.3)]",
                            "hover:border-zinc-700",
                            icon && "pl-11",
                            error && "border-red-500/50 focus:border-red-500",
                            className
                        )}
                        {...props}
                    />
                </div>
                {error && <p className="text-xs text-red-500 ml-1">{error}</p>}
            </div>
        );
    }
);
SoftInput.displayName = "SoftInput";
