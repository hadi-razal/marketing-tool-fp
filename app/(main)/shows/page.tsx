'use client';

import { ShowsTable } from '@/components/Zoho/ShowsTable';

export default function ShowsPage() {
    return (
        <div className="h-full overflow-y-auto custom-scrollbar">
            <div className="mx-auto w-full max-w-9xl px-2 py-6 sm:px-3">
                <ShowsTable />
            </div>
        </div>
    );
}
