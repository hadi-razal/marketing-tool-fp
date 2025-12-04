import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { company, website, location, keywords, quantity, page } = body;

        const apiKey = process.env.APOLLO_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: 'Apollo API key is missing. Please add APOLLO_API_KEY to your .env.local file.' },
                { status: 500 }
            );
        }

        const payload: any = {
            q_organization_name: company || undefined,
            q_organization_domains: website ? [website] : undefined,
            organization_locations: location ? [location] : undefined,
            q_keywords: keywords || undefined,
            per_page: quantity || 10,
            page: page || 1,
        };

        console.log('Apollo Company Search Payload:', JSON.stringify(payload, null, 2));

        const response = await fetch('https://api.apollo.io/api/v1/organizations/search', {
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
            return NextResponse.json(
                { error: errorData.message || 'Failed to fetch data from Apollo' },
                { status: response.status }
            );
        }

        const data = await response.json();

        const companies = data.organizations.map((org: any) => ({
            id: org.id,
            name: org.name,
            website: org.website_url || org.primary_domain,
            logo: org.logo_url,
            industry: org.industry,
            location: org.raw_address || `${org.city}, ${org.country}`,
            employees: org.estimated_num_employees,
            revenue: org.organization_revenue_printed,
            description: org.short_description || org.seo_description,
            linkedin: org.linkedin_url,
            twitter: org.twitter_url,
            facebook: org.facebook_url,
            keywords: org.keywords,
            phone: org.primary_phone?.sanitized_number || org.phone,
            founded_year: org.founded_year,
            technologies: org.current_technologies || [] // Assuming this might be available or we map differently
        }));

        return NextResponse.json({
            companies,
            pagination: data.pagination
        });

    } catch (error: any) {
        console.error('Apollo Company Search Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
