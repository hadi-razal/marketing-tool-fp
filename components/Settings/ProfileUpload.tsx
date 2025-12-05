/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { createClient } from '@/lib/supabase';
import { Camera, X, Upload, Trash2, ZoomIn, ZoomOut, Loader2, Eye } from 'lucide-react';
import { Button } from '../ui/Button';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileUploadProps {
    currentImageUrl?: string | null;
    onUpdate: (url: string | null) => void;
    uid: string;
}

export const ProfileUpload = ({ currentImageUrl, onUpdate, uid }: ProfileUploadProps) => {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();

    const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const imageDataUrl = await readFile(file);
            setImageSrc(imageDataUrl as string);
            setIsModalOpen(true);
            // Reset input value so same file can be selected again
            e.target.value = '';
        }
    };

    const readFile = (file: File) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.addEventListener('load', () => resolve(reader.result), false);
            reader.readAsDataURL(file);
        });
    };

    const createImage = (url: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
            const image = new Image();
            image.addEventListener('load', () => resolve(image));
            image.addEventListener('error', (error) => reject(error));
            image.setAttribute('crossOrigin', 'anonymous');
            image.src = url;
        });

    const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<Blob> => {
        const image = await createImage(imageSrc);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            throw new Error('No 2d context');
        }

        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;

        ctx.drawImage(
            image,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            pixelCrop.width,
            pixelCrop.height
        );

        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error('Canvas is empty'));
                    return;
                }
                resolve(blob);
            }, 'image/jpeg');
        });
    };

    const handleSave = async () => {
        if (!imageSrc || !croppedAreaPixels) return;

        setLoading(true);
        try {
            const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
            const fileName = `${uid}/${Date.now()}.jpg`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('profile')
                .upload(fileName, croppedImageBlob, {
                    contentType: 'image/jpeg',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('profile')
                .getPublicUrl(fileName);

            // Update User Profile
            const { error: updateError } = await supabase
                .from('users')
                .update({ profile_url: publicUrl })
                .eq('uid', uid);

            if (updateError) throw updateError;

            // Log Activity
            await supabase.from('activities').insert({
                uid,
                label: 'Profile Updated',
                status: 'updated their profile picture',
                created_at: new Date().toISOString()
            });

            onUpdate(publicUrl);
            setIsModalOpen(false);
            setImageSrc(null);
        } catch (error) {
            console.error('Error uploading profile picture:', error);
            alert(`Failed to upload profile picture: ${(error as any).message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async () => {
        if (!confirm('Are you sure you want to remove your profile picture?')) return;

        setLoading(true);
        try {
            // Update User Profile to null
            const { error: updateError } = await supabase
                .from('users')
                .update({ profile_url: null })
                .eq('uid', uid);

            if (updateError) throw updateError;

            // Log Activity
            await supabase.from('activities').insert({
                uid,
                label: 'Profile Removed',
                status: 'removed their profile picture',
                created_at: new Date().toISOString()
            });

            // Optional: Delete from storage if you want to clean up
            // But we might want to keep history or it might be complex to find the exact file without storing the path
            // For now, just unlinking is safer/easier.

            onUpdate(null);
        } catch (error) {
            console.error('Error removing profile picture:', error);
            alert('Failed to remove profile picture.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="flex items-center gap-6">
                <div className="relative group">
                    <div
                        className={`w-20 h-20 rounded-full overflow-hidden bg-zinc-800 border-2 border-zinc-700 ring-4 ring-zinc-900 shadow-xl ${currentImageUrl ? 'cursor-pointer' : ''}`}
                        onClick={() => currentImageUrl && setIsLightboxOpen(true)}
                    >
                        {currentImageUrl ? (
                            <img
                                src={currentImageUrl}
                                alt="Profile"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-500">
                                <Camera className="w-8 h-8" />
                            </div>
                        )}
                    </div>

                    {/* Hover Overlay */}
                    {currentImageUrl && (
                        <button
                            onClick={() => setIsLightboxOpen(true)}
                            className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                        >
                            <Eye className="w-6 h-6" />
                        </button>
                    )}
                </div>

                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            variant="secondary"
                            className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 hover:text-white text-zinc-300 h-9 px-4 text-xs"
                        >
                            <Upload className="w-3.5 h-3.5 mr-2" />
                            Upload New
                        </Button>
                        {currentImageUrl && (
                            <Button
                                onClick={handleRemove}
                                variant="secondary"
                                className="bg-red-500/10 border-red-500/20 hover:bg-red-500/20 text-red-400 h-9 px-4 text-xs"
                            >
                                <Trash2 className="w-3.5 h-3.5 mr-2" />
                                Remove
                            </Button>
                        )}
                    </div>
                    <p className="text-xs text-zinc-500">
                        Recommended: Square JPG, PNG. Max 5MB.
                    </p>
                </div>

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                />
            </div>

            {/* Crop Modal */}
            <AnimatePresence>
                {isModalOpen && imageSrc && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"
                            onClick={() => setIsModalOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-[#09090b] border border-zinc-800 rounded-md shadow-2xl z-[70] overflow-hidden flex flex-col"
                        >
                            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Adjust Profile Picture</h3>
                                <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="relative h-80 bg-black">
                                <Cropper
                                    image={imageSrc}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={1}
                                    onCropChange={setCrop}
                                    onCropComplete={onCropComplete}
                                    onZoomChange={setZoom}
                                    cropShape="round"
                                    showGrid={false}
                                />
                            </div>

                            <div className="p-6 space-y-6 bg-[#09090b]">
                                <div className="flex items-center gap-4">
                                    <ZoomOut className="w-4 h-4 text-zinc-500" />
                                    <input
                                        type="range"
                                        value={zoom}
                                        min={1}
                                        max={3}
                                        step={0.1}
                                        aria-labelledby="Zoom"
                                        onChange={(e) => setZoom(Number(e.target.value))}
                                        className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                                    />
                                    <ZoomIn className="w-4 h-4 text-zinc-500" />
                                </div>

                                <div className="flex justify-end gap-3">
                                    <Button
                                        variant="secondary"
                                        onClick={() => setIsModalOpen(false)}
                                        className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-300"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleSave}
                                        disabled={loading}
                                        className="bg-white text-black hover:bg-zinc-200 min-w-[100px]"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save & Apply'}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Lightbox Modal */}
            <AnimatePresence>
                {isLightboxOpen && currentImageUrl && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[80]"
                            onClick={() => setIsLightboxOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[90] max-w-4xl max-h-[90vh] p-4 outline-none"
                        >
                            <button
                                onClick={() => setIsLightboxOpen(false)}
                                className="absolute -top-12 right-0 p-2 text-zinc-400 hover:text-white transition-colors"
                            >
                                <X className="w-8 h-8" />
                            </button>
                            <img
                                src={currentImageUrl}
                                alt="Profile Full Size"
                                className="w-full h-full object-contain rounded-lg shadow-2xl border border-white/10"
                            />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};
