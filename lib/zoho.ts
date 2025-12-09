export interface ZohoConfig {
    authToken?: string; // Legacy/Manual
    accessToken?: string; // OAuth
    refreshToken?: string; // OAuth
    clientId?: string;
    clientSecret?: string;
    redirectUri?: string;
    ownerName: string;
    appLinkName: string;
    dc?: string; // Data Center (com, eu, in, etc.)
}

export const getZohoConfig = (): ZohoConfig | null => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('zoho_config');
    const parsed = stored ? JSON.parse(stored) : {};

    return {
        ...parsed,
        clientId: parsed.clientId || process.env.NEXT_PUBLIC_ZOHO_CLIENT_ID,
        clientSecret: parsed.clientSecret || process.env.NEXT_PUBLIC_ZOHO_CLIENT_SECRET,
        ownerName: parsed.ownerName || process.env.NEXT_PUBLIC_ZOHO_OWNER_NAME || 'fairplatz2025',
        appLinkName: parsed.appLinkName || process.env.NEXT_PUBLIC_ZOHO_APP_LINK_NAME || 'exhibitorsdb',
        redirectUri: parsed.redirectUri || process.env.NEXT_PUBLIC_ZOHO_REDIRECT_URI || 'https://marketing-tool-fp.vercel.app/zoho-callback',
    };
};

export const saveZohoConfig = (config: ZohoConfig) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('zoho_config', JSON.stringify(config));
};

const getAuthUrl = (dc: string = 'com') => {
    const map: Record<string, string> = {
        'com': 'https://accounts.zoho.com',
        'eu': 'https://accounts.zoho.eu',
        'in': 'https://accounts.zoho.in',
        'ae': 'https://accounts.zoho.ae',
        'com.au': 'https://accounts.zoho.com.au',
        'com.cn': 'https://accounts.zoho.com.cn',
    };
    return map[dc] || map['com'];
};

const refreshAccessToken = async (config: ZohoConfig): Promise<string | null> => {
    // Client Secret is optional here as it can be handled by the server
    if (!config.refreshToken || !config.clientId) return null;

    try {
        const res = await fetch('/api/zoho/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                refreshToken: config.refreshToken,
                clientId: config.clientId,
                clientSecret: config.clientSecret, // Optional
                dc: config.dc,
                grantType: 'refresh_token'
            })
        });
        const data = await res.json();

        if (data.access_token) {
            const newConfig = { ...config, accessToken: data.access_token };
            saveZohoConfig(newConfig);
            return data.access_token;
        }
        console.error('Failed to refresh token:', data);
        // Clear invalid tokens to force re-login
        saveZohoConfig({ ...config, accessToken: undefined, refreshToken: undefined });
        return null;
    } catch (error) {
        console.error('Error refreshing token:', error);
        return null;
    }
};

const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const config = getZohoConfig();
    if (!config) throw new Error('Zoho configuration missing');

    const token = config.accessToken || config.authToken;
    if (!token) throw new Error('No access token found');

    const headers: Record<string, string> = {
        ...((options.headers as Record<string, string>) || {}),
        'Authorization': `Zoho-oauthtoken ${token}`
    };



    // Do not send Content-Type for GET or when FormData is used
    if (options.method !== 'GET' && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    let bodyToSend = options.body;

    // Use Proxy – No JSON.parse
    let res = await fetch('/api/zoho/proxy-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            url,
            method: options.method || 'GET',
            headers,
            body: bodyToSend instanceof FormData ? null : bodyToSend ? JSON.parse(bodyToSend as string) : undefined
        })
    });

    if (res.status === 401 && config.refreshToken) {
        const newToken = await refreshAccessToken(config);
        if (newToken) {
            headers['Authorization'] = `Zoho-oauthtoken ${newToken}`;

            res = await fetch('/api/zoho/proxy-v2', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url,
                    method: options.method || 'GET',
                    headers,
                    body: bodyToSend instanceof FormData ? null : bodyToSend ? JSON.parse(bodyToSend as string) : undefined
                })
            });
        }
    }

    if (!res.ok) throw new Error(`Zoho API Error: ${res.statusText}`);
    return res.json();
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
        return fetchWithAuth(url);
    },

    updateRecord: async (reportName: string, id: string, data: any) => {
        const config = getZohoConfig();
        if (!config) throw new Error('Zoho configuration missing');
        const url = `https://creator.zoho.com/api/v2/${config.ownerName}/${config.appLinkName}/report/${reportName}/${id}`;
        return fetchWithAuth(url, { method: 'PATCH', body: JSON.stringify({ data }) });
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
