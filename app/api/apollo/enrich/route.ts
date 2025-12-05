import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id, reveal_email, reveal_phone } = body;

        const apiKey = process.env.APOLLO_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: 'Apollo API key is missing' },
                { status: 500 }
            );
        }

        if (!id) {
            return NextResponse.json(
                { error: 'Person ID is required' },
                { status: 400 }
            );
        }

        console.log('Enriching person with ID:', id, 'Reveal Email:', reveal_email, 'Reveal Phone:', reveal_phone);

        // We use the /people/match endpoint with the ID to get the full details including email/phone
        // Note: Apollo's API might require reveal_personal_emails=true to get personal emails
        const response = await fetch('https://api.apollo.io/api/v1/people/match', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'X-Api-Key': apiKey
            },
            body: JSON.stringify({
                id: id,
                reveal_personal_emails: reveal_email ?? false,
                reveal_phone_number: reveal_phone ?? false
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Apollo Enrich Error:', errorData);
            return NextResponse.json(
                { error: errorData.message || 'Failed to enrich person' },
                { status: response.status }
            );
        }

        const data = await response.json();
        const person = data.person;

        if (!person) {
            return NextResponse.json(
                { error: 'Person not found' },
                { status: 404 }
            );
        }

        // Transform to our app's format
        const lead = {
            id: person.id,
            name: `${person.first_name || ''} ${person.last_name || ''}`.trim() || 'Unknown',
            first_name: person.first_name,
            last_name: person.last_name,
            title: person.title,
            headline: person.headline,
            company: person.organization?.name || 'Unknown',
            company_id: person.organization?.id || person.organization_id,
            website: person.organization?.primary_domain || person.organization?.website_url || '',
            company_logo: person.organization?.logo_url,
            company_industry: person.organization?.industry,
            company_size: person.organization?.estimated_num_employees,
            location: [person.city, person.state, person.country].filter(Boolean).join(', ') || '',
            city: person.city,
            state: person.state,
            country: person.country,
            email: person.email || 'N/A',
            email_status: person.email_status,
            phone: person.phone_numbers?.[0]?.sanitized_number || person.sanitized_phone || 'N/A',
            linkedin: person.linkedin_url,
            twitter: person.twitter_url,
            facebook: person.facebook_url,
            github: person.github_url,
            image: person.photo_url,
            seniority: person.seniority,
            departments: person.departments,
            functions: person.functions,
            status: person.email_status === 'verified' ? 'Verified' : (person.email ? 'Likely Valid' : 'Unverified'),
            score: person.email_status === 'verified' ? 95 : (person.email ? 75 : 50),
            photo_url: person.photo_url,
        };

        return NextResponse.json({ lead });

    } catch (error: any) {
        console.error('Enrichment Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
