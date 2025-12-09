'use client';

import { Toaster } from 'sonner';

export function ToastProvider() {
    return (
        <Toaster
            position="top-right"
            theme="dark"
            richColors
            closeButton
            toastOptions={{
                style: {
                    background: '#09090b',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                },
                className: 'font-sans',
            }}
        />
    );
}
