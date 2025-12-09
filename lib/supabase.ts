import { createBrowserClient } from '@supabase/ssr';

export const createClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    // During build/prerender, env vars may not be available
    // Return a placeholder that will be replaced at runtime
    if (!supabaseUrl || !supabaseAnonKey) {
        // Return a mock client during build time
        return createBrowserClient(
            'https://placeholder.supabase.co',
            'placeholder-anon-key'
        );
    }

    return createBrowserClient(supabaseUrl, supabaseAnonKey);
};
