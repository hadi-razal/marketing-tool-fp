import * as XLSX from 'xlsx';

export type SpreadsheetRow = Record<string, string>;

function stripBom(text: string): string {
    return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** First row = headers; following rows = values. Skips fully empty rows. */
export function matrixToObjects(matrix: (string | number | boolean | null | undefined)[][]): SpreadsheetRow[] {
    if (!matrix.length) return [];
    const headers = matrix[0].map((h) => String(h ?? '').replace(/^\uFEFF/, '').trim());
    const out: SpreadsheetRow[] = [];
    for (let i = 1; i < matrix.length; i++) {
        const r = matrix[i];
        if (!r) continue;
        const obj: SpreadsheetRow = {};
        let any = false;
        headers.forEach((h, j) => {
            if (!h) return;
            const raw = r[j];
            let v = '';
            const rawVal = raw as unknown;
            if (rawVal instanceof Date && !isNaN(rawVal.getTime())) {
                const y = rawVal.getFullYear();
                const m = String(rawVal.getMonth() + 1).padStart(2, '0');
                const d = String(rawVal.getDate()).padStart(2, '0');
                v = `${y}-${m}-${d}`;
            } else if (typeof raw === 'number' && raw > 20000 && raw < 60000) {
                const epoch = new Date(Date.UTC(1899, 11, 30));
                const ms = epoch.getTime() + raw * 86400000;
                const dt = new Date(ms);
                if (!isNaN(dt.getTime())) {
                    const y = dt.getUTCFullYear();
                    const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
                    const d = String(dt.getUTCDate()).padStart(2, '0');
                    v = `${y}-${m}-${d}`;
                }
            } else {
                v = String(raw ?? '').trim();
            }
            if (v) any = true;
            obj[h] = v;
        });
        if (any) out.push(obj);
    }
    return out;
}

function normKey(k: string): string {
    return k.replace(/^\uFEFF/, '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Case- and spacing-insensitive column lookup. */
export function rowGet(row: SpreadsheetRow, ...candidates: string[]): string {
    const map = new Map<string, string>();
    for (const [k, v] of Object.entries(row)) {
        map.set(normKey(k), v);
        map.set(normKey(k).replace(/[^a-z0-9]/g, ''), v);
    }
    for (const c of candidates) {
        const n1 = normKey(c);
        if (map.has(n1)) {
            const val = map.get(n1);
            if (val) return val;
        }
        const n2 = normKey(c).replace(/[^a-z0-9]/g, '');
        for (const [nk, val] of map) {
            if (nk.replace(/[^a-z0-9]/g, '') === n2 && val) return val;
        }
    }
    return '';
}

export async function parseSpreadsheetFile(file: File): Promise<SpreadsheetRow[]> {
    const name = file.name.toLowerCase();
    const isCsv = name.endsWith('.csv') || file.type === 'text/csv';

    let matrix: (string | number | boolean | null | undefined)[][];

    if (isCsv) {
        const text = stripBom(await file.text());
        const wb = XLSX.read(text, { type: 'string' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        matrix = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false }) as (
            | string
            | number
            | boolean
            | null
            | undefined
        )[][];
    } else {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        matrix = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false }) as (
            | string
            | number
            | boolean
            | null
            | undefined
        )[][];
    }

    return matrixToObjects(matrix);
}

function cleanDomain(input: string): string {
    return input
        .replace(/^https?:\/\//i, '')
        .split('/')[0]
        .replace(/^www\./i, '')
        .trim()
        .toLowerCase();
}

function parseEmployeeBand(s: string): number | undefined {
    if (!s) return undefined;
    const t = s.trim().toLowerCase();
    const m = t.match(/(\d+)\s*[-–]\s*(\d+)/);
    if (m) return Math.round((parseInt(m[1], 10) + parseInt(m[2], 10)) / 2);
    const n = parseInt(t.replace(/[^\d]/g, ''), 10);
    return Number.isFinite(n) ? n : undefined;
}

export function formatStartingDateForZoho(dateStr: string): string | undefined {
    if (!dateStr?.trim()) return undefined;
    const s = dateStr.trim();
    let d: Date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const [y, mo, da] = s.split('-').map(Number);
        d = new Date(y, mo - 1, da);
    } else {
        d = new Date(s);
    }
    if (isNaN(d.getTime())) return undefined;
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
}

/** ISO `YYYY-MM-DD` for Postgres `date` columns; undefined if unparseable. */
export function formatDateForSupabase(dateStr: string): string | undefined {
    if (!dateStr?.trim()) return undefined;
    const s = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(s);
    if (isNaN(d.getTime())) return undefined;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
}

function normalizeUrl(input: string): string {
    const v = input.trim();
    if (!v) return '';
    return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

/**
 * Maps spreadsheet rows directly to the Supabase `shows` table schema.
 * Skips rows without a show name. Caller supplies the `id` (text PK).
 * Column matching is flexible (case/spacing) and accepts both snake_case
 * (matching the DB) and the older Zoho-style headers.
 */
export type ShowImportRow = {
    name: string;
    starting_date: string | null;
    event_type: string;
    industry: string;
    level: string;
    world_area: string;
    country: string;
    city: string;
    frequency: string;
    organiser: string;
    website: string;
    tags: string;
    note: string;
    exhibitor_list_link: string;
};

export function rowsToShowSupabaseRows(rows: SpreadsheetRow[]): ShowImportRow[] {
    return rows
        .map((row): ShowImportRow | null => {
            const name = rowGet(row, 'name', 'Event_Name', 'event name', 'Event', 'Name', 'Show', 'Show Name', 'Show_Name');
            if (!name) return null;

            const startingRaw = rowGet(row, 'starting_date', 'Starting_Date', 'starting date', 'Date', 'Start', 'Start Date');
            const websiteRaw = rowGet(row, 'website', 'Website', 'url', 'URL', 'Site');
            const exhibitorLinkRaw = rowGet(
                row,
                'exhibitor_list_link',
                'exhibitor list link',
                'Exhibitor_List_Link',
                'Exhibitor List Link',
                'Exhibitor List',
            );

            return {
                name,
                starting_date: startingRaw ? formatDateForSupabase(startingRaw) ?? null : null,
                event_type: rowGet(row, 'event_type', 'Event_Type', 'event type', 'Type'),
                industry: rowGet(row, 'industry', 'Industry', 'sector'),
                level: rowGet(row, 'level', 'Level'),
                world_area: rowGet(row, 'world_area', 'World_Area', 'world area', 'Area', 'Region'),
                country: rowGet(row, 'country', 'Country'),
                city: rowGet(row, 'city', 'City'),
                frequency: rowGet(row, 'frequency', 'Frequency'),
                organiser: rowGet(row, 'organiser', 'Organiser', 'organizer', 'Organizer', 'Host'),
                website: normalizeUrl(websiteRaw),
                tags: rowGet(row, 'tags', 'Tags', 'tag', 'Tag'),
                note: rowGet(row, 'note', 'Note', 'notes', 'Notes'),
                exhibitor_list_link: normalizeUrl(exhibitorLinkRaw),
            };
        })
        .filter((r): r is ShowImportRow => r !== null);
}

export function rowsToImportedPeople(rows: SpreadsheetRow[], idPrefix = 'import_person'): any[] {
    const ts = Date.now();
    return rows.map((row, i) => {
        const name = rowGet(row, 'name', 'full name', 'full_name', 'Full Name', 'Contact');
        const first = rowGet(row, 'first_name', 'first name', 'First Name', 'Given Name');
        const last = rowGet(row, 'last_name', 'last name', 'Last Name', 'Surname', 'Family Name');
        const fullName = name || `${first} ${last}`.trim() || `Import ${i + 1}`;
        const nameParts = fullName.split(/\s+/);
        const fn = first || nameParts[0] || '';
        const ln = last || nameParts.slice(1).join(' ') || '';
        const company = rowGet(row, 'company', 'organization', 'organization_name', 'employer', 'Company');
        const title = rowGet(row, 'title', 'job title', 'role', 'position', 'Title');
        const email = rowGet(row, 'email', 'e-mail', 'Email');
        const phone = rowGet(row, 'phone', 'mobile', 'tel', 'Phone');
        const linkedin = rowGet(row, 'linkedin', 'linkedin_url', 'LinkedIn', 'linkedin url');
        const location = rowGet(row, 'location', 'city', 'address', 'Location');
        const website = rowGet(row, 'website', 'company_website', 'domain', 'Website');

        return {
            id: `${idPrefix}_${ts}_${i}`,
            name: fullName,
            first_name: fn,
            last_name: ln,
            title: title || undefined,
            company,
            organization_name: company,
            email: email || 'N/A',
            phone: phone || 'N/A',
            linkedin: linkedin || undefined,
            linkedin_url: linkedin || undefined,
            location: location || undefined,
            formatted_address: location || undefined,
            website: website ? cleanDomain(website) : undefined,
            company_website: website ? cleanDomain(website) : undefined,
            isSaved: false,
            status: 'Imported',
            score: 50,
            saved_from: 'import',
        };
    });
}

export function rowsToImportedCompanies(rows: SpreadsheetRow[], idPrefix = 'import_company'): any[] {
    const ts = Date.now();
    return rows.map((row, i) => {
        const name =
            rowGet(row, 'company', 'company name', 'name', 'organization', 'Organization') || `Company ${i + 1}`;
        const websiteRaw = rowGet(row, 'website', 'domain', 'url', 'primary_domain', 'Website');
        const domain = websiteRaw ? cleanDomain(websiteRaw) : '';
        const industry = rowGet(row, 'industry', 'sector', 'Industry');
        const location = rowGet(row, 'location', 'address', 'hq', 'Location', 'City', 'Country');
        const employeesRaw = rowGet(row, 'employees', 'employee count', 'size', 'Employees', 'Headcount');
        const revenue = rowGet(row, 'revenue', 'Revenue');
        const founded = rowGet(row, 'founded', 'founded year', 'year', 'Founded');
        const desc = rowGet(row, 'description', 'about', 'Description');
        const linkedin = rowGet(row, 'linkedin', 'linkedin_url', 'LinkedIn');
        const fy = founded ? parseInt(founded.replace(/[^\d]/g, ''), 10) : undefined;

        return {
            id: `${idPrefix}_${ts}_${i}`,
            name,
            website: domain ? `https://${domain}` : websiteRaw || undefined,
            website_url: domain ? `https://${domain}` : websiteRaw || undefined,
            primary_domain: domain || undefined,
            industry: industry || undefined,
            location: location || undefined,
            raw_address: location || undefined,
            employees: parseEmployeeBand(employeesRaw),
            estimated_num_employees: parseEmployeeBand(employeesRaw),
            revenue: revenue || undefined,
            organization_revenue_printed: revenue || undefined,
            description: desc || undefined,
            short_description: desc || undefined,
            linkedin: linkedin || undefined,
            linkedin_url: linkedin || undefined,
            founded_year: Number.isFinite(fy) ? fy : undefined,
            isSaved: false,
        };
    });
}

/** Payloads for `zohoApi.addRecord('Show_Details', payload)` — skips rows without an event name. */
export function rowsToShowZohoPayloads(rows: SpreadsheetRow[]): Record<string, string>[] {
    return rows
        .map((row) => {
            const Event_Name =
                rowGet(row, 'Event_Name', 'event name', 'Event', 'Name', 'Show', 'Show Name') || '';
            if (!Event_Name) return null;
            const payload: Record<string, string> = { Event_Name };
            const Event_Type = rowGet(row, 'Event_Type', 'event type', 'Type');
            const Industry = rowGet(row, 'Industry', 'industry');
            const Level = rowGet(row, 'Level', 'level');
            const World_Area = rowGet(row, 'World_Area', 'world area', 'Area', 'Region');
            const Country = rowGet(row, 'Country', 'country');
            const City = rowGet(row, 'City', 'city');
            const Frequency = rowGet(row, 'Frequency', 'frequency');
            const Starting_Date = rowGet(row, 'Starting_Date', 'starting date', 'Date', 'Start', 'Start Date');

            if (Event_Type) payload.Event_Type = Event_Type;
            if (Industry) payload.Industry = Industry;
            if (Level) payload.Level = Level;
            if (World_Area) payload.World_Area = World_Area;
            if (Country) payload.Country = Country;
            if (City) payload.City = City;
            if (Frequency) payload.Frequency = Frequency;
            if (Starting_Date) {
                const zd = formatStartingDateForZoho(Starting_Date);
                if (zd) payload.Starting_Date = zd;
            }
            return payload;
        })
        .filter((p): p is Record<string, string> => p !== null);
}

/** Payloads for exhibitor create (`Exhibitor` / `Exhibitor_List`). */
export function rowsToExhibitorZohoPayloads(rows: SpreadsheetRow[]): Record<string, string>[] {
    return rows
        .map((row) => {
            const Company = rowGet(row, 'Company', 'company', 'Company Name', 'Organization') || '';
            if (!Company) return null;
            const payload: Record<string, string> = { Company };
            const Website = rowGet(row, 'Website', 'website', 'url', 'Domain');
            const Company_Type = rowGet(row, 'Company_Type', 'company type', 'Type');
            const City = rowGet(row, 'City', 'city');
            const Country = rowGet(row, 'Country', 'country');
            const worldArea = rowGet(row, 'World_Area', 'world area', 'Area', 'Region');
            const Contact_Details = rowGet(row, 'Contact_Details', 'contact', 'contact details');
            const Company_Linkedin = rowGet(row, 'Company_Linkedin', 'linkedin', 'LinkedIn');
            const FP_Level = rowGet(row, 'FP_Level', 'fp level', 'Level');
            const Events = rowGet(row, 'Events', 'events');

            if (Website) {
                const w = Website.trim();
                payload.Website = /^https?:\/\//i.test(w) ? w : `https://${w}`;
            }
            if (Company_Type) payload.Company_Type = Company_Type;
            if (City) payload.City = City;
            if (Country) payload.Country = Country;
            if (worldArea) payload.World_Area = worldArea;
            if (Contact_Details) payload.Contact_Details = Contact_Details;
            if (Company_Linkedin) {
                const l = Company_Linkedin.trim();
                payload.Company_Linkedin = /^https?:\/\//i.test(l) ? l : `https://${l}`;
            }
            if (FP_Level) payload.FP_Level = FP_Level;
            if (Events) payload.Events = Events;
            return payload;
        })
        .filter((p): p is Record<string, string> => p !== null);
}
