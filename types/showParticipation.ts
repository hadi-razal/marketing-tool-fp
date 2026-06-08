export interface ShowParticipationCompany {
    id: string;
    name?: string | null;
    logo_url?: string | null;
    country?: string | null;
    world_area?: string | null;
    industry?: string | null;
    primary_domain?: string | null;
    estimated_num_employees?: number | null;
}

export interface ShowParticipation {
    id: number | string;
    show_id?: string | null;
    company_id?: string | null;
    year?: string | null;
    booth_number?: string | null;
    booth_size?: string | null;
    booth_size_category?: string | null;
    created_at?: string | null;
    companies?: ShowParticipationCompany | null;
}

export interface ShowExhibitorRow {
    id: string;
    companyId: string;
    company: string;
    year: string;
    booth: string;
    size: string;
    sqm: number;
    category: 'Small' | 'Medium' | 'Large' | 'Enterprise';
    categoryOrder: number;
    logoUrl: string;
    location: string;
    industry: string;
    domain: string;
    employees: number;
}
