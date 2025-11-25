import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { url, method, body: requestBody, headers } = body;

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        const fetchOptions: RequestInit = {
            method: method || 'GET',
            headers: {
                ...headers,
                'Content-Type': 'application/json',
            },
        };

        if (requestBody && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
            fetchOptions.body = JSON.stringify(requestBody);
        }

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
