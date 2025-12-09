import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { getZohoConfig, saveZohoConfig, ZohoConfig } from '@/lib/zoho';
import { Globe, CheckCircle2, XCircle, RefreshCw, CloudLightning } from 'lucide-react';

interface ZohoSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DATA_CENTERS = [
    { label: 'United States (.com)', value: 'com', authUrl: 'https://accounts.zoho.com' },
    { label: 'Europe (.eu)', value: 'eu', authUrl: 'https://accounts.zoho.eu' },
    { label: 'India (.in)', value: 'in', authUrl: 'https://accounts.zoho.in' },
    { label: 'UAE (.ae)', value: 'ae', authUrl: 'https://accounts.zoho.ae' },
    { label: 'Australia (.com.au)', value: 'com.au', authUrl: 'https://accounts.zoho.com.au' },
    { label: 'China (.com.cn)', value: 'com.cn', authUrl: 'https://accounts.zoho.com.cn' },
];

export const ZohoSettingsModal: React.FC<ZohoSettingsModalProps> = ({ isOpen, onClose }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Use environment variables for config (shared across all users)
    const config: ZohoConfig = {
        clientId: process.env.NEXT_PUBLIC_ZOHO_CLIENT_ID || '',
        clientSecret: process.env.NEXT_PUBLIC_ZOHO_CLIENT_SECRET || '',
        redirectUri: process.env.NEXT_PUBLIC_ZOHO_REDIRECT_URI || 'https://marketing-tool-fp.vercel.app/zoho-callback',
        ownerName: process.env.NEXT_PUBLIC_ZOHO_OWNER_NAME || 'fairplatz2025',
        appLinkName: process.env.NEXT_PUBLIC_ZOHO_APP_LINK_NAME || 'exhibitorsdb',
        authToken: '',
        dc: 'ae'
    };

    useEffect(() => {
        if (isOpen) {
            // Check if we have a valid auth token
            const saved = getZohoConfig();
            setIsConnected(!!saved?.authToken);
        }
    }, [isOpen]);

    const handleReconnect = () => {
        setIsLoading(true);
        saveZohoConfig(config);
        const dc = DATA_CENTERS.find(d => d.value === config.dc) || DATA_CENTERS[0];

        const scopes = [
            'ZohoCreator.report.READ',
            'ZohoCreator.report.CREATE',
            'ZohoCreator.report.UPDATE',
            'ZohoCreator.report.DELETE',
            'ZohoCreator.form.CREATE',
            'WorkDrive.files.ALL',
            'WorkDrive.teamfolders.READ',
            'WorkDrive.team.READ',
            'ZohoSearch.securesearch.READ'
        ].join(',');

        const authUrl = `${dc.authUrl}/oauth/v2/auth?scope=${scopes}&client_id=${config.clientId}&response_type=code&access_type=offline&redirect_uri=${config.redirectUri}&prompt=consent`;
        window.location.href = authUrl;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Zoho Connection" maxWidth="max-w-md">
            <div className="p-6 space-y-6">
                {/* Connection Status */}
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isConnected ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-zinc-800 border border-white/10'}`}>
                        <CloudLightning className={`w-8 h-8 ${isConnected ? 'text-emerald-500' : 'text-zinc-500'}`} />
                    </div>

                    <div>
                        <div className="flex items-center justify-center gap-2 mb-2">
                            {isConnected ? (
                                <>
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    <span className="text-sm font-medium text-emerald-400">Connected</span>
                                </>
                            ) : (
                                <>
                                    <XCircle className="w-4 h-4 text-red-500" />
                                    <span className="text-sm font-medium text-red-400">Not Connected</span>
                                </>
                            )}
                        </div>
                        <p className="text-xs text-zinc-500 max-w-xs">
                            {isConnected
                                ? 'Your Zoho Creator integration is active. Click reconnect if you experience any issues.'
                                : 'Connect to Zoho Creator to access exhibitors, shows, and database records.'
                            }
                        </p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-white/5">
                    <Button variant="ghost" onClick={onClose} className="flex-1">
                        Close
                    </Button>
                    <Button
                        onClick={handleReconnect}
                        className="flex-1"
                        isLoading={isLoading}
                        leftIcon={isConnected ? <RefreshCw className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                    >
                        {isConnected ? 'Reconnect' : 'Connect'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

