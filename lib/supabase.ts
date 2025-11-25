import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const createMockClient = () => {
    const STORAGE_KEY = 'fairplatz_db_v5_export';

    const getLocal = () => {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
    };

    const setLocal = (data: any) => {
        if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    };

    return {
        from: (table: any) => ({
            select: () => ({
                order: () => new Promise(resolve => setTimeout(() => resolve({ data: getLocal(), error: null }), 300))
            }),
            insert: (rows: any) => new Promise(resolve => {
                setTimeout(() => {
                    const current = getLocal();
                    const newRows = rows.map((r: any) => ({
                        ...r,
                        id: `id-${Math.random().toString(36).substr(2, 9)}`,
                        created_at: new Date().toISOString()
                    }));
                    setLocal([...newRows, ...current]);
                    resolve({ data: newRows, error: null });
                }, 500);
            }),
            update: (updates: any) => ({
                eq: (col: any, val: any) => new Promise(resolve => {
                    const current = getLocal();
                    const updated = current.map((item: any) => item[col] === val ? { ...item, ...updates } : item);
                    setLocal(updated);
                    resolve({ data: updated, error: null });
                })
            }),
            delete: () => ({
                eq: (col: any, val: any) => new Promise(resolve => {
                    const current = getLocal();
                    setLocal(current.filter((item: any) => item[col] !== val));
                    resolve({ error: null });
                })
            })
        }),
        auth: {
            signInWithPassword: ({ email, password }: any): Promise<{ data: any, error: any }> => new Promise(resolve => {
                setTimeout(() => {
                    if (email === 'admin' && password === 'admin') {
                        resolve({ data: { user: { email } }, error: null });
                    } else {
                        resolve({ data: null, error: { message: 'Invalid login credentials' } });
                    }
                }, 500);
            }),
            signUp: ({ email, password }: any): Promise<{ data: any, error: any }> => new Promise(resolve => {
                setTimeout(() => {
                    resolve({ data: { user: { email } }, error: null });
                }, 500);
            })
        }
    };
};

export const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : createMockClient();
