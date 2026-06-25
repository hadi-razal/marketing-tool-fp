import React, { useState, useEffect } from 'react';
import {
    Save,
    Calendar,
    Globe,
    MapPin,
    Link2,
    Building2,
    Tag,
    X,
    CalendarDays,
    FileText,
} from 'lucide-react';
import { SoftInput } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { createClient } from '@/lib/supabase';
import { toast } from 'sonner';
import { INDUSTRIES } from '@/lib/industries';
import { normalizeShowWebsiteUrl } from '@/lib/showWebsite';

const textOrNull = (value: string) => {
    const trimmed = value.trim();
    return trimmed || null;
};

const getErrorMessage = (error: unknown) => {
    if (error && typeof error === 'object' && 'message' in error) {
        return String((error as { message: string }).message);
    }
    if (error instanceof Error) return error.message;
    return 'Failed to save show';
};

interface ShowFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: Record<string, unknown>;
}

const EVENT_TYPES = [
    'Exhibition',
    'Trade Fair',
    'Expo',
    'Conference',
    'Summit',
    'Congress',
    'Forum',
    'Festival',
];

const WORLD_AREAS = [
    'Middle East',
    'Europe',
    'Asia',
    'Africa',
    'North America',
    'South America',
    'Oceania',
    'Global',
];

const FREQUENCIES = ['Annual', '2Y', '3Y', '4Y'];

const LEVELS = ['Tier 1', 'Tier 2', 'Tier 3', 'Regional', 'International'];

type ShowFormState = {
    Event_Name: string;
    Event_Type: string;
    Starting_Date: string;
    Industry: string;
    Level: string;
    World_Area: string;
    Country: string;
    City: string;
    Frequency: string;
    Organiser: string;
    Show_Website: string;
    Tags: string;
    Note: string;
    Exhibitor_List_Link: string;
};

const EMPTY_FORM: ShowFormState = {
    Event_Name: '',
    Event_Type: '',
    Starting_Date: '',
    Industry: '',
    Level: '',
    World_Area: '',
    Country: '',
    City: '',
    Frequency: '',
    Organiser: '',
    Show_Website: '',
    Tags: '',
    Note: '',
    Exhibitor_List_Link: '',
};

const extractValue = (val: unknown): string => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
        if ('url' in (val as object)) return String((val as { url?: string }).url || '');
        if ('name' in (val as object)) return String((val as { name?: string }).name || '');
        if (Array.isArray(val)) return extractValue(val[0]);
        return String(val);
    }
    return String(val);
};

const pick = (data: Record<string, unknown> | undefined, ...keys: string[]): string => {
    if (!data) return '';
    for (const key of keys) {
        const value = extractValue(data[key]);
        if (value) return value;
    }
    return '';
};

const formatDateForInput = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        if (Number.isNaN(date.getTime())) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch {
        return '';
    }
};

const formFromData = (data?: Record<string, unknown>): ShowFormState => ({
    Event_Name: pick(data, 'name', 'Event_Name', 'event_name', 'Event', 'Name'),
    Event_Type: pick(data, 'event_type', 'Event_Type', 'type', 'Type'),
    Starting_Date: formatDateForInput(pick(data, 'starting_date', 'Starting_Date', 'date', 'Date')),
    Industry: pick(data, 'industry', 'Industry'),
    Level: pick(data, 'level', 'Level'),
    World_Area: pick(data, 'world_area', 'World_Area', 'Area'),
    Country: pick(data, 'country', 'Country'),
    City: pick(data, 'city', 'City'),
    Frequency: pick(data, 'frequency', 'Frequency'),
    Organiser: pick(data, 'organiser', 'Organiser'),
    Show_Website: pick(data, 'website', 'Website', 'show_website', 'Show_Website', 'event_website', 'Event_Website'),
    Tags: pick(data, 'tags', 'Tags'),
    Note: pick(data, 'note', 'Note', 'Note1'),
    Exhibitor_List_Link: pick(data, 'exhibitor_list_link', 'Exhibitor_List_Link'),
});

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({
    icon,
    title,
    children,
}) => (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-950/5">
        <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                {icon}
            </span>
            <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        </div>
        {children}
    </section>
);

const SoftSelect: React.FC<{
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    placeholder?: string;
}> = ({ label, value, onChange, options, placeholder = 'Select…' }) => (
    <div className="space-y-2 w-full">
        <label className="ml-1 text-xs font-bold uppercase tracking-wider text-zinc-500">{label}</label>
        <div className="relative">
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-xl border border-zinc-200 bg-white px-4 py-3.5 text-zinc-950 shadow-sm outline-none transition-all duration-200 hover:border-zinc-300 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            >
                <option value="">{placeholder}</option>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </div>
        </div>
    </div>
);

const SoftTextarea: React.FC<{
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    rows?: number;
}> = ({ label, value, onChange, placeholder, rows = 4 }) => (
    <div className="space-y-2 w-full">
        <label className="ml-1 text-xs font-bold uppercase tracking-wider text-zinc-500">{label}</label>
        <textarea
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            rows={rows}
            className="w-full resize-y rounded-xl border border-zinc-200 bg-white px-4 py-3.5 text-zinc-950 shadow-sm outline-none transition-all duration-200 placeholder:text-zinc-400 hover:border-zinc-300 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
        />
    </div>
);

export const ShowFormModal: React.FC<ShowFormModalProps> = ({ isOpen, onClose, onSuccess, initialData }) => {
    const supabase = createClient();
    const [formData, setFormData] = useState<ShowFormState>(EMPTY_FORM);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setFormData(EMPTY_FORM);
            return;
        }
        setFormData(initialData ? formFromData(initialData) : EMPTY_FORM);
    }, [initialData, isOpen]);

    const setField = <K extends keyof ShowFormState>(key: K, value: ShowFormState[K]) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async () => {
        if (!formData.Event_Name.trim()) {
            toast.error('Event name is required');
            return;
        }

        setLoading(true);
        try {
            const submitData = {
                name: formData.Event_Name.trim(),
                event_type: textOrNull(formData.Event_Type),
                starting_date: formData.Starting_Date || null,
                industry: textOrNull(formData.Industry),
                level: textOrNull(formData.Level),
                world_area: textOrNull(formData.World_Area),
                country: textOrNull(formData.Country),
                city: textOrNull(formData.City),
                frequency: textOrNull(formData.Frequency),
                organiser: textOrNull(formData.Organiser),
                website: textOrNull(normalizeShowWebsiteUrl(formData.Show_Website)),
                tags: textOrNull(formData.Tags),
                note: textOrNull(formData.Note),
                exhibitor_list_link: textOrNull(normalizeShowWebsiteUrl(formData.Exhibitor_List_Link)),
            };

            const recordId = initialData?.id || initialData?.ID || null;
            if (recordId) {
                const updateRes = await supabase.from('shows').update(submitData).eq('id', recordId);
                if (updateRes.error) {
                    const fallbackRes = await supabase.from('shows').update(submitData).eq('ID', recordId);
                    if (fallbackRes.error) throw fallbackRes.error;
                }
                toast.success('Show updated successfully');
            } else {
                const insertRes = await supabase.from('shows').insert({ ...submitData, id: crypto.randomUUID() });
                if (insertRes.error) throw insertRes.error;
                toast.success('Show created successfully');
            }
            onSuccess();
            onClose();
        } catch (error: unknown) {
            const message = getErrorMessage(error);
            toast.error(message);
            console.error('Show save error details:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-3xl" hideHeader>
            <div className="flex max-h-[90vh] flex-col">
                {/* Header */}
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-200 bg-linear-to-br from-orange-50 via-white to-white px-6 py-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-orange-500 to-orange-400 text-white shadow-lg shadow-orange-500/25">
                            <CalendarDays className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold tracking-tight text-zinc-950">
                                {initialData ? 'Edit show' : 'Add new show'}
                            </h2>
                            <p className="text-sm text-zinc-500">
                                {initialData
                                    ? 'Update the details for this show.'
                                    : 'Fill in the details to add a show to your library.'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar bg-zinc-50/60">
                    <div className="space-y-4 p-5 sm:p-6">
                    <Section icon={<Calendar className="h-4 w-4" />} title="Basic details">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <SoftInput
                                label="Event Name"
                                value={formData.Event_Name}
                                onChange={(e) => setField('Event_Name', e.target.value)}
                                placeholder="e.g. Gitex Global"
                                icon={<Calendar className="h-4 w-4" />}
                            />
                            <SoftSelect
                                label="Event Type"
                                value={formData.Event_Type}
                                onChange={(value) => setField('Event_Type', value)}
                                options={EVENT_TYPES.map((type) => ({ value: type, label: type }))}
                                placeholder="Select event type"
                            />
                            <SoftInput
                                label="Starting Date"
                                type="date"
                                value={formData.Starting_Date}
                                onChange={(e) => setField('Starting_Date', e.target.value)}
                            />
                        </div>
                    </Section>

                    <Section icon={<MapPin className="h-4 w-4" />} title="Classification & location">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <SoftSelect
                                label="Industry"
                                value={formData.Industry}
                                onChange={(value) => setField('Industry', value)}
                                options={INDUSTRIES.map((industry) => ({ value: industry, label: industry }))}
                                placeholder="Select industry"
                            />
                            <SoftSelect
                                label="Level"
                                value={formData.Level}
                                onChange={(value) => setField('Level', value)}
                                options={LEVELS.map((level) => ({ value: level, label: level }))}
                                placeholder="Select level"
                            />
                            <SoftSelect
                                label="World Area"
                                value={formData.World_Area}
                                onChange={(value) => setField('World_Area', value)}
                                options={WORLD_AREAS.map((area) => ({ value: area, label: area }))}
                                placeholder="Select world area"
                            />
                            <div className="space-y-2">
                                <label className="ml-1 text-xs font-bold uppercase tracking-wider text-zinc-500">
                                    Frequency
                                </label>
                                <div className="flex flex-wrap gap-3 pt-1">
                                    {FREQUENCIES.map((freq) => (
                                        <label key={freq} className="group flex cursor-pointer items-center gap-2">
                                            <div
                                                className={`flex h-5 w-5 items-center justify-center rounded-full border transition-all ${
                                                    formData.Frequency === freq
                                                        ? 'border-orange-500 bg-orange-500/15'
                                                        : 'border-zinc-300 group-hover:border-zinc-400'
                                                }`}
                                            >
                                                {formData.Frequency === freq && (
                                                    <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                                                )}
                                            </div>
                                            <input
                                                type="radio"
                                                name="frequency"
                                                className="hidden"
                                                checked={formData.Frequency === freq}
                                                onChange={() => setField('Frequency', freq)}
                                            />
                                            <span
                                                className={`text-sm font-medium ${
                                                    formData.Frequency === freq ? 'text-zinc-900' : 'text-zinc-500'
                                                }`}
                                            >
                                                {freq}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <SoftInput
                                label="Country"
                                value={formData.Country}
                                onChange={(e) => setField('Country', e.target.value)}
                                placeholder="e.g. UAE"
                                icon={<Globe className="h-4 w-4" />}
                            />
                            <SoftInput
                                label="City"
                                value={formData.City}
                                onChange={(e) => setField('City', e.target.value)}
                                placeholder="e.g. Dubai"
                                icon={<MapPin className="h-4 w-4" />}
                            />
                        </div>
                    </Section>

                    <Section icon={<Building2 className="h-4 w-4" />} title="Organiser & tags">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <SoftInput
                                label="Organiser"
                                value={formData.Organiser}
                                onChange={(e) => setField('Organiser', e.target.value)}
                                placeholder="e.g. DWTC"
                                icon={<Building2 className="h-4 w-4" />}
                            />
                            <SoftInput
                                label="Tags"
                                value={formData.Tags}
                                onChange={(e) => setField('Tags', e.target.value)}
                                placeholder="Comma-separated tags"
                                icon={<Tag className="h-4 w-4" />}
                            />
                        </div>
                    </Section>

                    <Section icon={<Link2 className="h-4 w-4" />} title="Links">
                        <div className="grid grid-cols-1 gap-4">
                            <SoftInput
                                label="Show Website"
                                value={formData.Show_Website}
                                onChange={(e) => setField('Show_Website', e.target.value)}
                                placeholder="https://example.com"
                                icon={<Globe className="h-4 w-4" />}
                            />
                            <SoftInput
                                label="Exhibitor List Link"
                                value={formData.Exhibitor_List_Link}
                                onChange={(e) => setField('Exhibitor_List_Link', e.target.value)}
                                placeholder="https://example.com/exhibitors"
                                icon={<Link2 className="h-4 w-4" />}
                            />
                        </div>
                    </Section>

                    <Section icon={<FileText className="h-4 w-4" />} title="Notes">
                        <SoftTextarea
                            label="Show Note"
                            value={formData.Note}
                            onChange={(e) => setField('Note', e.target.value)}
                            placeholder="Internal notes, follow-ups, or event details…"
                            rows={4}
                        />
                    </Section>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex shrink-0 items-center justify-end gap-3 border-t border-zinc-200 bg-white px-6 py-4">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} isLoading={loading} leftIcon={<Save className="h-4 w-4" />}>
                        {initialData ? 'Save changes' : 'Save show'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
