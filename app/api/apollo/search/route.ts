import { NextResponse } from 'next/server';

const APOLLO_PEOPLE_URL = 'https://api.apollo.io/api/v1/mixed_people/api_search';

function cleanDomain(input: string): string {
    return input
        .replace(/^https?:\/\//i, '')
        .split('/')[0]
        .replace(/^www\./i, '')
        .trim()
        .toLowerCase();
}

/** Apollo expects multiple titles as separate array entries, not one CSV string. */
function parsePersonTitles(title: string | undefined): string[] | undefined {
    if (!title?.trim()) return undefined;
    const parts = title
        .split(/[,;]/)
        .map((t) => t.trim())
        .filter(Boolean);
    return parts.length ? parts : undefined;
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
        const { company, website, title, location, keywords, quantity, page } = body;

        const apiKey = process.env.APOLLO_API_KEY?.trim();

        if (!apiKey) {
            console.error('Apollo API Key missing');
            return NextResponse.json(
                { error: 'Apollo API key is missing. Please add APOLLO_API_KEY to your .env.local file.' },
                { status: 500 }
            );
        }

        const rawQty = typeof quantity === 'number' && quantity > 0 ? quantity : 10;
        const perPage = Math.min(Math.max(1, rawQty), 100);

        const payload: Record<string, unknown> = {
            per_page: perPage,
            page: typeof page === 'number' && page > 0 ? page : 1,
            include_similar_titles: true,
        };

        const companyTrimmed = typeof company === 'string' ? company.trim() : '';
        const websiteTrimmed = typeof website === 'string' ? website.trim() : '';
        const locationTrimmed = typeof location === 'string' ? location.trim() : '';
        const keywordsTrimmed = typeof keywords === 'string' ? keywords.trim() : '';

        if (companyTrimmed) {
            payload.q_organization_name = companyTrimmed;
        }
        if (websiteTrimmed) {
            const domain = cleanDomain(websiteTrimmed);
            if (domain) {
                payload.q_organization_domains_list = [domain];
            }
        }

        const personTitles = parsePersonTitles(typeof title === 'string' ? title : undefined);
        if (personTitles?.length) {
            payload.person_titles = personTitles;
        }

        if (locationTrimmed) {
            if (companyTrimmed || websiteTrimmed) {
                payload.organization_locations = [locationTrimmed];
            } else {
                payload.person_locations = [locationTrimmed];
            }
        }

        if (keywordsTrimmed) {
            payload.q_keywords = keywordsTrimmed;
        }

        const response = await fetch(APOLLO_PEOPLE_URL, {
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
            console.error('Apollo API Error:', response.status, errorMessage);

            let message = errorMessage;
            if (response.status === 403) {
                message =
                    'Access denied: this Apollo API key may not have access to People API Search (master key required) or your plan does not include it.';
            } else if (response.status === 422) {
                message = `Invalid search criteria: ${errorMessage}`;
            }

            return NextResponse.json({ error: message }, { status: response.status });
        }

        const data = await response.json();

        const leads = (data.people || []).map((person: Record<string, unknown>) => {
            const org = person.organization as Record<string, unknown> | undefined;
            return {
                id: person.id,
                name:
                    `${(person.first_name as string) || ''} ${(person.last_name as string) || ''}`.trim() ||
                    'Unknown',
                first_name: person.first_name,
                last_name: person.last_name,
                title: person.title,
                headline: person.headline,
                company: (org?.name as string) || companyTrimmed || 'Unknown',
                company_id: org?.id || person.organization_id,
                website:
                    (org?.primary_domain as string) ||
                    (org?.website_url as string) ||
                    websiteTrimmed ||
                    '',
                company_logo: org?.logo_url,
                company_industry: org?.industry,
                company_size: org?.estimated_num_employees,
                location:
                    [person.city, person.state, person.country].filter(Boolean).join(', ') ||
                    locationTrimmed ||
                    '',
                city: person.city,
                state: person.state,
                country: person.country,
                email:
                    person.email ||
                    (person.has_email ? 'Available (Unlock)' : 'N/A'),
                email_status: person.email_status,
                phone:
                    (person.phone_numbers as { sanitized_number?: string }[])?.[0]?.sanitized_number ||
                    person.sanitized_phone ||
                    (person.has_direct_phone ? 'Available (Unlock)' : 'N/A'),
                linkedin: person.linkedin_url,
                linkedin_url: person.linkedin_url,
                twitter: person.twitter_url,
                twitter_url: person.twitter_url,
                facebook: person.facebook_url,
                facebook_url: person.facebook_url,
                github: person.github_url,
                github_url: person.github_url,
                image: person.photo_url,
                seniority: person.seniority,
                departments: person.departments,
                functions: person.functions,
                status:
                    person.email_status === 'verified'
                        ? 'Verified'
                        : person.email
                          ? 'Likely Valid'
                          : 'Unverified',
                score: person.email_status === 'verified' ? 95 : person.email ? 75 : 50,
                photo_url: person.photo_url,
            };
        });

        return NextResponse.json({
            leads,
            pagination: data.pagination,
        });
    } catch (error: unknown) {
        console.error('Apollo Search Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
