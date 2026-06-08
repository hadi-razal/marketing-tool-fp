/** Matches `public.companies` in Supabase. */
export interface DbCompany {
    id: string;
    name?: string | null;
    website_url?: string | null;
    linkedin_url?: string | null;
    twitter_url?: string | null;
    facebook_url?: string | null;
    logo_url?: string | null;
    primary_domain?: string | null;
    industry?: string | null;
    keywords?: string[] | null;
    phone?: string | null;
    country?: string | null;
    estimated_num_employees?: number | null;
    created_at?: string | null;
    comments?: unknown[] | null;
    world_area?: string | null;
}
