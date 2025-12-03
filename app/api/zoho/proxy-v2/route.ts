import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    console.log('Proxy V2 POST request received');
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
            },
        };

        if (requestBody && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
            fetchOptions.body = typeof requestBody === 'object' ? JSON.stringify(requestBody) : requestBody;
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

export async function GET() {
    return NextResponse.json({ message: 'Proxy V2 is working' });
}

export async function OPTIONS() {
    return NextResponse.json({}, { status: 200 });
}
