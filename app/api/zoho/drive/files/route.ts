import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { url, method, headers } = body;
        const token = req.headers.get('Authorization');

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        if (!token) {
            return NextResponse.json({ error: 'Authorization token missing' }, { status: 401 });
        }

        // We use this specific proxy to ensure the Accept header is correct and to handle JSON:API response
        const fetchOptions: RequestInit = {
            method: method || 'GET',
            headers: {
                'Authorization': token,
                'Accept': 'application/vnd.api+json', // Critical for WorkDrive
                ...headers
            },
        };

        const res = await fetch(url, fetchOptions);
        const data = await res.json();

        if (!res.ok) {
            return NextResponse.json(data, { status: res.status });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
