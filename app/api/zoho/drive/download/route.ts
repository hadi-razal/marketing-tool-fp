import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const fileId = searchParams.get('fileId');
        // We need the token. Since this might be a direct link or triggered by client, 
        // we need to see how we get the token.
        // If it's a direct browser navigation, we can't easily pass headers.
        // But `lib/zoho.ts` `getDownloadUrl` returns this route.
        // If we use `window.open` or `<a>`, we can't pass headers.
        // So we might need to pass the token in the query param (less secure but common for temp links)
        // OR we rely on the client using `fetch` with blob/download.

        // Let's assume the client will use `fetch` with headers to get the blob, OR we pass token in query.
        // Given the security implications, let's try to extract from headers first.
        let token = req.headers.get('Authorization');

        // If not in header, check query (fallback) - ONLY if necessary and we accept the risk.
        // For now, let's strictly require header and assume client handles the download via blob or similar.
        // BUT, for a simple "Download" button, a direct link is better.
        // Let's check if we can get the token from cookies? No, it's in localStorage.

        // Alternative: Client calls this API to get a *temporary download URL* from Zoho?
        // Zoho WorkDrive has a "download" endpoint that redirects.

        // Let's try to proxy the download.
        // If the user clicks a link, we can't add headers.
        // So we might need `?token=...` in the URL.
        const tokenParam = searchParams.get('token');
        if (!token && tokenParam) {
            token = `Zoho-oauthtoken ${tokenParam}`;
        }

        if (!token) {
            return NextResponse.json({ error: 'Authorization token missing' }, { status: 401 });
        }

        if (!fileId) {
            return NextResponse.json({ error: 'File ID missing' }, { status: 400 });
        }

        const dc = searchParams.get('dc') || 'com';

        const map: Record<string, string> = {
            'com': 'https://download.zoho.com',
            'eu': 'https://download.zoho.eu',
            'in': 'https://download.zoho.in',
            'ae': 'https://download.zoho.ae',
            'com.au': 'https://download.zoho.com.au',
            'com.cn': 'https://download.zoho.com.cn',
        };
        const baseUrl = map[dc] || map['com'];

        const url = `${baseUrl}/workdrive/api/v1/download/${fileId}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': token,
            },
        });

        if (!response.ok) {
            // If it's a redirect (3xx), fetch follows it by default usually, but if manual handling is needed:
            // Zoho might return 302.
            // If response is not ok, return error.
            const text = await response.text();
            return NextResponse.json({ error: `Zoho Error: ${response.status}`, details: text }, { status: response.status });
        }

        // Stream the response back
        const headers = new Headers(response.headers);
        headers.set('Content-Disposition', `attachment; filename="${response.headers.get('Content-Disposition') || 'file'}"`);

        return new NextResponse(response.body, {
            status: 200,
            headers: headers,
        });

    } catch (error: any) {
        console.error('Download Route Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
