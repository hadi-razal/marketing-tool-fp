import React, { useState, useEffect } from 'react';
import { SoftInput } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { getZohoConfig, saveZohoConfig, ZohoConfig } from '@/lib/zoho';
import { Globe, ExternalLink, Server, Copy, Check, AlertTriangle, Key } from 'lucide-react';

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
    const [config, setConfig] = useState<ZohoConfig>({
        clientId: process.env.NEXT_PUBLIC_ZOHO_CLIENT_ID || '',
        clientSecret: '',
        redirectUri: 'http://localhost:3000/zoho-callback',
        ownerName: 'fairplatz2025',
        appLinkName: 'exhibitorsdb',
        authToken: '',
        dc: 'com'
    });
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const saved = getZohoConfig();
            if (saved) {
                setConfig(prev => ({ ...prev, ...saved, dc: saved.dc || 'com' }));
            }
        }
    }, [isOpen]);

    const handleAuthorize = () => {
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

    const copyToClipboard = () => {
        navigator.clipboard.writeText(config.redirectUri || '');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Zoho Connection Settings" maxWidth="max-w-xl">
            <div className="p-6 space-y-6">
                {/* App Details */}
                <div className="grid grid-cols-2 gap-4">
                    <SoftInput
                        label="Owner Name"
                        value={config.ownerName}
                        onChange={(e) => setConfig({ ...config, ownerName: e.target.value })}
                        placeholder="fairplatz2025"
                    />
                    <SoftInput
                        label="App Link Name"
                        value={config.appLinkName}
                        onChange={(e) => setConfig({ ...config, appLinkName: e.target.value })}
                        placeholder="exhibitorsdb"
                    />
                </div>

                {/* OAuth Config */}
                <div className="p-5 bg-zinc-950/50 rounded-2xl border border-zinc-800 space-y-5">
                    <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                        <Key className="w-4 h-4" /> OAuth Configuration
                    </h4>

                    {/* Region Selector */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Data Center Region</label>
                        <div className="relative">
                            <select
                                value={config.dc}
                                onChange={(e) => setConfig({ ...config, dc: e.target.value })}
                                className="w-full bg-zinc-900 border border-zinc-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-orange-500/50 appearance-none font-medium text-sm"
                            >
                                {DATA_CENTERS.map(dc => (
                                    <option key={dc.value} value={dc.value}>{dc.label}</option>
                                ))}
                            </select>
                            <Server className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                        </div>
                    </div>

                    <SoftInput
                        label="Client ID"
                        value={config.clientId}
                        onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                        placeholder="1000.xxxxx"
                    />
                    <SoftInput
                        label="Client Secret"
                        value={config.clientSecret}
                        onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })}
                        placeholder="xxxxx"
                        type="password"
                    />

                    {/* Redirect URI with Copy */}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Redirect URI</label>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <input
                                    value={config.redirectUri}
                                    onChange={(e) => setConfig({ ...config, redirectUri: e.target.value })}
                                    className="w-full bg-zinc-900 border border-zinc-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-orange-500/50 text-sm font-mono"
                                    placeholder="http://localhost:3000/zoho-callback"
                                />
                            </div>
                            <button
                                onClick={copyToClipboard}
                                className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 rounded-xl transition-colors flex items-center justify-center border border-zinc-700"
                                title="Copy to clipboard"
                            >
                                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Warning Box */}
                    <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl flex gap-3 items-start">
                        <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-orange-200">Action Required</p>
                            <p className="text-xs text-orange-200/70 leading-relaxed">
                                You MUST add <span className="font-mono bg-black/20 px-1 rounded text-orange-100">{config.redirectUri}</span> to your
                                <a href="https://api-console.zoho.com/" target="_blank" rel="noreferrer" className="text-white underline ml-1 hover:text-blue-400">Zoho API Console</a>
                                Authorized Redirect URIs list.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-white/5">
                    <Button variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
                    <Button onClick={handleAuthorize} className="flex-1" leftIcon={<Globe className="w-4 h-4" />}>
                        Authorize / Reconnect
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
