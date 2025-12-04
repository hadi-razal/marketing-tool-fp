export interface Task {
    id: string;
    title: string;
    description?: string;
    due_date?: string;
    priority: 'High' | 'Medium' | 'Low';
    status: 'Pending' | 'In Progress' | 'Completed';
    visibility: 'Public' | 'Private';
    created_by?: string;
    related_to?: string;
    created_at?: string;
    uid?: string;
}
