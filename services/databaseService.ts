import { createClient } from '@/lib/supabase';

const supabase = createClient();

export interface SavedCompany {
    id: string;
    apollo_id: string;
    name: string;
    website: string;
    logo_url?: string;
    industry?: string;
    location?: string;
    employees?: number;
    revenue?: string;
    description?: string;
    linkedin_url?: string;
    twitter_url?: string;
    facebook_url?: string;
    phone?: string;
    founded_year?: number;
    keywords?: string[];
    created_at?: string;
}

export const databaseService = {
    // Save a company to the database
    saveCompany: async (company: any) => {
        const { data, error } = await supabase
            .from('companies')
            .upsert({
                apollo_id: company.id,
                name: company.name,
                website: company.website,
                logo_url: company.logo,
                industry: company.industry,
                location: company.location,
                employees: company.employees,
                revenue: company.revenue,
                description: company.description,
                linkedin_url: company.linkedin,
                twitter_url: company.twitter,
                facebook_url: company.facebook,
                phone: company.phone,
                founded_year: company.founded_year,
                keywords: company.keywords,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'apollo_id' })
            .select()
            .single();

        if (error) {
            console.error('Error saving company:', error);
            throw error;
        }

        return data;
    },

    // Check if a company is already saved
    checkCompanySaved: async (apolloId: string) => {
        const { data, error } = await supabase
            .from('companies')
            .select('id')
            .eq('apollo_id', apolloId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
            console.error('Error checking company status:', error);
        }

        return !!data;
    },

    // Get all saved companies
    getSavedCompanies: async () => {
        const { data, error } = await supabase
            .from('companies')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching saved companies:', error);
            throw error;
        }

        return data.map(mapDbCompanyToAppCompany);
    },

    // Get recent companies with limit
    getRecentCompanies: async (limit: number = 5) => {
        const { data, error } = await supabase
            .from('companies')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching recent companies:', error);
            throw error;
        }

        return data.map(mapDbCompanyToAppCompany);
    },

    // Delete a company
    deleteCompany: async (id: string) => {
        const { error } = await supabase
            .from('companies')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting company:', error);
            throw error;
        }
    }
};

// Helper to map DB structure back to App structure if needed
function mapDbCompanyToAppCompany(dbCompany: any) {
    return {
        id: dbCompany.apollo_id, // Use Apollo ID for consistency in search view, or handle internal ID
        db_id: dbCompany.id, // Internal DB ID
        name: dbCompany.name,
        website: dbCompany.website,
        logo: dbCompany.logo_url,
        industry: dbCompany.industry,
        location: dbCompany.location,
        employees: dbCompany.employees,
        revenue: dbCompany.revenue,
        description: dbCompany.description,
        linkedin: dbCompany.linkedin_url,
        twitter: dbCompany.twitter_url,
        facebook: dbCompany.facebook_url,
        phone: dbCompany.phone,
        founded_year: dbCompany.founded_year,
        keywords: dbCompany.keywords,
    };
}
