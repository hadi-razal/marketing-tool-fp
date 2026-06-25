'use client';

import { ShowsTable } from '@/components/Zoho/ShowsTable';

export default function ShowsPage() {
    return (
        <div className="-m-4 flex h-[calc(100%+2rem)] flex-col overflow-hidden lg:-m-6 lg:h-[calc(100%+3rem)]">
            <ShowsTable />
        </div>
    );
}
