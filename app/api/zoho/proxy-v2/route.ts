import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// In-memory token cache (will reset on cold start, but that's fine - we'll refresh)
let cachedAccessToken: string | null = null;
let tokenExpiresAt: number = 0;

const DATA_CENTER_URLS: Record<string, string> = {
    'com': 'https://accounts.zoho.com',
    'eu': 'https://accounts.zoho.eu',
    'in': 'https://accounts.zoho.in',
    'ae': 'https://accounts.zoho.ae',
    'com.au': 'https://accounts.zoho.com.au',
    'com.cn': 'https://accounts.zoho.com.cn',
};

// Get access token from refresh token (server-side)
async function getServerAccessToken(): Promise<string> {
    const now = Date.now();

    // Return cached token if still valid (with 5 min buffer)
    if (cachedAccessToken && tokenExpiresAt > now + 300000) {
        return cachedAccessToken;
    }

    const refreshToken = process.env.ZOHO_REFRESH_TOKEN;
    const clientId = process.env.ZOHO_CLIENT_ID;
    const clientSecret = process.env.ZOHO_CLIENT_SECRET;
    const dc = process.env.ZOHO_DC || 'ae';

    if (!refreshToken || !clientId || !clientSecret) {
        throw new Error('Zoho credentials not configured. Please set ZOHO_REFRESH_TOKEN, ZOHO_CLIENT_ID, and ZOHO_CLIENT_SECRET in environment variables.');
    }

    const authBase = DATA_CENTER_URLS[dc] || DATA_CENTER_URLS['com'];
    const tokenUrl = `${authBase}/oauth/v2/token?refresh_token=${refreshToken}&client_id=${clientId}&client_secret=${clientSecret}&grant_type=refresh_token`;

    const res = await fetch(tokenUrl, { method: 'POST' });
    const data = await res.json();

    if (data.error) {
        console.error('Zoho token refresh failed:', data);
        throw new Error(`Token refresh failed: ${data.error}`);
    }

    if (!data.access_token) {
        throw new Error('No access token in response');
    }

    // Cache the token (expires_in is in seconds)
    cachedAccessToken = data.access_token;
    tokenExpiresAt = now + (data.expires_in || 3600) * 1000;

    return data.access_token;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { url, method, body: requestBody, headers: clientHeaders } = body;

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        // Get server-side access token
        const accessToken = await getServerAccessToken();

        // Build headers with server-side auth
        const headers: Record<string, string> = {
            'Authorization': `Zoho-oauthtoken ${accessToken}`,
        };

        // Add Content-Type if needed
        if (method !== 'GET' && requestBody) {
            headers['Content-Type'] = 'application/json';
        }

        // Copy any Accept headers from client
        if (clientHeaders?.Accept) {
            headers['Accept'] = clientHeaders.Accept;
        }

        const fetchOptions: RequestInit = {
            method: method || 'GET',
            headers,
        };

        if (requestBody && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
            fetchOptions.body = typeof requestBody === 'object' ? JSON.stringify(requestBody) : requestBody;
        }

        const res = await fetch(url, fetchOptions);
        const data = await res.json();

        if (!res.ok) {
            // If token expired (401), clear cache and return error
            if (res.status === 401) {
                cachedAccessToken = null;
                tokenExpiresAt = 0;
            }
            return NextResponse.json(data, { status: res.status });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Zoho proxy error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({ message: 'Zoho Proxy V2 - Server-side authentication enabled' });
}

export async function OPTIONS() {
    return NextResponse.json({}, { status: 200 });
}

