import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { code, clientId, clientSecret, redirectUri, dc, grantType, refreshToken } = body;

        const map: Record<string, string> = {
            'com': 'https://accounts.zoho.com',
            'eu': 'https://accounts.zoho.eu',
            'in': 'https://accounts.zoho.in',
            'com.au': 'https://accounts.zoho.com.au',
            'com.cn': 'https://accounts.zoho.com.cn',
        };
        const authBase = map[dc] || map['com'];

        let url = '';
        if (grantType === 'authorization_code') {
            url = `${authBase}/oauth/v2/token?code=${code}&client_id=${clientId}&client_secret=${clientSecret}&redirect_uri=${redirectUri}&grant_type=authorization_code`;
        } else if (grantType === 'refresh_token') {
            url = `${authBase}/oauth/v2/token?refresh_token=${refreshToken}&client_id=${clientId}&client_secret=${clientSecret}&grant_type=refresh_token`;
        } else {
            return NextResponse.json({ error: 'Invalid grant_type' }, { status: 400 });
        }

        const res = await fetch(url, { method: 'POST' });
        const data = await res.json();

        if (data.error) {
            return NextResponse.json({ error: data.error }, { status: 400 });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
