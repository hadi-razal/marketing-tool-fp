export interface ZohoConfig {
    ownerName: string;
    appLinkName: string;
    dc?: string;
    // Legacy fields - kept for backward compatibility but not used for auth
    authToken?: string;
    accessToken?: string;
    refreshToken?: string;
    clientId?: string;
    clientSecret?: string;
    redirectUri?: string;
}

// Get Zoho config (for owner/app name, not for auth)
export const getZohoConfig = (): ZohoConfig => {
    return {
        ownerName: process.env.NEXT_PUBLIC_ZOHO_OWNER_NAME || 'fairplatz2025',
        appLinkName: process.env.NEXT_PUBLIC_ZOHO_APP_LINK_NAME || 'exhibitorsdb',
        dc: process.env.NEXT_PUBLIC_ZOHO_DC || 'com',
    };
};

// Legacy function - kept for compatibility but does nothing now
export const saveZohoConfig = (config: ZohoConfig) => {
    // No-op - authentication is now handled server-side
    console.log('saveZohoConfig is deprecated - server-side auth is used');
};

// Fetch with server-side auth via proxy-v2
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
        ...((options.headers as Record<string, string>) || {}),
    };

    // Do not send Content-Type for GET or when FormData is used
    if (options.method !== 'GET' && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    let bodyToSend = options.body;

    // Use Proxy V2 - server handles authentication
    const res = await fetch('/api/zoho/proxy-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            url,
            method: options.method || 'GET',
            headers,
            body: bodyToSend instanceof FormData ? null : bodyToSend ? JSON.parse(bodyToSend as string) : undefined
        })
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: res.statusText }));
        // Check if it's a "not found" response (404 or code 3001)
        if (res.status === 404 || errorData.code === 3001) {
            // Return structured response for "not found" instead of throwing
            return { code: 3001, data: null };
        }
        const errorMessage = errorData.error || errorData.message || errorData.code ? `Error ${errorData.code}: ${errorData.message || errorData.error}` : `Zoho API Error: ${res.statusText}`;
        throw new Error(errorMessage);
    }

    const json = await res.json();
    // Only log successful responses, not "not found" responses to reduce noise
    if (json.code !== 3001) {
        console.log(`[Zoho API] ${options.method || 'GET'} ${url} Response:`, json);
    }
    return json;
};



export const zohoApi = {
    getRecords: async (reportName: string, criteria?: string, from: number = 0, limit: number = 200) => {
        const config = getZohoConfig();
        if (!config) throw new Error('Zoho configuration missing');

        const url = `https://creator.zoho.com/api/v2/${config.ownerName}/${config.appLinkName}/report/${reportName}`;
        const params = new URLSearchParams();
        if (criteria) params.append('criteria', criteria);
        params.append('from', from.toString());
        params.append('limit', limit.toString());

        return fetchWithAuth(`${url}?${params.toString()}`);
    },

    addRecord: async (formName: string, data: any) => {
        const config = getZohoConfig();
        if (!config) throw new Error('Zoho configuration missing');
        const url = `https://creator.zoho.com/api/v2/${config.ownerName}/${config.appLinkName}/form/${formName}`;
        return fetchWithAuth(url, { method: 'POST', body: JSON.stringify({ data }) });
    },

    getRecordById: async (reportName: string, id: string) => {
        const config = getZohoConfig();
        if (!config) throw new Error('Zoho configuration missing');
        const url = `https://creator.zoho.com/api/v2/${config.ownerName}/${config.appLinkName}/report/${reportName}/${id}`;
        try {
            return await fetchWithAuth(url);
        } catch (err: any) {
            // If record doesn't exist (404 or 3001), return a structured response instead of throwing
            // This allows callers to handle "not found" gracefully
            if (err?.message?.includes('404') || err?.message?.includes('not found') || err?.message?.includes('3001')) {
                return { code: 3001, data: null };
            }
            throw err;
        }
    },

    updateRecord: async (reportOrFormName: string, id: string, data: any) => {
        const config = getZohoConfig();
        if (!config) throw new Error('Zoho configuration missing');
        
        // Zoho Creator API: Updates must use report endpoint, not form endpoint
        // Try report endpoint first (this is the correct way for updates)
        const reportUrl = `https://creator.zoho.com/api/v2/${config.ownerName}/${config.appLinkName}/report/${reportOrFormName}/${id}`;
        
        try {
            const result = await fetchWithAuth(reportUrl, { 
                method: 'PATCH', 
                body: JSON.stringify({ data }) 
            });
            return result;
        } catch (reportError: any) {
            // If report endpoint fails, try form endpoint as fallback (though this usually doesn't work for updates)
            console.log('Report endpoint failed, trying form endpoint as fallback...', reportError);
            try {
                const formUrl = `https://creator.zoho.com/api/v2/${config.ownerName}/${config.appLinkName}/form/${reportOrFormName}/${id}`;
                return await fetchWithAuth(formUrl, { 
                    method: 'PATCH', 
                    body: JSON.stringify({ data }) 
                });
            } catch (formError: any) {
                // If both fail, throw the original report error with more context
                throw new Error(`Failed to update record: ${reportError.message || reportError}. Tried report: ${reportOrFormName}`);
            }
        }
    },

    deleteRecord: async (reportName: string, id: string) => {
        const config = getZohoConfig();
        if (!config) throw new Error('Zoho configuration missing');
        const url = `https://creator.zoho.com/api/v2/${config.ownerName}/${config.appLinkName}/report/${reportName}/${id}`;
        return fetchWithAuth(url, { method: 'DELETE' });
    },

    getRecordCount: async (reportName: string, criteria?: string) => {
        const config = getZohoConfig();
        if (!config) throw new Error('Zoho configuration missing');
        const url = `https://creator.zoho.com/api/v2/${config.ownerName}/${config.appLinkName}/report/${reportName}`;
        const params = new URLSearchParams();
        if (criteria) params.append('criteria', criteria);
        params.append('from', '0');
        params.append('limit', '1');
        return fetchWithAuth(`${url}?${params.toString()}`);
    }
};

// --- WorkDrive API ---

export interface WorkDriveFile {
    id: string;
    type: string;
    attributes: {
        name: string;
        size?: number;
        created_time_in_millisecond?: number;
        modified_time_in_millisecond?: number;
        is_folder?: boolean;
        parent_id?: string;
        extension?: string;
        thumbnail_url?: string;
    };
}

const getWorkDriveBaseUrl = (dc: string = 'com') => {
    const map: Record<string, string> = {
        'com': 'https://www.zohoapis.com',
        'eu': 'https://www.zohoapis.eu',
        'in': 'https://www.zohoapis.in',
        'ae': 'https://www.zohoapis.ae',
        'com.au': 'https://www.zohoapis.com.au',
        'com.cn': 'https://www.zohoapis.com.cn',
    };
    return map[dc] || map['com'];
};

export const workDriveApi = {
    // Get Team Folders (to find a root)
    getTeamFolders: async () => {
        const config = getZohoConfig();
        const baseUrl = getWorkDriveBaseUrl(config?.dc);
        const url = `${baseUrl}/workdrive/api/v1/teamfolders`;
        return fetchWithAuth(url, {
            headers: {
                'Accept': 'application/vnd.api+json'
            }
        });
    },

    // List files in a folder
    getFiles: async (folderId: string) => {
        const config = getZohoConfig();
        const baseUrl = getWorkDriveBaseUrl(config?.dc);
        // Correct API: /files?folder_id={id}
        const url = `${baseUrl}/workdrive/api/v1/files?folder_id=${folderId}`;
        return fetchWithAuth(url, {
            headers: {
                'Accept': 'application/vnd.api+json'
            }
        });
    },

    // Get Download URL
    getDownloadUrl: async (fileId: string) => {
        const config = getZohoConfig();
        return `/api/zoho/drive/download?fileId=${fileId}&dc=${config?.dc || 'com'}`;
    },

    // Get Current User (for My Folder ID)
    getMe: async () => {
        const config = getZohoConfig();
        const baseUrl = getWorkDriveBaseUrl(config?.dc);
        const url = `${baseUrl}/workdrive/api/v1/users/me`;
        return fetchWithAuth(url, {
            headers: { 'Accept': 'application/vnd.api+json' }
        });
    },

    // Get Shared Files
    getSharedFiles: async () => {
        const config = getZohoConfig();
        const baseUrl = getWorkDriveBaseUrl(config?.dc);
        const url = `${baseUrl}/workdrive/api/v1/files?filter[type]=sharedtome`;
        return fetchWithAuth(url, {
            headers: { 'Accept': 'application/vnd.api+json' }
        });
    },

    // Upload File
    uploadFile: async (parentId: string, file: File, filename?: string) => {
        const config = getZohoConfig();
        if (!config) throw new Error('Zoho configuration missing');

        const token = config.accessToken || config.authToken;
        if (!token) throw new Error('No access token found');

        const formData = new FormData();
        formData.append('content', file);
        formData.append('parent_id', parentId);
        if (filename) {
            formData.append('filename', filename);
        }
        formData.append('override-name-exist', 'true');

        const res = await fetch(`/api/zoho/drive/upload?dc=${config.dc || 'com'}`, {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Zoho-oauthtoken ${token}`
            }
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Upload failed');
        }

        return res.json();
    }
};
