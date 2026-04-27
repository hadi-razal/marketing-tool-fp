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
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">
                        {label}
                    </label>
                )}
                <div className="relative group">
                    {icon && (
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-orange-500 transition-colors">
                            {icon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        className={cn(
                            "w-full bg-white border border-zinc-200 text-zinc-950 rounded-xl px-4 py-3.5 outline-none transition-all duration-200 placeholder:text-zinc-400 shadow-sm",
                            "focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100",
                            "hover:border-zinc-300",
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
