'use client';

import React, { useMemo, useState } from 'react';
import { Camera, Clock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getUploadedShowImages } from '@/lib/showImages';
import { toast } from 'sonner';

type ShowImagesPanelProps = {
    show: Record<string, unknown>;
    name: string;
};

const ComingSoonSlot: React.FC<{ label: string; aspectClass: string }> = ({ label, aspectClass }) => (
    <div className="overflow-hidden rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 shadow-sm shadow-zinc-950/5">
        <div className="border-b border-zinc-100 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
        </div>
        <div className={`flex flex-col items-center justify-center gap-2 text-zinc-400 ${aspectClass}`}>
            <Clock className="h-7 w-7 text-zinc-300" />
            <p className="text-xs font-medium text-zinc-500">Coming soon</p>
        </div>
    </div>
);

export const ShowImagesPanel: React.FC<ShowImagesPanelProps> = ({ show, name }) => {
    const uploadedImages = useMemo(() => getUploadedShowImages(show), [show]);
    const [brokenUrls, setBrokenUrls] = useState<Set<string>>(new Set());

    const visibleImages = uploadedImages.filter((url) => !brokenUrls.has(url));

    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-zinc-900">Images</h2>
                    <p className="mt-1 text-sm text-zinc-500">Uploaded event photos and imagery.</p>
                </div>
                <Button
                    size="sm"
                    variant="primary"
                    leftIcon={<Camera className="h-4 w-4" />}
                    onClick={() => toast.info('Image upload coming soon')}
                >
                    Upload Image
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <ComingSoonSlot label="Profile Photo" aspectClass="aspect-square" />
                <div className="sm:col-span-1 lg:col-span-2">
                    <ComingSoonSlot label="Cover Banner" aspectClass="aspect-video" />
                </div>
            </div>

            {visibleImages.length > 0 ? (
                <div className="flex flex-col gap-3">
                    <div>
                        <h3 className="text-sm font-semibold text-zinc-900">Uploaded images</h3>
                        <p className="mt-1 text-xs text-zinc-500">
                            {visibleImages.length} image{visibleImages.length === 1 ? '' : 's'} saved for this show
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {visibleImages.map((url) => (
                            <div
                                key={url}
                                className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50"
                            >
                                <div className="aspect-4/3 overflow-hidden">
                                    <img
                                        src={url}
                                        alt={`${name} uploaded`}
                                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        loading="lazy"
                                        onError={() => setBrokenUrls((prev) => new Set(prev).add(url))}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 px-6 py-12 text-center text-zinc-500">
                    <Camera className="h-8 w-8 text-zinc-300" />
                    <p className="text-sm font-medium text-zinc-600">No uploaded images yet</p>
                    <p className="text-xs text-zinc-400">Upload event photos to see them here.</p>
                </div>
            )}

            <button
                type="button"
                onClick={() => toast.info('Image upload coming soon')}
                className="group flex min-h-[120px] items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-zinc-200 bg-white p-6 text-center transition-colors hover:border-orange-300 hover:bg-orange-50/30"
            >
                <div className="rounded-full bg-zinc-100 p-3 text-zinc-400 transition-colors group-hover:bg-orange-100 group-hover:text-orange-600">
                    <Plus className="h-5 w-5" />
                </div>
                <div className="text-left">
                    <p className="text-sm font-semibold text-zinc-700">Add more images</p>
                    <p className="mt-0.5 text-xs text-zinc-400">Upload event photos, booth shots, and more.</p>
                </div>
            </button>
        </div>
    );
};
