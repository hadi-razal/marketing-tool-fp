export interface Task {
    id: string;
    title: string;
    description?: string;
    due_date?: string;
    priority: 'High' | 'Medium' | 'Low';
    status: 'Pending' | 'In Progress' | 'Completed';
    visibility: 'Public' | 'Private';
    created_by?: string;
    created_at?: string;
    related_to?: string;
    assigned_to?: string[];
    assigned_to_profiles?: { uid: string, name: string, photo_url: string }[];
    uid?: string;
    profile_url?: string;
    closed_by?: string;
    closed_by_name?: string;
    closed_by_profile_url?: string;
}
