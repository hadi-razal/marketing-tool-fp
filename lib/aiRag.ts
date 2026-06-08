import type { SupabaseClient } from '@supabase/supabase-js';
import { isMiddleEastShow } from '@/lib/utils';

const STOP_WORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
    'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'it', 'they', 'them', 'their',
    'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom', 'whose', 'where', 'when',
    'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
    'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'also',
    'tell', 'list', 'find', 'give', 'get', 'help', 'about', 'from', 'into', 'through',
    'during', 'before', 'after', 'above', 'below', 'up', 'down', 'out', 'off', 'over', 'under',
    'again', 'further', 'then', 'once', 'here', 'there', 'please', 'thanks', 'thank', 'hello', 'hi',
    'details', 'happening', 'happens', 'happen',
]);

const COMPOUND_TERMS = [
    'middle east',
    'united arab emirates',
    'saudi arabia',
];

const MONTH_MAP: Record<string, number> = {
    january: 1, jan: 1,
    february: 2, feb: 2,
    march: 3, mar: 3,
    april: 4, apr: 4,
    may: 5,
    june: 6, jun: 6,
    july: 7, jul: 7,
    august: 8, aug: 8,
    september: 9, sep: 9, sept: 9,
    october: 10, oct: 10,
    november: 11, nov: 11,
    december: 12, dec: 12,
};

const SEARCH_LIMIT = 20;
const FALLBACK_LIMIT = 12;
const SHOW_INTENT_LIMIT = 60;

export type RagContext = {
    searchTerms: string[];
    people: Record<string, unknown>[];
    companies: Record<string, unknown>[];
    shows: Record<string, unknown>[];
    tasks: Record<string, unknown>[];
};

export type ShowQueryIntent = {
    month?: number;
    year?: number;
    middleEast: boolean;
    isShowQuery: boolean;
};

function sanitizeIlikeTerm(term: string): string {
    return term.replace(/[%_,.()'"\\]/g, '').trim();
}

export function extractSearchTerms(message: string): string[] {
    const lower = message.toLowerCase();
    const terms: string[] = [];
    const seen = new Set<string>();

    for (const phrase of COMPOUND_TERMS) {
        if (lower.includes(phrase) && !seen.has(phrase)) {
            seen.add(phrase);
            terms.push(phrase);
        }
    }

    const raw = lower
        .replace(/[^\w\s@.-]/g, ' ')
        .split(/\s+/)
        .map(sanitizeIlikeTerm)
        .filter(Boolean);

    for (const word of raw) {
        if (word.length < 2 || STOP_WORDS.has(word) || seen.has(word)) continue;
        seen.add(word);
        terms.push(word);
    }

    const emailMatches = message.match(/[\w.+-]+@[\w.-]+\.\w+/gi) || [];
    for (const email of emailMatches) {
        const normalized = email.toLowerCase();
        if (!seen.has(normalized)) {
            seen.add(normalized);
            terms.unshift(normalized);
        }
    }

    return terms.slice(0, 8);
}

export function parseShowQueryIntent(message: string): ShowQueryIntent {
    const lower = message.toLowerCase();
    let month: number | undefined;
    for (const [label, value] of Object.entries(MONTH_MAP)) {
        if (lower.includes(label)) {
            month = value;
            break;
        }
    }

    const yearMatch = lower.match(/\b(20\d{2})\b/);
    const year = yearMatch ? Number(yearMatch[1]) : undefined;

    const middleEast =
        lower.includes('middle east') ||
        lower.includes('mena') ||
        lower.includes('gcc') ||
        /\buae\b/.test(lower) ||
        /\bksa\b/.test(lower) ||
        lower.includes('dubai') ||
        lower.includes('riyadh') ||
        lower.includes('saudi');

    const isShowQuery =
        /\b(show|shows|exhibition|exhibitions|expo|event|events|fair|fairs)\b/.test(lower) ||
        month !== undefined ||
        year !== undefined ||
        middleEast;

    return { month, year, middleEast, isShowQuery };
}

function buildOrFilter(columns: string[], terms: string[]): string | null {
    const parts: string[] = [];
    for (const term of terms) {
        const safe = sanitizeIlikeTerm(term);
        if (!safe) continue;
        for (const column of columns) {
            parts.push(`${column}.ilike.%${safe}%`);
        }
    }
    return parts.length > 0 ? parts.join(',') : null;
}

async function searchTable(
    supabase: SupabaseClient,
    table: string,
    columns: string[],
    terms: string[],
    orderColumn = 'created_at',
): Promise<Record<string, unknown>[]> {
    let query = supabase.from(table).select('*');

    const orFilter = buildOrFilter(columns, terms);
    if (orFilter) {
        query = query.or(orFilter);
    }

    const { data, error } = await query
        .order(orderColumn, { ascending: false })
        .limit(terms.length > 0 ? SEARCH_LIMIT : FALLBACK_LIMIT);

    if (error) {
        console.error(`[aiRag] ${table} search error:`, error.message);
        return [];
    }

    return (data || []) as Record<string, unknown>[];
}

async function searchShows(
    supabase: SupabaseClient,
    message: string,
    terms: string[],
): Promise<Record<string, unknown>[]> {
    const intent = parseShowQueryIntent(message);

    if (intent.isShowQuery && (intent.month || intent.year || intent.middleEast)) {
        let query = supabase.from('shows').select('*').not('starting_date', 'is', null);

        if (intent.year && intent.month) {
            const pad = (n: number) => String(n).padStart(2, '0');
            const start = `${intent.year}-${pad(intent.month)}-01`;
            const end =
                intent.month === 12
                    ? `${intent.year + 1}-01-01`
                    : `${intent.year}-${pad(intent.month + 1)}-01`;
            query = query.gte('starting_date', start).lt('starting_date', end);
        } else if (intent.year) {
            query = query
                .gte('starting_date', `${intent.year}-01-01`)
                .lt('starting_date', `${intent.year + 1}-01-01`);
        }

        const { data, error } = await query
            .order('starting_date', { ascending: true })
            .limit(SHOW_INTENT_LIMIT);

        if (error) {
            console.error('[aiRag] shows intent search error:', error.message);
        } else {
            let shows = (data || []) as Record<string, unknown>[];
            if (intent.middleEast) {
                shows = shows.filter((row) => isMiddleEastShow({
                    world_area: String(row.world_area || ''),
                    country: String(row.country || ''),
                }));
            }
            if (shows.length > 0) return shows;
        }
    }

    return searchTable(
        supabase,
        'shows',
        ['name', 'event_type', 'industry', 'world_area', 'country', 'city', 'organiser', 'note'],
        terms,
        'starting_date',
    );
}

export async function retrieveSupabaseContext(
    supabase: SupabaseClient,
    message: string,
): Promise<RagContext> {
    const searchTerms = extractSearchTerms(message);

    const [people, companies, shows, tasks] = await Promise.all([
        searchTable(
            supabase,
            'people',
            ['full_name', 'first_name', 'last_name', 'title', 'organization_name', 'email', 'city', 'country', 'contact_status', 'headline', 'company_industry'],
            searchTerms,
        ),
        searchTable(
            supabase,
            'companies',
            ['name', 'industry', 'city', 'country', 'primary_domain', 'website_url', 'keywords'],
            searchTerms,
        ),
        searchShows(supabase, message, searchTerms),
        searchTable(
            supabase,
            'tasks',
            ['title', 'description', 'status', 'priority', 'related_to'],
            searchTerms,
        ),
    ]);

    return { searchTerms, people, companies, shows, tasks };
}

function personName(p: Record<string, unknown>): string {
    return String(p.full_name || p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown');
}

function formatPerson(p: Record<string, unknown>): string {
    return `- ${personName(p)}
  Title: ${p.title || 'N/A'} at ${p.organization_name || 'N/A'}
  Status: ${p.contact_status || 'N/A'}
  Location: ${[p.city, p.country].filter(Boolean).join(', ') || 'N/A'}
  Email: ${p.email || 'N/A'}
  Phone: ${p.phone || 'N/A'}
  LinkedIn: ${p.linkedin_url || p.linkedin || 'N/A'}
  Industry: ${p.company_industry || 'N/A'}`;
}

function formatCompany(c: Record<string, unknown>): string {
    return `- ${c.name || 'Unknown'}
  Industry: ${c.industry || 'N/A'}
  Location: ${[c.city, c.country].filter(Boolean).join(', ') || c.raw_address || 'N/A'}
  Website: ${c.website_url || c.primary_domain || 'N/A'}
  Phone: ${c.phone || 'N/A'}
  Employees: ${c.estimated_num_employees ?? 'N/A'}`;
}

function formatShow(s: Record<string, unknown>): string {
    return `- ${s.name || 'Unknown'}
  Date: ${s.starting_date || 'TBC'}
  Type: ${s.event_type || 'N/A'}
  Location: ${[s.city, s.country].filter(Boolean).join(', ') || 'N/A'}
  Region: ${s.world_area || 'N/A'}
  Industry: ${s.industry || 'N/A'}
  Level: ${s.level || 'N/A'}
  Organiser: ${s.organiser || 'N/A'}`;
}

function formatTask(t: Record<string, unknown>): string {
    return `- ${t.title || 'Untitled'}
  Status: ${t.status || 'N/A'} | Priority: ${t.priority || 'N/A'}
  Due: ${t.due_date || 'N/A'}
  Related to: ${t.related_to || 'N/A'}
  Description: ${t.description || 'N/A'}`;
}

export function buildRagSystemPrompt(
    context: RagContext,
    userName: string,
    userRole: string,
    originalMessage: string,
): string {
    const { searchTerms, people, companies, shows, tasks } = context;
    const intent = parseShowQueryIntent(originalMessage);
    const termsLabel = searchTerms.length > 0 ? searchTerms.join(', ') : 'recent records';

    const peopleBlock = people.length > 0
        ? people.map(formatPerson).join('\n\n')
        : 'No matching people found in Supabase for this query.';

    const companiesBlock = companies.length > 0
        ? companies.map(formatCompany).join('\n\n')
        : 'No matching companies found in Supabase for this query.';

    const showsBlock = shows.length > 0
        ? shows.map(formatShow).join('\n\n')
        : 'No matching shows found in Supabase for this query.';

    const tasksBlock = tasks.length > 0
        ? tasks.map(formatTask).join('\n\n')
        : 'No matching tasks found in Supabase for this query.';

    const intentNote = intent.isShowQuery
        ? `Show query intent: month=${intent.month ?? 'any'}, year=${intent.year ?? 'any'}, middleEast=${intent.middleEast}.`
        : '';

    return `
You are FairPlatz AI, the internal assistant of FairPlatz Designs. The company is a Dubai-based global exhibition stand design and fabrication firm working across the UAE, GCC, Europe, Asia, and Africa. FairPlatz builds exhibition booths, provides design services, production, logistics, and now also sells carpets and exhibition accessories. You support all internal teams — sales, marketing, design, production, operations, procurement, and IT — by answering questions, giving guidance, and generating content. Never mention Gemini, Google, AI models, vector search, RAG, or technical details. Always act as FairPlatz AI only.

USER CONTEXT:
User's name: "${userName || 'User'}"
User's Role: "${userRole || 'Team Member'}"

SUPABASE DATA RETRIEVAL:
The user's question was used to search the FairPlatz Supabase database (people, companies, shows, tasks).
Search terms: ${termsLabel}
${intentNote}
Retrieved: ${people.length} people, ${companies.length} companies, ${shows.length} shows, ${tasks.length} tasks.

=== PEOPLE (from Supabase) ===
${peopleBlock}

=== COMPANIES (from Supabase) ===
${companiesBlock}

=== SHOWS / EXHIBITIONS (from Supabase) ===
${showsBlock}

=== TASKS (from Supabase) ===
${tasksBlock}

RULES:
1. Prioritize answers using the Supabase data above when the user asks about leads, companies, shows, events, contacts, or tasks.
2. If the data does not contain the answer, say so clearly and offer helpful next steps (e.g. check spelling, add the record, or refine the search).
3. You may use general knowledge for exhibition/marketing advice when Supabase data is not relevant.
4. Be clear, helpful, and professional.
5. IMPORTANT: Keep answers short and concise. Use bullet points when listing multiple records.
6. When citing records, include the most useful fields (name, company, location, date, status).
7. For show listings, include every matching show from the data above with name, date, city, and country.
`.trim();
}
