import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from './Button';

interface CardProps extends HTMLMotionProps<"div"> {
    children: React.ReactNode;
    hoverEffect?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, children, hoverEffect = false, ...props }, ref) => {
        return (
            <motion.div
                ref={ref}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={hoverEffect ? { y: -5, transition: { duration: 0.2 } } : undefined}
                className={cn(
                    "bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-xl shadow-black/20",
                    hoverEffect && "hover:bg-zinc-900/60 hover:border-white/10 hover:shadow-2xl hover:shadow-black/40 cursor-pointer transition-colors",
                    className
                )}
                {...props}
            >
                {children}
            </motion.div>
        );
    }
);
Card.displayName = "Card";
