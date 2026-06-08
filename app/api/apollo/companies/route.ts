import { NextResponse } from 'next/server';

const APOLLO_ORG_SEARCH_URL = 'https://api.apollo.io/api/v1/mixed_companies/search';

function cleanDomain(input: string): string {
    return input
        .replace(/^https?:\/\//i, '')
        .split('/')[0]
        .replace(/^www\./i, '')
        .trim()
        .toLowerCase();
}

function parseKeywordTags(keywords: string): string[] | undefined {
    if (!keywords.trim()) return undefined;
    const tags = keywords
        .split(/[,;]/)
        .map((k) => k.trim())
        .filter(Boolean);
    return tags.length ? tags : undefined;
}

async function readApolloErrorMessage(response: Response): Promise<string> {
    const text = await response.text();
    try {
        const data = JSON.parse(text) as { error?: string; message?: string };
        return data.error || data.message || text || `Apollo request failed (${response.status})`;
    } catch {
        return text?.trim() || `Apollo request failed (${response.status})`;
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { company, website, location, keywords, quantity, page } = body;

        const apiKey = process.env.APOLLO_API_KEY?.trim();

        if (!apiKey) {
            return NextResponse.json(
                { error: 'Apollo API key is missing. Please add APOLLO_API_KEY to your .env.local file.' },
                { status: 500 }
            );
        }

        const rawQty = typeof quantity === 'number' && quantity > 0 ? quantity : 10;
        const perPage = Math.min(Math.max(1, rawQty), 100);

        const companyTrimmed = typeof company === 'string' ? company.trim() : '';
        const websiteTrimmed = typeof website === 'string' ? website.trim() : '';
        const locationTrimmed = typeof location === 'string' ? location.trim() : '';
        const keywordsTrimmed = typeof keywords === 'string' ? keywords.trim() : '';

        const payload: Record<string, unknown> = {
            page: typeof page === 'number' && page > 0 ? page : 1,
            per_page: perPage,
        };

        if (companyTrimmed) {
            payload.q_organization_name = companyTrimmed;
        }
        if (websiteTrimmed) {
            const domain = cleanDomain(websiteTrimmed);
            if (domain) {
                payload.q_organization_domains_list = [domain];
            }
        }
        if (locationTrimmed) {
            payload.organization_locations = [locationTrimmed];
        }
        const keywordTags = keywordsTrimmed ? parseKeywordTags(keywordsTrimmed) : undefined;
        if (keywordTags?.length) {
            payload.q_organization_keyword_tags = keywordTags;
        }

        const response = await fetch(APOLLO_ORG_SEARCH_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'x-api-key': apiKey,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorMessage = await readApolloErrorMessage(response);
            console.error('Apollo Company API Error:', response.status, errorMessage);

            let message = errorMessage;
            if (response.status === 403) {
                message =
                    'Access denied: check that your Apollo API key has Organization Search access and sufficient credits.';
            }

            return NextResponse.json({ error: message }, { status: response.status });
        }

        const data = await response.json();
        const organizations = Array.isArray(data.organizations) ? data.organizations : [];

        const companies = organizations.map((org: Record<string, unknown>) => ({
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
            sanitized_phone: (org.primary_phone as { sanitized_number?: string } | undefined)?.sanitized_number,
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

            website: org.website_url || org.primary_domain,
            logo: org.logo_url,
            location: org.raw_address || [org.state, org.country].filter(Boolean).join(', '),
            employees: org.estimated_num_employees,
            revenue: org.organization_revenue_printed,
            description: org.short_description || org.seo_description,
            linkedin: org.linkedin_url,
            twitter: org.twitter_url,
            facebook: org.facebook_url,
        }));

        return NextResponse.json({
            companies,
            pagination: data.pagination,
        });
    } catch (error: unknown) {
        console.error('Apollo Company Search Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
