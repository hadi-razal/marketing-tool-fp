'use client';
import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getZohoConfig, saveZohoConfig } from '@/lib/zoho';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const getAuthUrl = (dc: string = 'com') => {
    const map: Record<string, string> = {
        'com': 'https://accounts.zoho.com',
        'eu': 'https://accounts.zoho.eu',
        'in': 'https://accounts.zoho.in',
        'com.au': 'https://accounts.zoho.com.au',
        'com.cn': 'https://accounts.zoho.com.cn',
    };
    return map[dc] || map['com'];
};

function ZohoCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const [status, setStatus] = useState('Processing authorization...');
    const [isError, setIsError] = useState(false);

    useEffect(() => {
        const exchangeCode = async () => {
            if (error) {
                setStatus(`Authorization Failed: ${error}`);
                setIsError(true);
                return;
            }

            if (!code) return;

            const config = getZohoConfig();
            if (!config || !config.clientId || !config.clientSecret || !config.redirectUri) {
                setStatus('Configuration missing. Please restart the process.');
                setIsError(true);
                return;
            }

            try {
                const res = await fetch('/api/zoho/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        code,
                        clientId: config.clientId,
                        clientSecret: config.clientSecret,
                        redirectUri: config.redirectUri,
                        dc: config.dc,
                        grantType: 'authorization_code'
                    })
                });
                const data = await res.json();

                if (data.error) {
                    throw new Error(data.error);
                }

                saveZohoConfig({
                    ...config,
                    accessToken: data.access_token,
                    refreshToken: data.refresh_token || config.refreshToken,
                });

                setStatus('Success! Redirecting...');
                setTimeout(() => router.push('/'), 1500);
            } catch (err: any) {
                setStatus(`Token Exchange Failed: ${err.message}`);
                setIsError(true);
            }
        };

        exchangeCode();
    }, [code, error, router]);

    return (
        <div className="h-screen bg-black flex items-center justify-center text-white">
            <div className="text-center space-y-4 p-8 bg-zinc-900 rounded-3xl border border-zinc-800 max-w-md w-full">
                {isError ? (
                    <XCircle className="w-16 h-16 text-red-500 mx-auto" />
                ) : (
                    status === 'Success! Redirecting...' ? (
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                    ) : (
                        <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto" />
                    )
                )}
                <h1 className="text-2xl font-bold">{isError ? 'Connection Failed' : 'Connecting to Zoho'}</h1>
                <p className="text-zinc-400">{status}</p>

                {isError && (
                    <button onClick={() => router.push('/')} className="mt-4 px-6 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold transition-colors">
                        Return to App
                    </button>
                )}
            </div>
        </div>
    );
}

export default function ZohoCallbackPage() {
    return (
        <Suspense fallback={<div className="h-screen bg-black flex items-center justify-center text-white"><Loader2 className="w-16 h-16 text-blue-500 animate-spin" /></div>}>
            <ZohoCallbackContent />
        </Suspense>
    );
}
