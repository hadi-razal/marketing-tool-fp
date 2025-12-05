import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { company, website, title, location, keywords, quantity, page } = body;

        const apiKey = process.env.APOLLO_API_KEY;

        if (!apiKey) {
            console.error('Apollo API Key missing');
            return NextResponse.json(
                { error: 'Apollo API key is missing. Please add APOLLO_API_KEY to your .env.local file.' },
                { status: 500 }
            );
        }

        console.log('Apollo Search Request:', { company, website, title, location, keywords, quantity, page });

        const payload: any = {
            per_page: quantity || 10,
            page: page || 1,
            include_similar_titles: true,
        };

        // Organization filters
        if (company) {
            payload.q_organization_name = company;
        }
        if (website) {
            const cleanDomain = website.replace(/^https?:\/\//, '').split('/')[0];
            payload.q_organization_domains_list = [cleanDomain];
        }

        // Person filters
        if (title) {
            payload.person_titles = [title];
        }
        if (location) {
            payload.person_locations = [location];
        }
        if (keywords) {
            payload.q_keywords = keywords;
        }

        console.log('Apollo Search Payload:', JSON.stringify(payload, null, 2));

        const response = await fetch('https://api.apollo.io/api/v1/mixed_people/search', {
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
        console.log('Apollo API Raw Response:', JSON.stringify(data, null, 2));
        console.log('Apollo API Response Success. Count:', data.people?.length);

        // Transform Apollo data to our app's format
        const leads = (data.people || []).map((person: any) => ({
            id: person.id,
            name: `${person.first_name || ''} ${person.last_name || ''}`.trim() || 'Unknown',
            first_name: person.first_name,
            last_name: person.last_name,
            title: person.title,
            headline: person.headline,
            company: person.organization?.name || company || 'Unknown',
            company_id: person.organization?.id || person.organization_id,
            website: person.organization?.primary_domain || person.organization?.website_url || website || '',
            company_logo: person.organization?.logo_url,
            company_industry: person.organization?.industry,
            company_size: person.organization?.estimated_num_employees,
            location: [person.city, person.state, person.country].filter(Boolean).join(', ') || location || '',
            city: person.city,
            state: person.state,
            country: person.country,
            email: person.email || (person.has_email ? 'Available (Unlock)' : 'N/A'),
            email_status: person.email_status,
            phone: person.phone_numbers?.[0]?.sanitized_number || person.sanitized_phone || (person.has_direct_phone ? 'Available (Unlock)' : 'N/A'),
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
        }));

        return NextResponse.json({
            leads,
            pagination: data.pagination
        });

    } catch (error: any) {
        console.error('Apollo Search Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
