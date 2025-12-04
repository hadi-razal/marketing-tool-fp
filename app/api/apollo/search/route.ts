import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { company, website, title, location, keywords, quantity } = body;

        const apiKey = process.env.APOLLO_API_KEY;

        if (!apiKey) {
            console.error('Apollo API Key missing');
            return NextResponse.json(
                { error: 'Apollo API key is missing. Please add APOLLO_API_KEY to your .env.local file.' },
                { status: 500 }
            );
        }

        console.log('Apollo Search Request:', { company, website, title, location, keywords, quantity });

        const payload: any = {
            q_organization_domains_list: website ? [website] : undefined,
            person_titles: title ? [title] : undefined,
            person_locations: location ? [location] : undefined,
            q_keywords: keywords || undefined,
            per_page: quantity || 10,
            page: 1,
            include_similar_titles: true,
            contact_email_status: ["verified", "likely to engage"]
        };

        console.log('Apollo Search Payload:', JSON.stringify(payload, null, 2));

        const response = await fetch('https://api.apollo.io/api/v1/mixed_people/api_search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'X-Api-Key': apiKey
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Apollo API Error:', errorData);

            let errorMessage = errorData.message || 'Failed to fetch data from Apollo';
            if (response.status === 403) {
                errorMessage = 'Access Denied: Your Apollo API key does not have permission to use the Search API. Please check your plan.';
            } else if (response.status === 422) {
                errorMessage = 'Invalid Search Criteria: ' + errorMessage;
            }

            return NextResponse.json(
                { error: errorMessage },
                { status: response.status }
            );
        }

        const data = await response.json();
        console.log('Apollo API Response Success. Count:', data.people?.length);

        // Transform Apollo data to our app's format
        const leads = data.people.map((person: any) => ({
            id: person.id,
            name: person.first_name + ' ' + (person.last_name || person.last_name_obfuscated || ''),
            title: person.title,
            company: person.organization?.name || company || 'Unknown',
            website: person.organization?.primary_domain || website || '',
            location: (person.city ? person.city + ', ' : '') + (person.state || person.country || location || ''),
            email: person.email || (person.has_email ? 'Available (Unlock)' : 'N/A'),
            phone: person.phone_numbers?.[0]?.sanitized_number || (person.has_direct_phone ? 'Available (Unlock)' : 'N/A'),
            linkedin: person.linkedin_url,
            image: person.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(person.first_name)}&background=random`,
            status: 'Verified',
            score: 85,
        }));

        return NextResponse.json({ leads });

    } catch (error: any) {
        console.error('Apollo Search Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
