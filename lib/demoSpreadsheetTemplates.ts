/**
 * Demo CSV files for spreadsheet imports. First row = headers (matches `lib/importSpreadsheet` column matching).
 * Filenames are stable and human-readable for users saving templates locally.
 */

export const FP_MARKETING_IMPORT_TEMPLATE_FILENAMES = {
    people: 'Fairplatz-Marketing_Import-Template_People.csv',
    companies: 'Fairplatz-Marketing_Import-Template_Companies.csv',
    showsZoho: 'Fairplatz-Marketing_Import-Template_Shows-for-Zoho.csv',
    exhibitorsZoho: 'Fairplatz-Marketing_Import-Template_Exhibitors-for-Zoho.csv',
} as const;

/** Example row values use only ASCII-friendly placeholders (no real PII). */
const PEOPLE_CSV = [
    'Name,Email,Title,Company,Phone,LinkedIn,Location,Website',
    'Alex Sample,alex.sample@example.com,Head of Partnerships,Sample Logistics GmbH,+49 89 00000000,https://www.linkedin.com/in/alex-sample,Munich Germany,sample-logistics.example',
].join('\n');

const COMPANIES_CSV = [
    'Company Name,Website,Industry,Location,Employees,Revenue,Founded,Description,LinkedIn',
    'Sample Robotics AG,https://sample-robotics.example,Industrial automation,"Stuttgart, Germany",201-500,25M EUR - 50M EUR,2012,Automation systems for manufacturing lines,https://www.linkedin.com/company/sample-robotics-ag',
].join('\n');

const SHOWS_CSV = [
    'Event_Name,Event_Type,Industry,Level,World_Area,Country,City,Frequency,Starting_Date',
    'Sample Expo Europe,Trade show,Manufacturing,2,Europe,Germany,Frankfurt,Annual,2027-03-18',
].join('\n');

const EXHIBITORS_CSV = [
    'Company,Website,Company_Type,City,Country,World_Area,Contact_Details,Company_Linkedin,FP_Level,Events',
    'Sample Booth GmbH,https://sample-booth.example,Exhibitor,Cologne,Germany,Europe,events@sample-booth.example,https://www.linkedin.com/company/sample-booth,2,Sample Expo Europe',
].join('\n');

export const fpMarketingImportDemoTemplates = {
    people: { fileName: FP_MARKETING_IMPORT_TEMPLATE_FILENAMES.people, csv: PEOPLE_CSV },
    companies: { fileName: FP_MARKETING_IMPORT_TEMPLATE_FILENAMES.companies, csv: COMPANIES_CSV },
    showsZoho: { fileName: FP_MARKETING_IMPORT_TEMPLATE_FILENAMES.showsZoho, csv: SHOWS_CSV },
    exhibitorsZoho: { fileName: FP_MARKETING_IMPORT_TEMPLATE_FILENAMES.exhibitorsZoho, csv: EXHIBITORS_CSV },
} as const;

export type FpMarketingImportDemoTemplateKey = keyof typeof fpMarketingImportDemoTemplates;

/** UTF-8 BOM so Excel on Windows opens special characters and umlauts reliably. */
export function downloadUtf8CsvFile(fileName: string, csvBody: string): void {
    const blob = new Blob([`\uFEFF${csvBody}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}
