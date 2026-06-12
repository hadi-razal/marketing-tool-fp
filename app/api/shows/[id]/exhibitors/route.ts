import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';
import {
    fetchShowExhibitorFacets,
    fetchShowExhibitorsPage,
    type ExhibitorFilterSelections,
} from '@/lib/showExhibitors';

const parseFilters = (raw: string | null): ExhibitorFilterSelections => {
    const empty: ExhibitorFilterSelections = {
        year: [],
        category: [],
        industry: [],
        country: [],
        worldArea: [],
        employees: [],
    };

    if (!raw) return empty;

    try {
        const parsed = JSON.parse(raw) as Partial<ExhibitorFilterSelections>;
        return {
            year: Array.isArray(parsed.year) ? parsed.year.map(String) : [],
            category: Array.isArray(parsed.category) ? parsed.category.map(String) : [],
            industry: Array.isArray(parsed.industry) ? parsed.industry.map(String) : [],
            country: Array.isArray(parsed.country) ? parsed.country.map(String) : [],
            worldArea: Array.isArray(parsed.worldArea) ? parsed.worldArea.map(String) : [],
            employees: Array.isArray(parsed.employees) ? parsed.employees.map(String) : [],
        };
    } catch {
        return empty;
    }
};

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id: showId } = await params;
        if (!showId?.trim()) {
            return NextResponse.json({ error: 'Show id is required' }, { status: 400 });
        }

        const { searchParams } = new URL(request.url);
        const supabase = createServiceSupabaseClient();

        if (searchParams.get('facets') === '1') {
            const facets = await fetchShowExhibitorFacets(supabase, showId.trim());
            return NextResponse.json({ facets });
        }

        const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? 50), 1), 100);
        const offset = Math.max(Number(searchParams.get('offset') ?? 0), 0);
        const search = String(searchParams.get('search') ?? '').trim();
        const sortKey = String(searchParams.get('sortKey') ?? 'year');
        const sortDir = searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';
        const filters = parseFilters(searchParams.get('filters'));

        const page = await fetchShowExhibitorsPage(supabase, {
            showId: showId.trim(),
            limit,
            offset,
            search,
            sortKey,
            sortDir,
            filters,
        });

        return NextResponse.json(page, {
            headers: {
                'Cache-Control': 'private, no-store',
            },
        });
    } catch (err: unknown) {
        console.error('Fetch show exhibitors error:', err);
        const message =
            err && typeof err === 'object' && 'message' in err
                ? String((err as { message?: string }).message || 'Failed to load exhibitors')
                : err instanceof Error
                    ? err.message
                    : 'Failed to load exhibitors';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
