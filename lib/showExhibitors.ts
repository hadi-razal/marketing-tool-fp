import type { SupabaseClient } from '@supabase/supabase-js';
import type { ShowParticipation, ShowParticipationCompany, ShowExhibitorRow } from '@/types/showParticipation';
import { formatCompanyLocation } from '@/lib/utils';

const COMPANY_SELECT =
    'id, name, logo_url, country, world_area, industry, primary_domain, estimated_num_employees';

const PARTICIPATION_SELECT =
    'id, show_id, company_id, year, booth_number, booth_size, booth_size_category, created_at';

const COMPANY_CHUNK_SIZE = 35;
export const EXHIBITOR_PAGE_SIZE = 50;

export type ExhibitorFilterSelections = {
    year: string[];
    category: string[];
    industry: string[];
    country: string[];
    worldArea: string[];
    employees: string[];
};

export type ExhibitorQueryParams = {
    showId: string;
    limit?: number;
    offset?: number;
    search?: string;
    sortKey?: string;
    sortDir?: 'asc' | 'desc';
    filters?: ExhibitorFilterSelections;
};

export type ExhibitorPageResult = {
    participations: ShowParticipation[];
    total: number;
    hasMore: boolean;
    limit: number;
    offset: number;
};

export type ExhibitorFacets = ExhibitorFilterSelections;

type BoothCategory = ShowExhibitorRow['category'];

const parseSqm = (size: string) => {
    const match = String(size).match(/(\d+(?:\.\d+)?)/);
    return match ? Number(match[1]) : 0;
};

const boothCategoryFromSqm = (sqm: number): { label: BoothCategory; order: number } => {
    if (sqm >= 150) return { label: 'Enterprise', order: 4 };
    if (sqm >= 100) return { label: 'Large', order: 3 };
    if (sqm >= 60) return { label: 'Medium', order: 2 };
    return { label: 'Small', order: 1 };
};

const boothCategoryFromDb = (raw?: string | null): { label: BoothCategory; order: number } | null => {
    if (!raw?.trim()) return null;
    const normalized = raw.trim().toLowerCase();
    if (normalized.includes('enterprise')) return { label: 'Enterprise', order: 4 };
    if (normalized.includes('large')) return { label: 'Large', order: 3 };
    if (normalized.includes('medium')) return { label: 'Medium', order: 2 };
    if (normalized.includes('small')) return { label: 'Small', order: 1 };
    const titled = raw.trim() as BoothCategory;
    const orderMap: Record<BoothCategory, number> = { Small: 1, Medium: 2, Large: 3, Enterprise: 4 };
    if (titled in orderMap) return { label: titled, order: orderMap[titled] };
    return null;
};

const employeeSizeLabel = (count: number): string => {
    if (!count || count <= 0) return 'Unknown';
    if (count <= 50) return '1–50';
    if (count <= 200) return '51–200';
    if (count <= 1000) return '201–1,000';
    return '1,000+';
};

export const mapParticipationToExhibitorRow = (row: ShowParticipation): ShowExhibitorRow | null => {
    const companyId = String(row.company_id ?? row.companies?.id ?? '').trim();
    if (!companyId) return null;

    const company = row.companies;
    const sqm = parseSqm(String(row.booth_size ?? ''));
    const categoryMeta = boothCategoryFromDb(row.booth_size_category) ?? boothCategoryFromSqm(sqm);
    const booth = String(row.booth_number ?? '').trim() || '—';
    const sizeRaw = String(row.booth_size ?? '').trim();
    const size = sizeRaw || (sqm > 0 ? `${sqm} sqm` : '—');

    return {
        id: String(row.id),
        companyId,
        company: String(company?.name ?? 'Unknown Company'),
        year: String(row.year ?? ''),
        booth,
        size,
        sqm,
        category: categoryMeta.label,
        categoryOrder: categoryMeta.order,
        logoUrl: String(company?.logo_url ?? ''),
        location: formatCompanyLocation(company ?? {}),
        country: String(company?.country ?? ''),
        worldArea: String(company?.world_area ?? ''),
        industry: String(company?.industry ?? ''),
        domain: String(company?.primary_domain ?? ''),
        employees: Number(company?.estimated_num_employees ?? 0),
    };
};

const EMPTY_FILTERS: ExhibitorFilterSelections = {
    year: [],
    category: [],
    industry: [],
    country: [],
    worldArea: [],
    employees: [],
};

export const hasActiveExhibitorQuery = (params: ExhibitorQueryParams): boolean => {
    const search = String(params.search ?? '').trim();
    const sortKey = String(params.sortKey ?? '');
    const sortDir = params.sortDir ?? 'desc';
    const filters = params.filters ?? EMPTY_FILTERS;

    if (search) return true;
    if (sortKey && !(sortKey === 'year' && sortDir === 'desc')) return true;
    return Object.values(filters).some((values) => values.length > 0);
};

const applyExhibitorFilters = (
    rows: ShowExhibitorRow[],
    params: ExhibitorQueryParams,
): ShowExhibitorRow[] => {
    const search = String(params.search ?? '').trim().toLowerCase();
    const filters = params.filters ?? EMPTY_FILTERS;

    return rows.filter((ex) => {
        if (search) {
            const matchesSearch =
                ex.company.toLowerCase().includes(search) ||
                ex.booth.toLowerCase().includes(search) ||
                ex.year.includes(search) ||
                ex.category.toLowerCase().includes(search) ||
                ex.size.toLowerCase().includes(search) ||
                ex.industry.toLowerCase().includes(search) ||
                ex.location.toLowerCase().includes(search) ||
                ex.domain.toLowerCase().includes(search);
            if (!matchesSearch) return false;
        }

        if (filters.year.length > 0 && !filters.year.includes(ex.year)) return false;
        if (filters.category.length > 0 && !filters.category.includes(ex.category)) return false;
        if (filters.industry.length > 0 && !filters.industry.includes(ex.industry)) return false;
        if (filters.country.length > 0 && !filters.country.includes(ex.country)) return false;
        if (filters.worldArea.length > 0 && !filters.worldArea.includes(ex.worldArea)) return false;
        if (filters.employees.length > 0 && !filters.employees.includes(employeeSizeLabel(ex.employees))) return false;

        return true;
    });
};

const applyExhibitorSort = (
    rows: ShowExhibitorRow[],
    sortKey: string,
    sortDir: 'asc' | 'desc',
): ShowExhibitorRow[] => {
    if (!sortKey) return rows;

    return [...rows].sort((a, b) => {
        const aVal = a[sortKey as keyof ShowExhibitorRow];
        const bVal = b[sortKey as keyof ShowExhibitorRow];

        if (sortKey === 'size' || sortKey === 'sqm') {
            const aNum = sortKey === 'sqm' ? a.sqm : parseSqm(String(aVal));
            const bNum = sortKey === 'sqm' ? b.sqm : parseSqm(String(bVal));
            return sortDir === 'asc' ? aNum - bNum : bNum - aNum;
        }

        if (sortKey === 'category') {
            return sortDir === 'asc'
                ? a.categoryOrder - b.categoryOrder
                : b.categoryOrder - a.categoryOrder;
        }

        const cmp = String(aVal).localeCompare(String(bVal));
        return sortDir === 'asc' ? cmp : -cmp;
    });
};

const participationSortColumn = (sortKey: string): string => {
    if (sortKey === 'booth') return 'booth_number';
    if (sortKey === 'size') return 'booth_size';
    if (sortKey === 'category') return 'booth_size_category';
    return 'year';
};

const isMissingRpcError = (error: { code?: string; message?: string } | null) => {
    if (!error) return false;
    const code = String(error.code ?? '');
    const message = String(error.message ?? '').toLowerCase();
    return (
        code === 'PGRST202' ||
        code === '42883' ||
        message.includes('could not find the function') ||
        message.includes('does not exist')
    );
};

export async function fetchCompaniesByIds(
    supabase: SupabaseClient,
    companyIds: string[],
): Promise<Map<string, ShowParticipationCompany>> {
    const uniqueIds = [...new Set(companyIds.map((id) => id.trim()).filter(Boolean))];
    const companyMap = new Map<string, ShowParticipationCompany>();

    if (uniqueIds.length === 0) return companyMap;

    for (let i = 0; i < uniqueIds.length; i += COMPANY_CHUNK_SIZE) {
        const chunk = uniqueIds.slice(i, i + COMPANY_CHUNK_SIZE);
        const { data, error } = await supabase
            .from('companies')
            .select(COMPANY_SELECT)
            .in('id', chunk);

        if (error) throw error;

        for (const company of data ?? []) {
            companyMap.set(String(company.id), company as ShowParticipationCompany);
        }
    }

    return companyMap;
}

const attachCompanies = (
    participationRows: Array<Record<string, unknown>>,
    companyMap: Map<string, ShowParticipationCompany>,
): ShowParticipation[] => (
    participationRows.map((row) => ({
        ...row,
        companies: row.company_id
            ? companyMap.get(String(row.company_id)) ?? null
            : null,
    })) as ShowParticipation[]
);

async function fetchParticipationsDbPage(
    supabase: SupabaseClient,
    params: ExhibitorQueryParams,
): Promise<ExhibitorPageResult> {
    const limit = params.limit ?? EXHIBITOR_PAGE_SIZE;
    const offset = params.offset ?? 0;
    const sortKey = params.sortKey || 'year';
    const sortDir = params.sortDir ?? 'desc';
    const sortColumn = participationSortColumn(sortKey);

    const { data, error, count } = await supabase
        .from('show_participation')
        .select(PARTICIPATION_SELECT, { count: 'exact' })
        .eq('show_id', params.showId)
        .not('company_id', 'is', null)
        .order(sortColumn, { ascending: sortDir === 'asc' })
        .range(offset, offset + limit - 1);

    if (error) throw error;

    const participationRows = data ?? [];
    const companyIds = participationRows
        .map((row) => String(row.company_id ?? '').trim())
        .filter(Boolean);
    const companyMap = await fetchCompaniesByIds(supabase, companyIds);
    const participations = attachCompanies(participationRows, companyMap);
    const total = count ?? 0;

    return {
        participations,
        total,
        hasMore: offset + participations.length < total,
        limit,
        offset,
    };
}

async function fetchAllParticipations(
    supabase: SupabaseClient,
    showId: string,
): Promise<ShowParticipation[]> {
    const { data: rows, error } = await supabase
        .from('show_participation')
        .select(PARTICIPATION_SELECT)
        .eq('show_id', showId)
        .not('company_id', 'is', null)
        .order('year', { ascending: false });

    if (error) throw error;

    const participationRows = rows ?? [];
    const companyIds = participationRows
        .map((row) => String(row.company_id ?? '').trim())
        .filter(Boolean);
    const companyMap = await fetchCompaniesByIds(supabase, companyIds);
    return attachCompanies(participationRows, companyMap);
}

async function fetchShowExhibitorsPageViaRpc(
    supabase: SupabaseClient,
    params: ExhibitorQueryParams,
): Promise<ExhibitorPageResult | null> {
    const { data, error } = await supabase.rpc('get_show_exhibitors_page', {
        p_show_id: params.showId,
        p_limit: params.limit ?? EXHIBITOR_PAGE_SIZE,
        p_offset: params.offset ?? 0,
        p_search: params.search ?? '',
        p_sort_key: params.sortKey ?? 'year',
        p_sort_dir: params.sortDir ?? 'desc',
        p_filters: params.filters ?? EMPTY_FILTERS,
    });

    if (error) {
        if (isMissingRpcError(error)) return null;
        throw error;
    }

    if (!data || typeof data !== 'object') {
        return {
            participations: [],
            total: 0,
            hasMore: false,
            limit: params.limit ?? EXHIBITOR_PAGE_SIZE,
            offset: params.offset ?? 0,
        };
    }

    const payload = data as { rows?: ShowParticipation[]; total?: number };
    const participations = Array.isArray(payload.rows) ? payload.rows : [];
    const total = Number(payload.total ?? 0);
    const limit = params.limit ?? EXHIBITOR_PAGE_SIZE;
    const offset = params.offset ?? 0;

    return {
        participations,
        total,
        hasMore: offset + participations.length < total,
        limit,
        offset,
    };
}

async function fetchShowExhibitorsPageViaQueries(
    supabase: SupabaseClient,
    params: ExhibitorQueryParams,
): Promise<ExhibitorPageResult> {
    const limit = params.limit ?? EXHIBITOR_PAGE_SIZE;
    const offset = params.offset ?? 0;
    const sortKey = params.sortKey || 'year';
    const sortDir = params.sortDir ?? 'desc';

    if (!hasActiveExhibitorQuery(params)) {
        return fetchParticipationsDbPage(supabase, params);
    }

    const allParticipations = await fetchAllParticipations(supabase, params.showId);
    const participationById = new Map(allParticipations.map((row) => [String(row.id), row]));

    const rows = allParticipations
        .map((row) => mapParticipationToExhibitorRow(row))
        .filter((row): row is ShowExhibitorRow => row !== null);

    const filtered = applyExhibitorFilters(rows, params);
    const sorted = applyExhibitorSort(filtered, sortKey, sortDir);
    const pageRows = sorted.slice(offset, offset + limit);
    const participations = pageRows
        .map((row) => participationById.get(row.id))
        .filter((row): row is ShowParticipation => Boolean(row));

    return {
        participations,
        total: sorted.length,
        hasMore: offset + pageRows.length < sorted.length,
        limit,
        offset,
    };
}

export async function fetchShowExhibitorsPage(
    supabase: SupabaseClient,
    params: ExhibitorQueryParams,
): Promise<ExhibitorPageResult> {
    const rpcPage = await fetchShowExhibitorsPageViaRpc(supabase, params);
    if (rpcPage !== null) return rpcPage;
    return fetchShowExhibitorsPageViaQueries(supabase, params);
}

export async function fetchShowExhibitorFacets(
    supabase: SupabaseClient,
    showId: string,
): Promise<ExhibitorFacets> {
    const { data, error } = await supabase.rpc('get_show_exhibitor_facets', {
        p_show_id: showId,
    });

    if (!error && data && typeof data === 'object') {
        const facets = data as ExhibitorFacets;
        return {
            year: Array.isArray(facets.year) ? facets.year : [],
            category: Array.isArray(facets.category) ? facets.category : [],
            industry: Array.isArray(facets.industry) ? facets.industry : [],
            country: Array.isArray(facets.country) ? facets.country : [],
            worldArea: Array.isArray(facets.worldArea) ? facets.worldArea : [],
            employees: Array.isArray(facets.employees) ? facets.employees : [],
        };
    }

    if (error && !isMissingRpcError(error)) throw error;

    const allParticipations = await fetchAllParticipations(supabase, showId);
    const rows = allParticipations
        .map((row) => mapParticipationToExhibitorRow(row))
        .filter((row): row is ShowExhibitorRow => row !== null);

    const unique = (getValue: (row: ShowExhibitorRow) => string) => {
        const set = new Set<string>();
        rows.forEach((row) => {
            const val = getValue(row).trim();
            if (val) set.add(val);
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    };

    return {
        year: unique((row) => row.year),
        category: unique((row) => row.category),
        industry: unique((row) => row.industry),
        country: unique((row) => row.country),
        worldArea: unique((row) => row.worldArea),
        employees: ['1–50', '51–200', '201–1,000', '1,000+', 'Unknown'].filter((label) =>
            rows.some((row) => employeeSizeLabel(row.employees) === label),
        ),
    };
}
