import { createClient } from '@/lib/supabase';

/** One activity row summarizing a spreadsheet import (optional user note). */
export async function logSpreadsheetImport(summary: string, comment?: string | null) {
    const trimmed = comment?.trim();
    const supabase = createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) return;

    const status = trimmed ? `${summary} — Note: ${trimmed}` : summary;

    try {
        await supabase.from('activities').insert({
            uid: user.id,
            label: 'Import',
            status,
            created_at: new Date().toISOString(),
        });
    } catch (e) {
        console.error('logSpreadsheetImport failed', e);
    }
}
