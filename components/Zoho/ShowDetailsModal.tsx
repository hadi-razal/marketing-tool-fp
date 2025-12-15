import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Globe, MapPin, Calendar, Hash, ExternalLink, Trash2, Edit2, Link as LinkIcon, FileText, Layers, Users, Clock, User, Info, X, Building2, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { zohoApi } from '@/lib/zoho';
import { Skeleton } from '../ui/Skeleton';

interface ShowDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: any;
    onEdit: (item: any) => void;
    onDelete: (id: string) => void;
}

const Section = ({ title, children, delay = 0 }: { title: string, children: React.ReactNode, delay?: number }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.4 }}
        className="space-y-4"
    >
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500/50"></span>
            {title}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {children}
        </div>
    </motion.div>
);

const DetailItem = ({ label, value, icon: Icon, isLink = false, fullWidth = false, onDownload }: any) => {
    if (!value) return null;

    let displayValue = value;
    let href = value;
    let isFileUrl = false;

    // Handle Zoho object structure (e.g., { url: "..." })
    if (typeof value === 'object' && value !== null) {
        if ('url' in value) {
            displayValue = value.url;
            href = value.url;
        } else {
            // Fallback for other objects to avoid crash
            return null;
        }
    }

    // Check if it's a file download URL
    if (typeof displayValue === 'string' && displayValue.includes('/download?filepath=')) {
        isFileUrl = true;
    }

    const handleDownload = async () => {
        if (onDownload && value) {
            await onDownload(value);
        }
    };

    return (
        <div className={`group relative overflow-hidden bg-white/5 hover:bg-white/10 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-all duration-300 ${fullWidth ? 'md:col-span-2 lg:col-span-3' : ''}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2 text-zinc-500 text-xs font-bold uppercase tracking-wider">
                    {Icon && <Icon className="w-3.5 h-3.5 text-zinc-600 group-hover:text-orange-500/70 transition-colors" />}
                    {label}
                </div>
                <div className="text-zinc-100 font-medium break-words text-sm leading-relaxed flex items-center gap-2">
                    {isLink ? (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 hover:underline flex items-center gap-1.5 transition-colors">
                            {displayValue} <ExternalLink className="w-3 h-3 opacity-70" />
                        </a>
                    ) : isFileUrl ? (
                        <>
                            <span className="text-zinc-400 text-xs truncate flex-1">{displayValue}</span>
                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 hover:text-orange-300 rounded-lg transition-colors text-xs font-medium border border-orange-500/30"
                            >
                                <Download className="w-3.5 h-3.5" />
                                Download
                            </button>
                        </>
                    ) : (
                        displayValue
                    )}
                </div>
            </div>
        </div>
    );
};

export const ShowDetailsModal: React.FC<ShowDetailsModalProps> = ({ isOpen, onClose, data, onEdit, onDelete }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'exhibitors'>('overview');
    const [exhibitors, setExhibitors] = useState<any[]>([]);
    const [loadingExhibitors, setLoadingExhibitors] = useState(false);
    const [isNoteExpanded, setIsNoteExpanded] = useState(false);

    // Log show details when modal opens or data changes
    useEffect(() => {
        if (isOpen && data) {
            console.log('Show details from Zoho (modal):', data);
        }
    }, [isOpen, data]);

    // Reset tab when data changes
    useEffect(() => {
        if (isOpen) {
            console.log('Resetting tab to overview, clearing exhibitors');
            setActiveTab('overview');
            setExhibitors([]);
            setIsNoteExpanded(false);
        }
    }, [isOpen, data?.ID]);

    // Debug: Log activeTab changes
    useEffect(() => {
        console.log('Active Tab changed to:', activeTab);
    }, [activeTab]);

    // Fetch exhibitors when tab changes
    useEffect(() => {
        if (activeTab === 'exhibitors' && exhibitors.length === 0 && data) {
            const fetchExhibitors = async () => {
                setLoadingExhibitors(true);
                try {
                    console.log('=== FETCHING EXHIBITORS ===');
                    console.log('Show Data:', data);
                    console.log('Show ID:', data.ID);
                    
                    if (!data.ID) {
                        console.warn('No show ID available');
                        setExhibitors([]);
                        return;
                    }

                    // Try different criteria formats - Show.ID is NUMBER type, so don't use quotes
                    const criteriaOptions = [
                        `(Show.ID == ${data.ID})`,           // Number comparison without quotes
                        `(Show.ID == "${data.ID}")`,         // With quotes (might work)
                        `(Show == ${data.ID})`,              // Direct Show comparison
                        `(Show == "${data.ID}")`,            // Direct Show with quotes
                    ];
                    
                    let allExhibitors: any[] = [];
                    let criteria = '';
                    let foundWorkingCriteria = false;
                    
                    // Try each criteria format
                    for (const testCriteria of criteriaOptions) {
                        try {
                            console.log('Trying criteria:', testCriteria);
                            const testRes = await zohoApi.getRecords('Event_and_Exhibitor_Admin_Only_Report', testCriteria, 0, 10);
                            
                            console.log('Test Response:', testRes);
                            console.log('Response Code:', testRes.code);
                            
                            if (testRes.code === 3000) {
                                criteria = testCriteria;
                                foundWorkingCriteria = true;
                                console.log('✅ Working criteria found:', criteria);
                                break;
                            } else if (testRes.code === 3001) {
                                // No records but criteria is valid
                                criteria = testCriteria;
                                foundWorkingCriteria = true;
                                console.log('✅ Criteria is valid (no records found):', criteria);
                                break;
                            }
                        } catch (err) {
                            console.log('Criteria failed:', testCriteria, err);
                            continue;
                        }
                    }
                    
                    // If no criteria worked, fetch all and filter client-side
                    if (!foundWorkingCriteria) {
                        console.log('⚠️ No working criteria found, fetching all and filtering client-side');
                        criteria = undefined;
                    }
                    
                    // Fetch all matching exhibitors in batches
                    let from = 0;
                    const limit = 200;
                    let hasMore = true;
                    
                    // Fetch in batches until we have all matching records
                    while (hasMore) {
                        console.log(`Fetching batch from ${from} with criteria: ${criteria || 'none'}...`);
                        const res = await zohoApi.getRecords('Event_and_Exhibitor_Admin_Only_Report', criteria, from, limit);
                        
                        console.log(`Batch Response (from ${from}):`, res);
                        console.log('Response Code:', res.code);
                        console.log('Response Data:', res.data);
                        console.log('Response Data Length:', res.data?.length);
                        
                        if (res.code === 3000 && res.data && Array.isArray(res.data)) {
                            let batchData = res.data;
                            
                            // Always filter client-side to ensure we only get exhibitors from this Show
                            // Match by Show.ID (must match exactly - this is from Show, not Event Participation)
                            batchData = res.data.filter((item: any) => {
                                const itemShowId = item.Show?.ID || item.Show?.id || item.Show_ID;
                                const currentShowId = data.ID;
                                
                                // Convert both to strings for comparison to handle type mismatches
                                const itemShowIdStr = String(itemShowId);
                                const currentShowIdStr = String(currentShowId);
                                
                                const matches = itemShowIdStr === currentShowIdStr;
                                
                                if (matches) {
                                    console.log('✅ Match found - Show.ID:', itemShowId, '=== Current Show.ID:', currentShowId);
                                }
                                
                                return matches;
                            });
                            
                            console.log(`Filtered batch: ${batchData.length} of ${res.data.length} match Show.ID: ${data.ID}`);
                            
                            allExhibitors = [...allExhibitors, ...batchData];
                            hasMore = res.data.length === limit;
                            from += limit;
                        } else {
                            hasMore = false;
                            if (res.code !== 3000 && res.code !== 3001) {
                                console.warn('Query failed with code:', res.code);
                                console.warn('Response:', res);
                            }
                        }
                    }
                    
                    console.log('Total Exhibitors Fetched:', allExhibitors.length);
                    console.log('All Exhibitors (filtered by Show.ID):', allExhibitors);
                    console.log('Current Show.ID:', data.ID);
                    console.log('=== END FETCHING EXHIBITORS ===');
                    
                    // Final filter to ensure all exhibitors match this Show.ID
                    const finalFiltered = allExhibitors.filter((item: any) => {
                        const itemShowId = String(item.Show?.ID || item.Show?.id || item.Show_ID || '');
                        const currentShowId = String(data.ID || '');
                        return itemShowId === currentShowId;
                    });
                    
                    console.log('Final filtered count:', finalFiltered.length);
                    setExhibitors(finalFiltered);
                } catch (err) {
                    console.error('❌ Failed to fetch exhibitors:', err);
                    console.error('Error Details:', JSON.stringify(err, null, 2));
                    setExhibitors([]);
                } finally {
                    setLoadingExhibitors(false);
                }
            };
            fetchExhibitors();
        }
    }, [activeTab, data]);

    if (!data) return null;

    // Helper to download file from Zoho
    const handleFileDownload = async (fileUrl: string) => {
        try {
            // Get Zoho config for authentication
            const config = JSON.parse(localStorage.getItem('zoho_config') || '{}');
            if (!config.accessToken) {
                alert('Zoho authentication required');
                return;
            }

            // Extract filepath from URL if it's a query parameter
            let downloadUrl = fileUrl;
            let filename = 'floorplan.pdf';

            // If it's a relative URL, construct the full URL
            if (fileUrl.startsWith('/api/v2/')) {
                downloadUrl = `https://creator.zoho.com${fileUrl}`;
            } else if (!fileUrl.startsWith('http')) {
                // If it's just a path, construct full URL
                downloadUrl = `https://creator.zoho.com/api/v2/${config.ownerName}/${config.appLinkName}/report/Show_List/${data.ID}/Floorplan/download?filepath=${fileUrl}`;
            }

            // Extract filename from filepath parameter
            try {
                const urlObj = new URL(downloadUrl);
                const filepath = urlObj.searchParams.get('filepath');
                if (filepath) {
                    filename = filepath.split('/').pop() || filepath.split('\\').pop() || 'floorplan.pdf';
                }
            } catch (e) {
                // If URL parsing fails, use default filename
            }

            // Fetch the file with authentication
            const response = await fetch(downloadUrl, {
                headers: {
                    'Authorization': `Zoho-oauthtoken ${config.accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`Download failed: ${response.status} ${response.statusText}`);
            }

            // Get the blob and trigger download
            const blob = await response.blob();
            const downloadLink = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadLink;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadLink);
            document.body.removeChild(a);
        } catch (error: any) {
            console.error('Download error:', error);
            alert(`Download failed: ${error.message}`);
        }
    };

    // Helper to format date
    const formatDate = (dateStr: string) => {
        if (!dateStr) return null;
        return new Date(dateStr).toLocaleString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Show Details" maxWidth="max-w-5xl">
            <div className="relative">
                {/* Hero Header */}
                <div className="relative glass-panel border-b border-white/5 p-6 overflow-hidden rounded-t-2xl">
                    <div className="absolute top-0 right-0 w-1/3 h-1/2 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent opacity-50" />
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-orange-500/20 rounded-full blur-3xl" />

                    <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start">
                        {data.Event_logo && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="w-24 h-24 bg-white rounded-xl p-3 shrink-0 flex items-center justify-center overflow-hidden shadow-2xl shadow-black/50 border border-white/10"
                            >
                                <img src={data.Event_logo} alt={data.Event || data.Name} className="max-w-full max-h-full object-contain" />
                            </motion.div>
                        )}
                        <div className="flex-1 space-y-3">
                            <div>
                                <motion.h2
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight"
                                >
                                    {data.Event || data.Event_Name || data.Name}
                                </motion.h2>
                                <div className="flex flex-wrap items-center gap-3">
                                    {data.Level && (
                                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-400 border border-blue-500/20 shadow-lg shadow-blue-500/5">
                                            {data.Level}
                                        </span>
                                    )}
                                    <span className="text-zinc-400 text-xs font-medium flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                                        <Hash className="w-3 h-3" /> {data.ID}
                                    </span>
                                </div>
                            </div>

                            {data.Note1 && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl text-yellow-200/80 text-sm leading-relaxed backdrop-blur-sm"
                                >
                                    <p className={isNoteExpanded ? '' : 'line-clamp-2'}>
                                        {data.Note1}
                                    </p>
                                    {data.Note1.length > 150 && (
                                        <button
                                            onClick={() => setIsNoteExpanded(!isNoteExpanded)}
                                            className="mt-2 text-xs font-medium text-yellow-300 hover:text-yellow-200 transition-colors"
                                        >
                                            {isNoteExpanded ? 'Read less' : 'Read more'}
                                        </button>
                                    )}
                                </motion.div>
                            )}
                        </div>
                    </div>
                </div>



                {/* Tab Navigation */}
                <div className="px-8 border-b border-white/5 bg-black/20 sticky top-0 z-30 backdrop-blur-xl">
                    <div className="flex gap-8">
                        <button
                            onClick={() => {
                                console.log('Setting tab to overview');
                                setActiveTab('overview');
                            }}
                            className={`py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'overview'
                                ? 'text-orange-500 border-orange-500'
                                : 'text-zinc-400 border-transparent hover:text-white'
                                }`}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => {
                                console.log('Setting tab to exhibitors');
                                setActiveTab('exhibitors');
                            }}
                            className={`py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'exhibitors'
                                ? 'text-orange-500 border-orange-500'
                                : 'text-zinc-400 border-transparent hover:text-white'
                                }`}
                        >
                            Exhibitors
                            {exhibitors.length > 0 && (
                                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 text-xs border border-orange-500/20">
                                    {exhibitors.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Content Scroll Area */}
                <div className="p-8 space-y-10 max-h-[60vh] overflow-y-auto custom-scrollbar bg-black/40 min-h-[400px]">
                    {activeTab === 'overview' && (
                        <div className="space-y-3" key="overview-content">
                            {data.Starting_Date && (
                                <div className="flex items-center gap-3 py-2.5 border-b border-white/5">
                                    <span className="text-xs font-medium text-zinc-500 w-24 shrink-0">Starting Date</span>
                                    <span className="text-sm text-zinc-200">{formatDate(data.Starting_Date)}</span>
                                </div>
                            )}
                            {data.Industry && (
                                <div className="flex items-center gap-3 py-2.5 border-b border-white/5">
                                    <span className="text-xs font-medium text-zinc-500 w-24 shrink-0">Industry</span>
                                    <span className="text-sm text-zinc-200">{data.Industry}</span>
                                </div>
                            )}
                            {data.Website && (
                                <div className="flex items-center gap-3 py-2.5 border-b border-white/5">
                                    <span className="text-xs font-medium text-zinc-500 w-24 shrink-0">Website</span>
                                    <a href={data.Website} target="_blank" rel="noopener noreferrer" className="text-sm text-orange-400 hover:text-orange-300 hover:underline flex items-center gap-1.5">
                                        {typeof data.Website === 'object' && 'url' in data.Website ? data.Website.url : data.Website}
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            )}
                            {data.Organiser && (
                                <div className="flex items-center gap-3 py-2.5 border-b border-white/5">
                                    <span className="text-xs font-medium text-zinc-500 w-24 shrink-0">Organiser</span>
                                    <span className="text-sm text-zinc-200">{data.Organiser}</span>
                                </div>
                            )}
                            {data.Frequency && (
                                <div className="flex items-center gap-3 py-2.5 border-b border-white/5">
                                    <span className="text-xs font-medium text-zinc-500 w-24 shrink-0">Frequency</span>
                                    <span className="text-sm text-zinc-200">{data.Frequency}</span>
                                </div>
                            )}
                            {(data.City || data.Country || data.World_Area) && (
                                <div className="flex items-center gap-3 py-2.5 border-b border-white/5">
                                    <span className="text-xs font-medium text-zinc-500 w-24 shrink-0">Location</span>
                                    <span className="text-sm text-zinc-200">
                                        {[data.City, data.Country, data.World_Area].filter(Boolean).join(', ')}
                                    </span>
                                </div>
                            )}
                            {data.Exhibition_Size && (
                                <div className="flex items-center gap-3 py-2.5 border-b border-white/5">
                                    <span className="text-xs font-medium text-zinc-500 w-24 shrink-0">Size</span>
                                    <span className="text-sm text-zinc-200">{data.Exhibition_Size}</span>
                                </div>
                            )}
                            {data.Last_edition_n_Exhibitors && (
                                <div className="flex items-center gap-3 py-2.5 border-b border-white/5">
                                    <span className="text-xs font-medium text-zinc-500 w-24 shrink-0">Exhibitors</span>
                                    <span className="text-sm text-zinc-200">{data.Last_edition_n_Exhibitors}</span>
                                </div>
                            )}
                            {data.Exhibitor_List_Link && (
                                <div className="flex items-center gap-3 py-2.5 border-b border-white/5">
                                    <span className="text-xs font-medium text-zinc-500 w-24 shrink-0">Exhibitor List</span>
                                    <a href={typeof data.Exhibitor_List_Link === 'object' && 'url' in data.Exhibitor_List_Link ? data.Exhibitor_List_Link.url : data.Exhibitor_List_Link} target="_blank" rel="noopener noreferrer" className="text-sm text-orange-400 hover:text-orange-300 hover:underline flex items-center gap-1.5">
                                        View Link
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            )}
                            {data.Floorplan_Link && (
                                <div className="flex items-center gap-3 py-2.5 border-b border-white/5">
                                    <span className="text-xs font-medium text-zinc-500 w-24 shrink-0">Floorplan</span>
                                    <a href={typeof data.Floorplan_Link === 'object' && 'url' in data.Floorplan_Link ? data.Floorplan_Link.url : data.Floorplan_Link} target="_blank" rel="noopener noreferrer" className="text-sm text-orange-400 hover:text-orange-300 hover:underline flex items-center gap-1.5">
                                        View Link
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            )}
                            {data.Floorplan && (
                                <div className="flex items-center gap-3 py-2.5 border-b border-white/5">
                                    <span className="text-xs font-medium text-zinc-500 w-24 shrink-0">Floorplan File</span>
                                    <button
                                        onClick={() => handleFileDownload(typeof data.Floorplan === 'object' && 'url' in data.Floorplan ? data.Floorplan.url : data.Floorplan)}
                                        className="text-sm text-orange-400 hover:text-orange-300 flex items-center gap-1.5"
                                    >
                                        <Download className="w-3 h-3" />
                                        Download
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    {activeTab === 'exhibitors' && (
                        <div className="space-y-4" key="exhibitors-content">
                            {loadingExhibitors ? (
                                <div className="flex flex-col items-center justify-center py-20 text-zinc-400 gap-4">
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                        className="w-16 h-16 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center"
                                    >
                                        <Clock className="w-8 h-8 text-orange-500" />
                                    </motion.div>
                                    <div className="text-center space-y-2">
                                        <p className="text-lg font-medium text-white">Fetching exhibitors from database...</p>
                                        <p className="text-sm opacity-60">Please wait while we load the data</p>
                                    </div>
                                    <div className="flex gap-2 mt-4">
                                        {Array.from({ length: 3 }).map((_, i) => (
                                            <motion.div
                                                key={i}
                                                className="w-2 h-2 rounded-full bg-orange-500/50"
                                                animate={{
                                                    scale: [1, 1.2, 1],
                                                    opacity: [0.5, 1, 0.5],
                                                }}
                                                transition={{
                                                    duration: 1.5,
                                                    repeat: Infinity,
                                                    delay: i * 0.2,
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ) : exhibitors.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-4">
                                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                                        <Users className="w-8 h-8 opacity-40" />
                                    </div>
                                    <p className="text-lg font-medium">No exhibitors found</p>
                                    <p className="text-sm opacity-60">There are no exhibitors linked to this event.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {exhibitors.map((item: any) => {
                                        // Helper to safely get display value from any field
                                        const getValue = (val: any) => {
                                            if (!val) return null;
                                            if (typeof val === 'object') return val.display_value || val.value || JSON.stringify(val);
                                            return val;
                                        };

                                        const companyName = getValue(item.Company);
                                        const booth = getValue(item.Booth_No);
                                        const year = getValue(item.Attended_year1);
                                        const size = getValue(item.last_edition_booth_sqm);
                                        const country = getValue(item.Country);
                                        const websiteUrl = item.Website?.url || item.Website;

                                        return (
                                            <div key={item.ID} className="group p-4 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-orange-500/20 rounded-xl transition-all duration-300 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold bg-zinc-800 text-zinc-400 border border-white/10">
                                                        <Building2 className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-white font-medium group-hover:text-orange-400 transition-colors">
                                                            {companyName || 'Unknown Company'}
                                                        </h4>
                                                        <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                                                            {booth && <span className="flex items-center gap-1">Booth: {booth}</span>}
                                                            <span className="flex items-center gap-1">Year: {year || 'Not available'}</span>
                                                            {size && <span className="flex items-center gap-1">Size: {size} sqm</span>}
                                                            {country && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {country}</span>}
                                                            {websiteUrl && (
                                                                <a href={websiteUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-orange-400 transition-colors" onClick={(e) => e.stopPropagation()}>
                                                                    <Globe className="w-3 h-3" /> Website
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Actions Footer */}
                <div className="p-6 border-t border-white/5 bg-zinc-900/90 backdrop-blur-xl flex gap-4 sticky bottom-0 z-20 rounded-b-2xl">
                    <Button
                        onClick={() => onEdit(data)}
                        variant="secondary"
                        className="flex-1 h-12 text-base font-medium glass-button"
                        leftIcon={<Edit2 className="w-4 h-4" />}
                    >
                        Edit Record
                    </Button>
                    <Button
                        onClick={() => {
                            if (confirm('Are you sure you want to delete this record?')) {
                                onDelete(data.ID);
                                onClose();
                            }
                        }}
                        className="flex-1 h-12 text-base font-medium bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 hover:border-red-500/30"
                        leftIcon={<Trash2 className="w-4 h-4" />}
                        disabled
                    >
                        Delete
                    </Button>
                </div>
            </div>
        </Modal >
    );
};
