import { createClient } from '@/lib/supabase';

const supabase = createClient();

export interface SavedCompany {
    id: string;
    name: string;
    website_url?: string;
    linkedin_url?: string;
    twitter_url?: string;
    facebook_url?: string;
    logo_url?: string;
    primary_domain?: string;
    industry?: string;
    industries?: string[];
    keywords?: string[];
    phone?: string;
    sanitized_phone?: string;
    street_address?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
    founded_year?: number;
    estimated_num_employees?: number;
    organization_revenue?: number;
    organization_revenue_printed?: string;
    sic_codes?: string[];
    naics_codes?: string[];
    alexa_ranking?: number;
    retail_location_count?: number;
    raw_address?: string;
    publicly_traded_symbol?: string;
    publicly_traded_exchange?: string;
    created_at?: string;
}

export interface SavedPerson {
    id: string;
    saved_uid?: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
    title?: string;
    headline?: string;
    email?: string;
    email_status?: string;
    linkedin_url?: string;
    photo_url?: string;
    twitter_url?: string;
    github_url?: string;
    facebook_url?: string;
    country?: string;
    state?: string;
    city?: string;
    postal_code?: string;
    formatted_address?: string;
    time_zone?: string;
    organization_id?: string;
    organization_name?: string;
    organization_domain?: string;
    departments?: string[];
    subdepartments?: string[];
    seniority?: string;
    employment_history?: any[];
    organization?: any;
    created_at?: string;
}

export const databaseService = {
    // Save a company to the database
    saveCompany: async (company: any) => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const { data, error } = await supabase
            .from('companies')
            .upsert({
                id: company.id,
                name: company.name,
                website_url: company.website_url,
                linkedin_url: company.linkedin_url,
                twitter_url: company.twitter_url,
                facebook_url: company.facebook_url,
                logo_url: company.logo_url,
                primary_domain: company.primary_domain,
                industry: company.industry,
                industries: company.industries || [],
                keywords: company.keywords || [],
                phone: company.phone,
                sanitized_phone: company.sanitized_phone,
                street_address: company.street_address,
                city: company.city,
                state: company.state,
                country: company.country,
                postal_code: company.postal_code,
                founded_year: company.founded_year,
                estimated_num_employees: company.estimated_num_employees,
                organization_revenue: company.organization_revenue,
                organization_revenue_printed: company.organization_revenue_printed,
                sic_codes: company.sic_codes || [],
                naics_codes: company.naics_codes || [],
                alexa_ranking: company.alexa_ranking,
                retail_location_count: company.retail_location_count,
                raw_address: company.raw_address,
                publicly_traded_symbol: company.publicly_traded_symbol,
                publicly_traded_exchange: company.publicly_traded_exchange,
                saved_uid: user?.id,
            }, { onConflict: 'id' })
            .select()
            .single();

        if (error) {
            console.error('Error saving company:', error);
            throw error;
        }

        // Log activity
        if (user?.id) {
            await logActivity(user.id, 'New Company Saved', `Saved company ${company.name} to database`);
        }

        return data;
    },

    // Check if a company is already saved
    checkCompanySaved: async (id: string) => {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('companies')
            .select('id')
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
            console.error('Error checking company status:', error);
        }

        return !!data;
    },

    // Get all saved companies
    getSavedCompanies: async () => {
        const supabase = createClient();
        const { data: companies, error } = await supabase
            .from('companies')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching saved companies:', error);
            throw error;
        }

        // Manually fetch user details
        const userIds = Array.from(new Set(companies.map(c => c.saved_uid).filter(Boolean)));
        let userMap: Record<string, { name: string, profile_url: string }> = {};

        if (userIds.length > 0) {
            const { data: users } = await supabase
                .from('users')
                .select('uid, name, profile_url')
                .in('uid', userIds);

            if (users) {
                userMap = users.reduce((acc, user) => ({
                    ...acc,
                    [user.uid]: { name: user.name, profile_url: user.profile_url }
                }), {});
            }
        }

        return companies.map(company => mapDbCompanyToAppCompany(company, userMap[company.saved_uid]?.name, userMap[company.saved_uid]?.profile_url));
    },

    // Get recent companies with limit
    getRecentCompanies: async (limit: number = 5) => {
        const supabase = createClient();
        const { data: companies, error } = await supabase
            .from('companies')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching recent companies:', error);
            throw error;
        }

        // Manually fetch user details
        const userIds = Array.from(new Set(companies.map(c => c.saved_uid).filter(Boolean)));
        let userMap: Record<string, { name: string, profile_url: string }> = {};

        if (userIds.length > 0) {
            const { data: users } = await supabase
                .from('users')
                .select('uid, name, profile_url')
                .in('uid', userIds);

            if (users) {
                userMap = users.reduce((acc, user) => ({
                    ...acc,
                    [user.uid]: { name: user.name, profile_url: user.profile_url }
                }), {});
            }
        }

        return companies.map(company => mapDbCompanyToAppCompany(company, userMap[company.saved_uid]?.name, userMap[company.saved_uid]?.profile_url));
    },

    // Delete a company
    deleteCompany: async (id: string) => {
        const supabase = createClient();
        // First get the company name for the log
        const { data: company } = await supabase
            .from('companies')
            .select('name')
            .eq('id', id)
            .single();

        const { error } = await supabase
            .from('companies')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting company:', error);
            throw error;
        }

        // Log activity
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id && company?.name) {
            await logActivity(user.id, 'Company Deleted', `Deleted company ${company.name} from database`);
        }
    },

    // ==================== PEOPLE FUNCTIONS ====================

    // Save a person to the database
    savePerson: async (person: any) => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const fullName = person.full_name || person.name || `${person.first_name || ''} ${person.last_name || ''}`.trim();

        const { data, error } = await supabase
            .from('people')
            .upsert({
                id: person.id,
                saved_uid: user?.id,
                first_name: person.first_name,
                last_name: person.last_name,
                full_name: fullName,
                title: person.title,
                headline: person.headline,
                email: person.email,
                email_status: person.email_status,
                linkedin_url: person.linkedin || person.linkedin_url,
                photo_url: person.image || person.photo_url,
                twitter_url: person.twitter || person.twitter_url,
                github_url: person.github || person.github_url,
                facebook_url: person.facebook || person.facebook_url,
                country: person.country,
                state: person.state,
                city: person.city,
                postal_code: person.postal_code,
                formatted_address: person.location || person.formatted_address,
                time_zone: person.time_zone,
                organization_id: person.company_id || person.organization_id,
                organization_name: person.company || person.organization_name,
                organization_domain: person.website || person.company_website || person.organization_domain,
                departments: person.departments || [],
                subdepartments: person.subdepartments || [],
                seniority: person.seniority,
                employment_history: person.employment_history || [],
                organization: person.organization || null,
            }, { onConflict: 'id' })
            .select()
            .single();

        if (error) {
            console.error('Error saving person:', error);
            throw error;
        }

        // Log activity
        if (user?.id) {
            await logActivity(user.id, 'New Person Saved', `Saved ${fullName} to database`);
        }

        return data;
    },

    // Check if a person is already saved
    checkPersonSaved: async (id: string) => {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('people')
            .select('id')
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error checking person status:', error);
        }

        return !!data;
    },

    // Get all saved people
    getSavedPeople: async () => {
        const supabase = createClient();
        const { data: people, error } = await supabase
            .from('people')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching saved people:', error);
            throw error;
        }

        // Fetch user details for saved_by
        const userIds = Array.from(new Set(people.map(p => p.saved_uid).filter(Boolean)));
        let userMap: Record<string, { name: string, profile_url: string }> = {};

        if (userIds.length > 0) {
            const { data: users } = await supabase
                .from('users')
                .select('uid, name, profile_url')
                .in('uid', userIds);

            if (users) {
                userMap = users.reduce((acc, user) => ({
                    ...acc,
                    [user.uid]: { name: user.name, profile_url: user.profile_url }
                }), {});
            }
        }

        return people.map(person => mapDbPersonToAppPerson(person, userMap[person.saved_uid]?.name, userMap[person.saved_uid]?.profile_url));
    },

    // Get recent people with limit
    getRecentPeople: async (limit: number = 5) => {
        const supabase = createClient();
        const { data: people, error } = await supabase
            .from('people')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching recent people:', error);
            throw error;
        }

        return people.map(person => mapDbPersonToAppPerson(person));
    },

    // Delete a person
    deletePerson: async (id: string) => {
        const supabase = createClient();
        // First get the person name for the log
        const { data: person } = await supabase
            .from('people')
            .select('full_name')
            .eq('id', id)
            .single();

        const { error } = await supabase
            .from('people')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting person:', error);
            throw error;
        }

        // Log activity
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id && person?.full_name) {
            await logActivity(user.id, 'Person Deleted', `Deleted ${person.full_name} from database`);
        }
    },
    addComment: async (companyId: string, text: string) => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) throw new Error('User not authenticated');

        // Fetch current user name and profile
        const { data: userData } = await supabase
            .from('users')
            .select('name, profile_url')
            .eq('uid', user.id)
            .single();

        const userName = userData?.name || 'Unknown User';
        const userProfileUrl = userData?.profile_url;

        const newComment: Comment = {
            id: crypto.randomUUID(),
            uid: user.id,
            userName,
            userProfileUrl,
            text,
            createdAt: new Date().toISOString()
        };

        // Fetch current comments
        const { data: company, error: fetchError } = await supabase
            .from('companies')
            .select('comments')
            .eq('id', companyId)
            .single();

        if (fetchError) {
            console.error('Error fetching company comments:', fetchError);
            throw fetchError;
        }

        const currentComments: Comment[] = company?.comments || [];
        const updatedComments = [...currentComments, newComment];

        // Update company with new comments
        const { error: updateError } = await supabase
            .from('companies')
            .update({ comments: updatedComments })
            .eq('id', companyId);

        if (updateError) {
            console.error('Error adding comment:', updateError);
            throw updateError;
        }

        // Log activity
        const { data: companyNameData } = await supabase
            .from('companies')
            .select('name')
            .eq('id', companyId)
            .single();

        if (companyNameData?.name) {
            await logActivity(user.id, 'Comment Added', `Added a comment to ${companyNameData.name}`);
        }

        return updatedComments;
    },

    // Delete a comment from a company
    deleteComment: async (companyId: string, commentId: string) => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) throw new Error('User not authenticated');

        // Fetch current comments
        const { data: company, error: fetchError } = await supabase
            .from('companies')
            .select('comments, name')
            .eq('id', companyId)
            .single();

        if (fetchError) {
            console.error('Error fetching company comments:', fetchError);
            throw fetchError;
        }

        const currentComments: Comment[] = company?.comments || [];
        const updatedComments = currentComments.filter(c => c.id !== commentId);

        // Update company with new comments
        const { error: updateError } = await supabase
            .from('companies')
            .update({ comments: updatedComments })
            .eq('id', companyId);

        if (updateError) {
            console.error('Error deleting comment:', updateError);
            throw updateError;
        }

        // Log activity
        if (company?.name) {
            await logActivity(user.id, 'Comment Deleted', `Deleted a comment from ${company.name}`);
        }

        return updatedComments;
    },

    // Add a reply to a comment
    addReply: async (companyId: string, commentId: string, text: string) => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) throw new Error('User not authenticated');

        // Fetch current user name and profile
        const { data: userData } = await supabase
            .from('users')
            .select('name, profile_url')
            .eq('uid', user.id)
            .single();

        const userName = userData?.name || 'Unknown User';
        const userProfileUrl = userData?.profile_url;

        const newReply: Reply = {
            id: crypto.randomUUID(),
            uid: user.id,
            userName,
            userProfileUrl,
            text,
            createdAt: new Date().toISOString()
        };

        // Fetch current comments
        const { data: company, error: fetchError } = await supabase
            .from('companies')
            .select('comments, name')
            .eq('id', companyId)
            .single();

        if (fetchError) {
            console.error('Error fetching company comments:', fetchError);
            throw fetchError;
        }

        const currentComments: Comment[] = company?.comments || [];
        const updatedComments = currentComments.map(comment => {
            if (comment.id === commentId) {
                return {
                    ...comment,
                    replies: [...(comment.replies || []), newReply]
                };
            }
            return comment;
        });

        // Update company with new comments
        const { error: updateError } = await supabase
            .from('companies')
            .update({ comments: updatedComments })
            .eq('id', companyId);

        if (updateError) {
            console.error('Error adding reply:', updateError);
            throw updateError;
        }

        // Log activity
        if (company?.name) {
            await logActivity(user.id, 'Reply Added', `Replied to a comment on ${company.name}`);
        }

        return updatedComments;
    },

    // Delete a reply
    deleteReply: async (companyId: string, commentId: string, replyId: string) => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) throw new Error('User not authenticated');

        // Fetch current comments
        const { data: company, error: fetchError } = await supabase
            .from('companies')
            .select('comments, name')
            .eq('id', companyId)
            .single();

        if (fetchError) {
            console.error('Error fetching company comments:', fetchError);
            throw fetchError;
        }

        const currentComments: Comment[] = company?.comments || [];
        const updatedComments = currentComments.map(comment => {
            if (comment.id === commentId) {
                return {
                    ...comment,
                    replies: (comment.replies || []).filter(r => r.id !== replyId)
                };
            }
            return comment;
        });

        // Update company with new comments
        const { error: updateError } = await supabase
            .from('companies')
            .update({ comments: updatedComments })
            .eq('id', companyId);

        if (updateError) {
            console.error('Error deleting reply:', updateError);
            throw updateError;
        }

        // Log activity
        if (company?.name) {
            await logActivity(user.id, 'Reply Deleted', `Deleted a reply from ${company.name}`);
        }

        return updatedComments;
    },

    // Get comments for a company
    getComments: async (companyId: string) => {
        const supabase = createClient();
        const { data: company, error } = await supabase
            .from('companies')
            .select('comments')
            .eq('id', companyId)
            .single();

        if (error) {
            console.error('Error fetching comments:', error);
            return [];
        }

        const comments: Comment[] = company?.comments || [];
        if (comments.length === 0) return [];

        // Fetch fresh user profiles for both comments and replies
        const commentUserIds = comments.map(c => c.uid);
        const replyUserIds = comments.flatMap(c => c.replies?.map(r => r.uid) || []);
        const allUserIds = Array.from(new Set([...commentUserIds, ...replyUserIds]));

        if (allUserIds.length > 0) {
            const { data: users } = await supabase
                .from('users')
                .select('uid, name, profile_url')
                .in('uid', allUserIds);

            if (users) {
                const userMap = users.reduce((acc, user) => ({
                    ...acc,
                    [user.uid]: { name: user.name, profile_url: user.profile_url }
                }), {} as Record<string, { name: string, profile_url: string }>);

                return comments.map(comment => ({
                    ...comment,
                    userName: userMap[comment.uid]?.name || comment.userName,
                    userProfileUrl: userMap[comment.uid]?.profile_url,
                    replies: comment.replies?.map(reply => ({
                        ...reply,
                        userName: userMap[reply.uid]?.name || reply.userName,
                        userProfileUrl: userMap[reply.uid]?.profile_url
                    })) || []
                }));
            }
        }

        return comments;
    },

    // Get people associated with a company
    getPeopleByCompany: async (companyId: string) => {
        const supabase = createClient();
        const { data: people, error } = await supabase
            .from('people')
            .select('*')
            .eq('organization_id', companyId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching people for company:', error);
            return [];
        }

        return people.map(person => mapDbPersonToAppPerson(person));
    },

    // ==================== PERSON COMMENTS FUNCTIONS ====================

    // Add a comment to a person
    addPersonComment: async (personId: string, text: string) => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) throw new Error('User not authenticated');

        // Fetch current user name and profile
        const { data: userData } = await supabase
            .from('users')
            .select('name, profile_url')
            .eq('uid', user.id)
            .single();

        const userName = userData?.name || 'Unknown User';
        const userProfileUrl = userData?.profile_url;

        const newComment: Comment = {
            id: crypto.randomUUID(),
            uid: user.id,
            userName,
            userProfileUrl,
            text,
            createdAt: new Date().toISOString()
        };

        // Fetch current comments
        const { data: person, error: fetchError } = await supabase
            .from('people')
            .select('comments')
            .eq('id', personId)
            .single();

        if (fetchError) {
            console.error('Error fetching person comments:', fetchError);
            throw fetchError;
        }

        const currentComments: Comment[] = person?.comments || [];
        const updatedComments = [...currentComments, newComment];

        // Update person with new comments
        const { error: updateError } = await supabase
            .from('people')
            .update({ comments: updatedComments })
            .eq('id', personId);

        if (updateError) {
            console.error('Error adding person comment:', updateError);
            throw updateError;
        }

        // Log activity
        const { data: personNameData } = await supabase
            .from('people')
            .select('full_name')
            .eq('id', personId)
            .single();

        if (personNameData?.full_name) {
            await logActivity(user.id, 'Comment Added', `Added a comment to ${personNameData.full_name}`);
        }

        return updatedComments;
    },

    // Delete a comment from a person
    deletePersonComment: async (personId: string, commentId: string) => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) throw new Error('User not authenticated');

        // Fetch current comments
        const { data: person, error: fetchError } = await supabase
            .from('people')
            .select('comments, full_name')
            .eq('id', personId)
            .single();

        if (fetchError) {
            console.error('Error fetching person comments:', fetchError);
            throw fetchError;
        }

        const currentComments: Comment[] = person?.comments || [];
        const updatedComments = currentComments.filter(c => c.id !== commentId);

        // Update person with new comments
        const { error: updateError } = await supabase
            .from('people')
            .update({ comments: updatedComments })
            .eq('id', personId);

        if (updateError) {
            console.error('Error deleting person comment:', updateError);
            throw updateError;
        }

        // Log activity
        if (person?.full_name) {
            await logActivity(user.id, 'Comment Deleted', `Deleted a comment from ${person.full_name}`);
        }

        return updatedComments;
    },

    // Add a reply to a person comment
    addPersonReply: async (personId: string, commentId: string, text: string) => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) throw new Error('User not authenticated');

        // Fetch current user name and profile
        const { data: userData } = await supabase
            .from('users')
            .select('name, profile_url')
            .eq('uid', user.id)
            .single();

        const userName = userData?.name || 'Unknown User';
        const userProfileUrl = userData?.profile_url;

        const newReply: Reply = {
            id: crypto.randomUUID(),
            uid: user.id,
            userName,
            userProfileUrl,
            text,
            createdAt: new Date().toISOString()
        };

        // Fetch current comments
        const { data: person, error: fetchError } = await supabase
            .from('people')
            .select('comments, full_name')
            .eq('id', personId)
            .single();

        if (fetchError) {
            console.error('Error fetching person comments:', fetchError);
            throw fetchError;
        }

        const currentComments: Comment[] = person?.comments || [];
        const updatedComments = currentComments.map(comment => {
            if (comment.id === commentId) {
                return {
                    ...comment,
                    replies: [...(comment.replies || []), newReply]
                };
            }
            return comment;
        });

        // Update person with new comments
        const { error: updateError } = await supabase
            .from('people')
            .update({ comments: updatedComments })
            .eq('id', personId);

        if (updateError) {
            console.error('Error adding person reply:', updateError);
            throw updateError;
        }

        // Log activity
        if (person?.full_name) {
            await logActivity(user.id, 'Reply Added', `Replied to a comment on ${person.full_name}`);
        }

        return updatedComments;
    },

    // Delete a reply from a person comment
    deletePersonReply: async (personId: string, commentId: string, replyId: string) => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) throw new Error('User not authenticated');

        // Fetch current comments
        const { data: person, error: fetchError } = await supabase
            .from('people')
            .select('comments, full_name')
            .eq('id', personId)
            .single();

        if (fetchError) {
            console.error('Error fetching person comments:', fetchError);
            throw fetchError;
        }

        const currentComments: Comment[] = person?.comments || [];
        const updatedComments = currentComments.map(comment => {
            if (comment.id === commentId) {
                return {
                    ...comment,
                    replies: (comment.replies || []).filter(r => r.id !== replyId)
                };
            }
            return comment;
        });

        // Update person with new comments
        const { error: updateError } = await supabase
            .from('people')
            .update({ comments: updatedComments })
            .eq('id', personId);

        if (updateError) {
            console.error('Error deleting person reply:', updateError);
            throw updateError;
        }

        // Log activity
        if (person?.full_name) {
            await logActivity(user.id, 'Reply Deleted', `Deleted a reply from ${person.full_name}`);
        }

        return updatedComments;
    },

    // Get comments for a person
    getPersonComments: async (personId: string) => {
        const supabase = createClient();
        const { data: person, error } = await supabase
            .from('people')
            .select('comments')
            .eq('id', personId)
            .single();

        if (error) {
            console.error('Error fetching person comments:', error);
            return [];
        }

        const comments: Comment[] = person?.comments || [];
        if (comments.length === 0) return [];

        // Fetch fresh user profiles for both comments and replies
        const commentUserIds = comments.map(c => c.uid);
        const replyUserIds = comments.flatMap(c => c.replies?.map(r => r.uid) || []);
        const allUserIds = Array.from(new Set([...commentUserIds, ...replyUserIds]));

        if (allUserIds.length > 0) {
            const { data: users } = await supabase
                .from('users')
                .select('uid, name, profile_url')
                .in('uid', allUserIds);

            if (users) {
                const userMap = users.reduce((acc, user) => ({
                    ...acc,
                    [user.uid]: { name: user.name, profile_url: user.profile_url }
                }), {} as Record<string, { name: string, profile_url: string }>);

                return comments.map(comment => ({
                    ...comment,
                    userName: userMap[comment.uid]?.name || comment.userName,
                    userProfileUrl: userMap[comment.uid]?.profile_url,
                    replies: comment.replies?.map(reply => ({
                        ...reply,
                        userName: userMap[reply.uid]?.name || reply.userName,
                        userProfileUrl: userMap[reply.uid]?.profile_url
                    })) || []
                }));
            }
        }

        return comments;
    }
};

// Helper to log activity
async function logActivity(uid: string, label: string, status: string) {
    const supabase = createClient();
    try {
        await supabase
            .from('activities')
            .insert({
                uid,
                label,
                status,
                created_at: new Date().toISOString()
            });
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

export interface Reply {
    id: string;
    uid: string;
    userName: string;
    userProfileUrl?: string;
    text: string;
    createdAt: string;
}

export interface Comment {
    id: string;
    uid: string;
    userName: string;
    userProfileUrl?: string;
    text: string;
    createdAt: string;
    replies?: Reply[];
}

// Helper to map DB structure back to App structure if needed
function mapDbCompanyToAppCompany(dbCompany: any, savedByName?: string, savedByProfileUrl?: string) {
    return {
        id: dbCompany.id,
        name: dbCompany.name,
        website: dbCompany.website_url || dbCompany.primary_domain,
        logo: dbCompany.logo_url,
        industry: dbCompany.industry,
        location: dbCompany.raw_address || `${dbCompany.city || ''}, ${dbCompany.country || ''}`,
        employees: dbCompany.estimated_num_employees,
        revenue: dbCompany.organization_revenue_printed,
        description: dbCompany.description,
        linkedin: dbCompany.linkedin_url,
        twitter: dbCompany.twitter_url,
        facebook: dbCompany.facebook_url,
        phone: dbCompany.phone,
        founded_year: dbCompany.founded_year,
        keywords: dbCompany.keywords,
        isSaved: true,
        saved_by: savedByName || dbCompany.users?.name,
        saved_by_profile_url: savedByProfileUrl,
        comments: dbCompany.comments || [],
        ...dbCompany
    };
}

// Helper to map DB person structure to App structure
function mapDbPersonToAppPerson(dbPerson: any, savedByName?: string, savedByProfileUrl?: string) {
    return {
        id: dbPerson.id,
        name: dbPerson.full_name || `${dbPerson.first_name || ''} ${dbPerson.last_name || ''}`.trim(),
        first_name: dbPerson.first_name,
        last_name: dbPerson.last_name,
        title: dbPerson.title,
        headline: dbPerson.headline,
        email: dbPerson.email,
        email_status: dbPerson.email_status,
        phone: dbPerson.phone,
        linkedin: dbPerson.linkedin_url,
        twitter: dbPerson.twitter_url,
        facebook: dbPerson.facebook_url,
        github: dbPerson.github_url,
        image: dbPerson.photo_url,
        photo_url: dbPerson.photo_url,
        location: dbPerson.formatted_address || [dbPerson.city, dbPerson.state, dbPerson.country].filter(Boolean).join(', '),
        city: dbPerson.city,
        state: dbPerson.state,
        country: dbPerson.country,
        company: dbPerson.organization_name,
        company_id: dbPerson.organization_id,
        website: dbPerson.organization_domain,
        seniority: dbPerson.seniority,
        departments: dbPerson.departments,
        subdepartments: dbPerson.subdepartments,
        employment_history: dbPerson.employment_history,
        organization: dbPerson.organization,
        isSaved: true,
        saved_by: savedByName,
        saved_by_profile_url: savedByProfileUrl,
        status: dbPerson.email_status === 'verified' ? 'Verified' : 'Unverified',
        score: dbPerson.email_status === 'verified' ? 95 : 50,
        ...dbPerson
    };
}
