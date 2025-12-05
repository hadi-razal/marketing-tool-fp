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
            website_url: org.website_url,
            linkedin_url: org.linkedin_url,
            twitter_url: org.twitter_url,
            facebook_url: org.facebook_url,
            logo_url: org.logo_url,
            primary_domain: org.primary_domain,
            industry: org.industry,
            industries: org.industries,
            keywords: org.keywords,
            phone: org.phone,
            sanitized_phone: org.primary_phone?.sanitized_number,
            street_address: org.street_address,
            city: org.city,
            state: org.state,
            country: org.country,
            postal_code: org.postal_code,
            founded_year: org.founded_year,
            estimated_num_employees: org.estimated_num_employees,
            organization_revenue: org.organization_revenue,
            organization_revenue_printed: org.organization_revenue_printed,
            sic_codes: org.sic_codes,
            naics_codes: org.naics_codes,
            alexa_ranking: org.alexa_ranking,
            retail_location_count: org.retail_location_count,
            raw_address: org.raw_address,
            publicly_traded_symbol: org.publicly_traded_symbol,
            publicly_traded_exchange: org.publicly_traded_exchange,

            // Keep existing mappings for frontend compatibility if needed, or update frontend to use new keys
            website: org.website_url || org.primary_domain,
            logo: org.logo_url,
            location: org.raw_address || `${org.city}, ${org.country}`,
            employees: org.estimated_num_employees,
            revenue: org.organization_revenue_printed,
            description: org.short_description || org.seo_description,
            linkedin: org.linkedin_url,
            twitter: org.twitter_url,
            facebook: org.facebook_url,
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
