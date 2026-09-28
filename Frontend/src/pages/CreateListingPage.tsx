/*

  OWNER: Mogamat Wazeer Gilbert (221374698)
  ROUTE: /listings/new

  LAYOUT: one centred column (max-w-2xl), the form split into grouped glass
  cards - Details, Price & category, Photo. The Cancel / Post buttons sit in
  a bar that sticks to the bottom of the screen on phones (above the
  BottomNav) while the form is in view, and is a normal row from md.

*/

import {Camera, ImageSquare, X} from '@phosphor-icons/react'
import React, {useState, useEffect, useMemo} from 'react'
import {useNavigate} from 'react-router-dom'
import {useForm} from 'react-hook-form'
import {zodResolver} from "@hookform/resolvers/zod";
import {useAuth} from '@/auth/useAuth';
import {authApi} from "@/lib/api/auth";
import {listingsApi} from "@/lib/api/listings";
import type {Campus, Category} from "@/lib/api/types";
import {createListingSchema} from '@/lib/schemas';
import type { CreateListingFormData } from '@/lib/schemas';
import { PageHeader } from '@/components/layout/PageHeader'
import { Seo } from '@/components/seo/Seo'
import {Card} from  '@/components/ui/Card';
import {TextField} from '@/components/ui/TextField';
import {Textarea} from "@/components/ui/Textarea";
import {Select} from "@/components/ui/Select";
import {Button} from "@/components/ui/Button";
import {Alert} from "@/components/ui/Alert";

export const CreateListingPage: React.FC = () => {
    const navigate = useNavigate();
    const {user} = useAuth();

    const [categories, setCategories] = useState<Category[]>([]);
    const [campuses, setCampuses] = useState<Campus[]>([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState(true);
    const [isLoadingCampuses, setIsLoadingCampuses] = useState(true);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [rootError, setRootError] = useState<string | null>(null);

    // Local preview of the chosen photo; the object URL is freed on change/unmount.
    const previewUrl = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : null), [imageFile]);
    useEffect(() => () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
    }, [previewUrl]);

    const {
        register,
        handleSubmit,
        setError,
        formState: {errors, isSubmitting},
    } = useForm<CreateListingFormData>({
        resolver: zodResolver(createListingSchema),
        defaultValues: {
            title: '',
            categoryId: '',
            campusId: '',
            price: '',
            description: '',
        },
    });

    useEffect(() => {
        let mounted = true;

        async function fetchFormOptions() {
            try {
                setIsLoadingCategories(true);
                setIsLoadingCampuses(true);
                const [categoryData, campusData] = await Promise.all([
                    listingsApi.categories(),
                    authApi.campuses(),
                ]);
                if (mounted) {
                    setCategories(categoryData);
                    setCampuses(campusData);
                }
            } catch (err: unknown) {
                if (mounted) {
                    const msg = String((err as { message?: unknown })?.message ?? 'Failed to load marketplace categories.');
                    setRootError(msg);
                }
            } finally {
                if (mounted) {
                    setIsLoadingCategories(false);
                    setIsLoadingCampuses(false);
                }
            }
        }

        fetchFormOptions();

        return () => {
            mounted = false;
        };
    }, []);

    const onSubmit = async (data: CreateListingFormData) => {
        setRootError(null)

        if (!user?.userId) {
            setRootError('You must be signed in to create a listing.')
            return;
        }

        if (!imageFile) {
            setRootError('Please choose an image from your device.')
            return;
        }

        if (imageFile) {
            if (!imageFile.type.startsWith('image/')) {
                setRootError('Please select an image file.')
                return;
            }
            if (imageFile.size > 10 * 1024 * 1024) {
                setRootError('Image must be 10 MB or smaller.')
                return;
            }
        }

        try {
            const created = await listingsApi.create({
                sellerId: Number(user.userId),
                campusId: Number(data.campusId),
                categoryId: Number(data.categoryId),
                title: data.title.trim(),
                description: data.description?.trim() || '',
                price: Number(data.price),
                status: 'ACTIVE'
            });

            if (created?.listingId && imageFile) {
                try {
                    await listingsApi.uploadImage({
                        listingId: Number(created.listingId),
                        file: imageFile,
                        position: 1,
                        isPrimary: true,
                    });
                } catch (imgError) {
                    const message = String(
                        (imgError as { message?: unknown })?.message ??
                        'The listing was created, but the image could not be saved.',
                    );
                    setRootError(`Listing created, but image upload failed: ${message}`);
                    return;
                }
            }

            navigate(`/listings/${created.listingId}`);
        } catch (err: unknown) {
            const apiResponse = (err as { response?: { data?: unknown } })?.response?.data;

            if (apiResponse && typeof apiResponse === 'object') {
                const fields = (apiResponse as Record<string, unknown>)['fields'];
                if (fields && typeof fields === 'object') {
                    Object.entries(fields as Record<string, unknown>).forEach(([fieldName, message]) => {
                        setError(fieldName as keyof CreateListingFormData, {
                            type: 'server',
                            message: String(message),
                        });
                    });
                }
            }

            const apiMessage =
                apiResponse && typeof apiResponse === 'object'
                    ? (apiResponse as Record<string, unknown>)['message']
                    : undefined;
            setRootError(
                String(apiMessage ?? (err as { message?: unknown })?.message ?? 'Failed to add listing')
            );
        }
    };

    const sectionTitle = 'text-base font-semibold text-fg';
    const sectionHint = 'mt-0.5 text-sm text-fg-muted';

    return (
        <div className="mx-auto max-w-2xl">
            <Seo
                title="Create a listing"
                description="List textbooks, tech, stationery or res items for sale to verified CPUT students on your campus."
                path="/listings/new"
                noindex
            />
            <PageHeader
                title="Create a listing"
                subtitle="Sell textbooks, stationery, gear, or res items directly to peers on your campus."
                backTo="/feed"
                backLabel="Back to feed"
                breadcrumbs={[{label: 'Feed', to: '/feed'}, {label: 'New listing'}]}
            />

            {rootError && (
                <div className="mb-4">
                    <Alert tone="error">{rootError}</Alert>
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <Card className="space-y-5 sm:p-6">
                    <div>
                        <h2 className={sectionTitle}>Details</h2>
                        <p className={sectionHint}>A clear title and honest description sell faster.</p>
                    </div>
                    <TextField
                        label="Title"
                        placeholder="e.g. Contemporary Project Management, 5th Edition"
                        error={errors.title?.message}
                        {...register('title')}
                    />

                    <Textarea label="Description"
                              placeholder="Describe condition and extra details... "
                              rows={4}
                              error={errors.description?.message}
                              {...register('description')}
                    />
                </Card>

                <Card className="space-y-5 sm:p-6">
                    <div>
                        <h2 className={sectionTitle}>Price &amp; category</h2>
                        <p className={sectionHint}>Where buyers will find it, and what it costs.</p>
                    </div>

                    <TextField label="Price (ZAR)"
                               type="number"
                               inputMode="decimal"
                               step="0.01"
                               placeholder="0.00"
                               className="tabular-nums"
                               error={errors.price?.message}
                               {...register('price')}
                    />

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Select
                            label="Category"
                            error={errors.categoryId?.message}
                            disabled={isLoadingCategories}
                            {...register('categoryId')}>
                            <option value="">
                                {isLoadingCategories ? 'Loading Categories...' : 'Select a category'}
                            </option>
                            {categories.map((cat) => (
                                <option key={cat.categoryId} value={String(cat.categoryId)}>{cat.name}</option>
                            ))}
                        </Select>

                        <Select
                            label="Campus"
                            error={errors.campusId?.message}
                            disabled={isLoadingCampuses}
                            {...register('campusId')}>
                            <option value="">
                                {isLoadingCampuses ? 'Loading campuses...' : 'Select a campus'}
                            </option>
                            {campuses.map((campus) => (
                                <option key={campus.campusId} value={String(campus.campusId)}>
                                    {campus.name}
                                </option>
                            ))}
                        </Select>
                    </div>
                </Card>

                <Card className="space-y-4 sm:p-6">
                    <div>
                        <h2 className={sectionTitle}>Photo</h2>
                        <p id="imageFile-hint" className={sectionHint}>
                            Choose a JPEG, PNG, GIF, or WebP image up to 10 MB. An image from your device is required.
                        </p>
                    </div>

                    <input
                        id="imageFile"
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        aria-describedby="imageFile-hint"
                        onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                        // Reset so picking the same file again after "Remove" still fires onChange.
                        onClick={(event) => { event.currentTarget.value = ''; }}
                        className="peer sr-only"
                    />

                    {imageFile && previewUrl ? (
                        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-muted/60 p-2.5">
                            <img src={previewUrl} alt="" className="size-16 shrink-0 rounded-lg object-cover" />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-fg">{imageFile.name}</p>
                                <p className="text-xs tabular-nums text-fg-muted">
                                    {(imageFile.size / (1024 * 1024)).toFixed(1)} MB
                                </p>
                                <label htmlFor="imageFile" className="mt-0.5 inline-block cursor-pointer text-sm font-semibold text-brand-700 hover:underline">
                                    Change photo
                                </label>
                            </div>
                            <button
                                type="button"
                                onClick={() => setImageFile(null)}
                                aria-label="Remove photo"
                                className="grid size-10 shrink-0 place-items-center rounded-full text-fg-muted transition hover:bg-surface-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-brand-500"
                            >
                                <X aria-hidden="true" weight="bold" className="size-4" />
                            </button>
                        </div>
                    ) : (
                        <label
                            htmlFor="imageFile"
                            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-strong bg-surface-muted/50 px-4 py-8 text-center transition hover:border-brand-300 hover:bg-brand-50 active:scale-[0.99] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-500"
                        >
                            <span className="grid size-12 place-items-center rounded-full bg-brand-50 text-brand-700">
                                <Camera aria-hidden="true" weight="fill" className="size-6" />
                            </span>
                            <span className="text-sm font-semibold text-fg">Add a photo</span>
                            <span className="flex items-center gap-1 text-xs text-fg-muted">
                                <ImageSquare aria-hidden="true" className="size-4" />
                                Tap to choose from your device
                            </span>
                        </label>
                    )}
                </Card>

                {/* Phones: sticks above the BottomNav while the form is on screen. */}
                <div className="glass-strong sticky bottom-[calc(var(--ux-bottom-nav)+0.5rem)] transition-[bottom] duration-300 z-10 flex gap-2 rounded-2xl border p-2.5 shadow-float md:static md:justify-end md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none">
                    <Button type="button"
                            variant="secondary"
                            className="flex-1 md:w-auto md:flex-none"
                            onClick={() => navigate(-1)}
                            disabled={isSubmitting}
                    >Cancel</Button>
                    <Button type="submit"
                            className="flex-[2] md:w-auto md:flex-none md:px-6"
                            loading={isSubmitting}
                            disabled={isSubmitting || isLoadingCategories || isLoadingCampuses}>
                        {isSubmitting ? 'Posting Listing...' : 'Post Listing'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default CreateListingPage;
