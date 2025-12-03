import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const token = req.headers.get('Authorization');

        if (!token) {
            return NextResponse.json({ error: 'Authorization token missing' }, { status: 401 });
        }

        // Zoho WorkDrive Upload Endpoint
        // https://workdrive.zoho.com/api/v1/upload
        const dc = req.nextUrl.searchParams.get('dc') || 'com';

        const map: Record<string, string> = {
            'com': 'https://www.zohoapis.com',
            'eu': 'https://www.zohoapis.eu',
            'in': 'https://www.zohoapis.in',
            'ae': 'https://www.zohoapis.ae',
            'com.au': 'https://www.zohoapis.com.au',
            'com.cn': 'https://www.zohoapis.com.cn',
        };
        const baseUrl = map[dc] || map['com'];

        // Zoho WorkDrive Upload Endpoint
        const response = await fetch(`${baseUrl}/workdrive/api/v1/upload`, {
            method: 'POST',
            headers: {
                'Authorization': token, // Token should already include "Zoho-oauthtoken " prefix from client
                // Do NOT set Content-Type here, let fetch set it with the boundary for FormData
            },
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Zoho Upload Error:', data);
            return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Upload Route Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
