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
    return stored ? JSON.parse(stored) : null;
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
        'com.au': 'https://accounts.zoho.com.au',
        'com.cn': 'https://accounts.zoho.com.cn',
    };
    return map[dc] || map['com'];
};

const refreshAccessToken = async (config: ZohoConfig): Promise<string | null> => {
    if (!config.refreshToken || !config.clientId || !config.clientSecret) return null;

    try {
        const res = await fetch('/api/zoho/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                refreshToken: config.refreshToken,
                clientId: config.clientId,
                clientSecret: config.clientSecret,
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

    const headers = {
        ...options.headers,
        'Authorization': `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json'
    };

    // Use Proxy to avoid CORS
    let res = await fetch('/api/zoho/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            url,
            method: options.method || 'GET',
            headers: {
                'Authorization': `Zoho-oauthtoken ${token}`
            },
            body: options.body ? JSON.parse(options.body as string) : undefined
        })
    });

    // Handle Token Expiry (401)
    if (res.status === 401 && config.refreshToken) {
        console.log('Token expired, refreshing...');
        const newToken = await refreshAccessToken(config);
        if (newToken) {
            // Retry with new token
            res = await fetch('/api/zoho/proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url,
                    method: options.method || 'GET',
                    headers: {
                        'Authorization': `Zoho-oauthtoken ${newToken}`
                    },
                    body: options.body ? JSON.parse(options.body as string) : undefined
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
    }
};
