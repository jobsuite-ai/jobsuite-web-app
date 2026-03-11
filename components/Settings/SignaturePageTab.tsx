'use client';

import { useEffect, useRef, useState } from 'react';

import {
    ActionIcon,
    Alert,
    Accordion,
    Box,
    Button,
    Card,
    Divider,
    FileButton,
    Group,
    Loader,
    NumberInput,
    Paper,
    Progress,
    SimpleGrid,
    Stack,
    Switch,
    Text,
    Textarea,
    TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import '@mantine/tiptap/styles.css';
import {
    IconCheck,
    IconChevronDown,
    IconChevronUp,
    IconEye,
    IconFile,
    IconGripVertical,
    IconPhotoPlus,
    IconPlus,
    IconTrash,
    IconUpload,
    IconX,
} from '@tabler/icons-react';

import { getApiHeaders } from '@/app/utils/apiClient';
import { EstimateLineItem } from '@/components/EstimateDetails/estimate/LineItem';
import type { PastProject } from '@/components/EstimateDetails/signature/SignaturePageSections';
import { AboutBlock } from '@/components/EstimateDetails/signature/SignaturePageSections';
import { Estimate, EstimateResource, EstimateStatus } from '@/components/Global/model';
import RichTextBodyEditor from '@/components/Global/RichTextBodyEditor';

interface SignaturePageConfig {
    show_license: boolean;
    show_insurance: boolean;
    show_w9: boolean;
    show_past_projects: boolean;
    show_about: boolean;
    license_pdf_url?: string;
    license_pdf_s3_key?: string;
    insurance_pdf_url?: string;
    insurance_pdf_s3_key?: string;
    w9_pdf_url?: string;
    w9_pdf_s3_key?: string;
    about_text: string;
    about_heading?: string;
    about_subheading?: string;
    about_blocks?: AboutBlock[];
    past_projects_count: number;
    use_curated_past_projects?: boolean;
    past_projects_curated?: PastProject[];
}

interface ContractorConfiguration {
    id: string;
    configuration_type?: string;
    configuration: {
        signature_page_config?: SignaturePageConfig;
    };
}

export default function SignaturePageTab() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [configId, setConfigId] = useState<string | null>(null);
    const [hasChanges, setHasChanges] = useState(false);

    // Signature page configuration state
    const [showLicense, setShowLicense] = useState(false);
    const [showInsurance, setShowInsurance] = useState(false);
    const [showW9, setShowW9] = useState(false);
    const [showPastProjects, setShowPastProjects] = useState(false);
    const [showAbout, setShowAbout] = useState(false);
    const [licensePdfUrl, setLicensePdfUrl] = useState<string | null>(null);
    const [insurancePdfUrl, setInsurancePdfUrl] = useState<string | null>(null);
    const [w9PdfUrl, setW9PdfUrl] = useState<string | null>(null);
    const [aboutText, setAboutText] = useState('');
    const [aboutHeading, setAboutHeading] = useState('');
    const [aboutSubheading, setAboutSubheading] = useState('');
    const [aboutBlocks, setAboutBlocks] = useState<AboutBlock[]>([]);
    const [pastProjectsCount, setPastProjectsCount] = useState(5);
    const [useCuratedPastProjects, setUseCuratedPastProjects] = useState(false);
    const [pastProjectsCurated, setPastProjectsCurated] = useState<PastProject[]>([]);
    const [uploadingLicense, setUploadingLicense] = useState(false);
    const [uploadingInsurance, setUploadingInsurance] = useState(false);
    const [uploadingW9, setUploadingW9] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [openingPreview, setOpeningPreview] = useState(false);
    const isMountedRef = useRef(true);
    const [draggingAboutIndex, setDraggingAboutIndex] = useState<number | null>(null);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        loadConfiguration();
    }, []);

    const loadConfiguration = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(
                '/api/configurations?config_type=contractor_config',
                {
                    method: 'GET',
                    headers: getApiHeaders(),
                }
            );

            if (!response.ok) {
                if (response.status === 404) {
                    setConfigId(null);
                    return;
                }
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to load configuration');
            }

            const configs: ContractorConfiguration[] = await response.json();
            const config = configs.find(
                (c) => c.configuration_type === 'contractor_config'
            );

            if (config) {
                setConfigId(config.id);
                const sigConfig: SignaturePageConfig =
                    config.configuration?.signature_page_config || {
                        show_license: false,
                        show_insurance: false,
                        show_w9: false,
                        show_past_projects: false,
                        show_about: false,
                        about_text: '',
                        past_projects_count: 5,
                    };
                setShowLicense(sigConfig.show_license || false);
                setShowInsurance(sigConfig.show_insurance || false);
                setShowW9(sigConfig.show_w9 || false);
                setShowPastProjects(sigConfig.show_past_projects || false);
                setShowAbout(sigConfig.show_about || false);
                setLicensePdfUrl(sigConfig.license_pdf_url || null);
                setInsurancePdfUrl(sigConfig.insurance_pdf_url || null);
                setW9PdfUrl(sigConfig.w9_pdf_url || null);
                setAboutText(sigConfig.about_text || '');
                setAboutHeading(sigConfig.about_heading || '');
                setAboutSubheading(sigConfig.about_subheading || '');
                setAboutBlocks(Array.isArray(sigConfig.about_blocks) ? sigConfig.about_blocks : []);
                setPastProjectsCount(sigConfig.past_projects_count || 5);
                setUseCuratedPastProjects(sigConfig.use_curated_past_projects || false);
                setPastProjectsCurated(
                    Array.isArray(sigConfig.past_projects_curated) ?
                    sigConfig.past_projects_curated : []
                );
            } else {
                setConfigId(null);
                // Reset to defaults
                setShowLicense(false);
                setShowInsurance(false);
                setShowW9(false);
                setShowPastProjects(false);
                setShowAbout(false);
                setLicensePdfUrl(null);
                setInsurancePdfUrl(null);
                setW9PdfUrl(null);
                setAboutText('');
                setAboutHeading('');
                setAboutSubheading('');
                setAboutBlocks([]);
                setPastProjectsCount(5);
                setUseCuratedPastProjects(false);
                setPastProjectsCurated([]);
            }
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Error loading configuration:', err);
            setError(
                err instanceof Error ? err.message : 'Failed to load configuration'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);

            // Get existing config to preserve other fields
            const existingConfigs: ContractorConfiguration[] = configId ? await (async () => {
                try {
                    const response = await fetch(
                        '/api/configurations?config_type=contractor_config',
                        {
                            method: 'GET',
                            headers: getApiHeaders(),
                        }
                    );
                    if (response.ok) {
                        return await response.json();
                    }
                } catch {
                    // Ignore errors
                }
                return [];
            })() : [];

            const existingConfig = existingConfigs.find(
                (c) => c.configuration_type === 'contractor_config'
            );

            const configData = {
                configuration_type: 'contractor_config',
                configuration: {
                    ...(existingConfig?.configuration || {}),
                    signature_page_config: {
                        show_license: showLicense,
                        show_insurance: showInsurance,
                        show_w9: showW9,
                        show_past_projects: showPastProjects,
                        show_about: showAbout,
                        license_pdf_url: licensePdfUrl,
                        insurance_pdf_url: insurancePdfUrl,
                        w9_pdf_url: w9PdfUrl,
                        about_text: aboutText,
                        about_heading: aboutHeading || undefined,
                        about_subheading: aboutSubheading || undefined,
                        about_blocks: aboutBlocks.length > 0 ? aboutBlocks : undefined,
                        past_projects_count: pastProjectsCount,
                        use_curated_past_projects: useCuratedPastProjects,
                        past_projects_curated:
                            useCuratedPastProjects && pastProjectsCurated.length > 0
                                ? pastProjectsCurated
                                : undefined,
                    },
                },
            };

            let response;
            if (configId) {
                response = await fetch(`/api/configurations/${configId}`, {
                    method: 'PUT',
                    headers: getApiHeaders(),
                    body: JSON.stringify(configData),
                });
            } else {
                response = await fetch('/api/configurations', {
                    method: 'POST',
                    headers: getApiHeaders(),
                    body: JSON.stringify(configData),
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save configuration');
            }

            const savedConfig: ContractorConfiguration = await response.json();
            setConfigId(savedConfig.id);
            setHasChanges(false);

            notifications.show({
                title: 'Success',
                message: 'Signature page configuration saved successfully',
                color: 'green',
                icon: <IconCheck size={16} />,
            });

            await loadConfiguration();
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Error saving configuration:', err);
            const errorMessage =
                err instanceof Error ? err.message : 'Failed to save configuration';
            setError(errorMessage);
            notifications.show({
                title: 'Error',
                message: errorMessage,
                color: 'red',
                icon: <IconX size={16} />,
            });
        } finally {
            setSaving(false);
        }
    };

    // Helper functions for multipart upload
    async function initiateMultipartUpload(
        file: File,
        type: 'license' | 'insurance' | 'w9'
    ): Promise<any> {
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) {
            throw new Error('No access token found');
        }

        const parsedFileName = file.name.replaceAll(' ', '_');
        const formData = new FormData();
        formData.append('filename', parsedFileName);
        formData.append('content_type', file.type);
        formData.append('type', type);

        const response = await fetch(
            '/api/configurations/signature-pdf/multipart/initiate',
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                body: formData,
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || errorData.error || 'Failed to initiate multipart upload';
            throw new Error(errorMessage);
        }

        return response.json();
    }

    async function getPresignedUrlForPart(
        pdfId: string,
        partNumber: number
    ): Promise<string> {
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) {
            throw new Error('No access token found');
        }

        const response = await fetch(
            `/api/configurations/signature-pdf/${pdfId}/multipart/presigned-url?part_number=${partNumber}`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || errorData.error || 'Failed to get presigned URL';
            throw new Error(errorMessage);
        }

        const data = await response.json();
        return data.presigned_url;
    }

    async function uploadFilePartWithRetry(
        pdfId: string,
        partNumber: number,
        chunk: Blob,
        maxRetries: number = 3
    ): Promise<{ PartNumber: number; ETag: string }> {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
            try {
                // Get presigned URL for this part
                const presignedUrl = await getPresignedUrlForPart(pdfId, partNumber);

                // Upload part directly to S3 with timeout
                const controller = new AbortController();
                // 5 minute timeout per part
                const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);

                try {
                    const uploadResponse = await fetch(presignedUrl, {
                        method: 'PUT',
                        body: chunk,
                        signal: controller.signal,
                    });

                    clearTimeout(timeoutId);

                    if (!uploadResponse.ok) {
                        const errorText = await uploadResponse.text().catch(() => 'Unknown error');
                        throw new Error(
                            `Failed to upload part ${partNumber}: ${uploadResponse.status} ${uploadResponse.statusText}. ${errorText}`
                        );
                    }

                    const etag = uploadResponse.headers.get('ETag')?.replace(/"/g, '');
                    if (!etag) {
                        throw new Error(
                            `No ETag received for part ${partNumber}. This is likely a CORS configuration issue.`
                        );
                    }

                    return {
                        PartNumber: partNumber,
                        ETag: etag,
                    };
                } catch (fetchError) {
                    clearTimeout(timeoutId);
                    if (fetchError instanceof Error && fetchError.name === 'AbortError') {
                        throw new Error(`Upload timeout for part ${partNumber} (attempt ${attempt}/${maxRetries})`);
                    }
                    throw fetchError;
                }
            } catch (uploadError) {
                lastError = uploadError instanceof Error
                    ? uploadError
                    : new Error(String(uploadError));
                if (attempt < maxRetries) {
                    // Exponential backoff: wait 1s, 2s, 4s before retrying
                    const delay = Math.min(1000 * (2 ** (attempt - 1)), 10000);
                    // eslint-disable-next-line no-console
                    console.warn(
                        `Failed to upload part ${partNumber} (attempt ${attempt}/${maxRetries}): ` +
                        `${lastError.message}. Retrying in ${delay}ms...`
                    );
                    await new Promise((resolve) => {
                        setTimeout(resolve, delay);
                    });
                }
            }
        }

        // All retries failed
        throw new Error(
            `Failed to upload part ${partNumber} after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
        );
    }

    async function uploadFileParts(
        file: File,
        pdfId: string,
        onProgress?: (uploaded: number, total: number) => void
    ): Promise<Array<{ PartNumber: number; ETag: string }>> {
        const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
        const totalParts = Math.ceil(file.size / CHUNK_SIZE);
        const parts: Array<{ PartNumber: number; ETag: string }> = [];
        const partProgress: Map<number, number> = new Map();

        for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
            const start = (partNumber - 1) * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, file.size);
            const chunk = file.slice(start, end);

            const partResult = await uploadFilePartWithRetry(
                pdfId,
                partNumber,
                chunk,
                3 // maxRetries
            );

            partProgress.set(partNumber, 100);
            if (onProgress) {
                const totalProgress = Array.from(
                    partProgress.values()
                ).reduce((sum, p) => sum + p, 0);
                onProgress(totalProgress, totalParts * 100);
            }

            parts.push(partResult);
        }

        return parts;
    }

    async function completeMultipartUpload(
        pdfId: string,
        parts: Array<{ PartNumber: number; ETag: string }>
    ): Promise<any> {
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) {
            throw new Error('No access token found');
        }

        const response = await fetch(
            `/api/configurations/signature-pdf/${pdfId}/multipart/complete`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ parts }),
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || errorData.error || 'Failed to complete multipart upload';
            throw new Error(errorMessage);
        }

        return response.json();
    }

    async function abortMultipartUpload(pdfId: string): Promise<void> {
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) {
            return;
        }

        try {
            await fetch(
                `/api/configurations/signature-pdf/${pdfId}/multipart/abort`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
        } catch (abortError) {
            // eslint-disable-next-line no-console
            console.warn('Failed to abort multipart upload:', abortError);
        }
    }

    const handlePdfUpload = async (
        file: File | null,
        type: 'license' | 'insurance' | 'w9'
    ) => {
        if (!file) return;

        // Validate file type
        if (file.type !== 'application/pdf') {
        // eslint-disable-next-line no-console
            console.warn('File type:', file.type);
            notifications.show({
                title: 'Error',
                message: 'Please upload a PDF file',
                color: 'red',
                icon: <IconX size={16} />,
            });
            return;
        }

        // Validate file size (50MB max)
        if (file.size > 50 * 1024 * 1024) {
            notifications.show({
                title: 'Error',
                message: 'File size must be less than 50MB',
                color: 'red',
                icon: <IconX size={16} />,
            });
            return;
        }

        // Always use multipart upload for both license and insurance PDFs
        // This ensures reliable uploads and avoids 413 errors for larger files
        try {
            if (type === 'license') {
                setUploadingLicense(true);
            } else if (type === 'insurance') {
                setUploadingInsurance(true);
            } else {
                setUploadingW9(true);
            }
            setUploadProgress(0);

            const accessToken = localStorage.getItem('access_token');
            if (!accessToken) {
                throw new Error('No access token found');
            }

            // Use multipart upload for all PDFs
            let pdfId: string | null = null;

            try {
                // Initiate multipart upload
                const pdfUpload = await initiateMultipartUpload(file, type);
                pdfId = pdfUpload.id;

                if (!isMountedRef.current) {
                    if (pdfId) {
                        await abortMultipartUpload(pdfId);
                    }
                    return;
                }

                if (!pdfId) {
                    throw new Error('PDF ID not found after initiating upload');
                }

                // Upload file in parts with progress tracking
                const parts = await uploadFileParts(
                    file,
                    pdfId,
                    (uploaded, total) => {
                        if (isMountedRef.current) {
                            setUploadProgress((uploaded / total) * 100);
                        }
                    }
                );

                if (!isMountedRef.current) {
                    if (pdfId) {
                        await abortMultipartUpload(pdfId);
                    }
                    return;
                }

                // Complete multipart upload
                setUploadProgress(95);
                const result = await completeMultipartUpload(pdfId, parts);

                if (!isMountedRef.current) return;

                setUploadProgress(100);

                if (type === 'license') {
                    setLicensePdfUrl(result.pdf_url);
                } else if (type === 'insurance') {
                    setInsurancePdfUrl(result.pdf_url);
                } else {
                    setW9PdfUrl(result.pdf_url);
                }
            } catch (uploadError) {
                // Abort upload on error
                if (pdfId) {
                    await abortMultipartUpload(pdfId);
                }
                throw uploadError;
            }

            setHasChanges(true);

            const typeLabel = type === 'license' ? 'License' : type === 'insurance' ? 'Insurance' : 'W9';
            notifications.show({
                title: 'Success',
                message: `${typeLabel} PDF uploaded successfully`,
                color: 'green',
                icon: <IconCheck size={16} />,
            });
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : 'Failed to upload PDF';
            notifications.show({
                title: 'Error',
                message: errorMessage,
                color: 'red',
                icon: <IconX size={16} />,
            });
        } finally {
            if (type === 'license') {
                setUploadingLicense(false);
            } else if (type === 'insurance') {
                setUploadingInsurance(false);
            } else {
                setUploadingW9(false);
            }
            setUploadProgress(0);
        }
    };

    async function uploadSignatureImage(file: File): Promise<string> {
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) throw new Error('No access token found');
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch('/api/configurations/signature-image', {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
            body: formData,
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || err.detail || 'Failed to upload image');
        }
        const data = await response.json();
        if (!data.url) throw new Error('No URL returned');
        return data.url;
    }

    const handleAddAboutTextBlock = () => {
        setAboutBlocks((prev) => [...prev, { type: 'text', content: '' }]);
        setHasChanges(true);
    };

    const handleAddAboutImageBlock = async (file: File | null) => {
        if (!file || !file.type.startsWith('image/')) {
            notifications.show({ title: 'Error', message: 'Please select an image', color: 'red', icon: <IconX size={16} /> });
            return;
        }
        try {
            const url = await uploadSignatureImage(file);
            setAboutBlocks((prev) => [...prev, { type: 'image', image_url: url }]);
            setHasChanges(true);
            notifications.show({ title: 'Success', message: 'Image added', color: 'green', icon: <IconCheck size={16} /> });
        } catch (err) {
            notifications.show({
                title: 'Error',
                message: err instanceof Error ? err.message : 'Failed to upload image',
                color: 'red',
                icon: <IconX size={16} />,
            });
        }
    };

    const handleRemoveAboutBlock = (index: number) => {
        setAboutBlocks((prev) => prev.filter((_, i) => i !== index));
        setHasChanges(true);
    };

    const moveAboutBlock = (fromIndex: number, toIndex: number) => {
        setAboutBlocks((prev) => {
            if (
                fromIndex < 0 ||
                toIndex < 0 ||
                fromIndex >= prev.length ||
                toIndex >= prev.length ||
                fromIndex === toIndex
            ) {
                return prev;
            }
            const next = [...prev];
            const [moved] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, moved);
            return next;
        });
        setHasChanges(true);
    };

    const moveAboutBlockUp = (index: number) => {
        moveAboutBlock(index, index - 1);
    };

    const moveAboutBlockDown = (index: number) => {
        moveAboutBlock(index, index + 1);
    };

    const handleAboutBlockContentChange = (index: number, content: string) => {
        setAboutBlocks((prev) => {
            const next = [...prev];
            if (next[index].type === 'text') next[index] = { ...next[index], content };
            return next;
        });
        setHasChanges(true);
    };

    const handleAddCuratedProject = () => {
        setPastProjectsCurated((prev) => [
            ...prev,
            { id: `temp-${Date.now()}`, title: '', description: '', image_urls: [] },
        ]);
        setHasChanges(true);
    };

    const handleRemoveCuratedProject = (index: number) => {
        setPastProjectsCurated((prev) => prev.filter((_, i) => i !== index));
        setHasChanges(true);
    };

    const handleCuratedProjectChange = (
        index: number,
        field: keyof PastProject,
        value: string | string[]
    ) => {
        setPastProjectsCurated((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
        setHasChanges(true);
    };

    const handleCuratedProjectImageUpload = async (projectIndex: number, file: File | null) => {
        if (!file || !file.type.startsWith('image/')) return;
        try {
            const url = await uploadSignatureImage(file);
            setPastProjectsCurated((prev) => {
                const next = [...prev];
                const urls = next[projectIndex].image_urls || [];
                next[projectIndex] = { ...next[projectIndex], image_urls: [...urls, url] };
                return next;
            });
            setHasChanges(true);
            notifications.show({ title: 'Success', message: 'Image added', color: 'green', icon: <IconCheck size={16} /> });
        } catch (err) {
            notifications.show({
                title: 'Error',
                message: err instanceof Error ? err.message : 'Failed to upload image',
                color: 'red',
                icon: <IconX size={16} />,
            });
        }
    };

    const handleRemoveCuratedProjectImage = (projectIndex: number, imageIndex: number) => {
        setPastProjectsCurated((prev) => {
            const next = [...prev];
            const urls = [...(next[projectIndex].image_urls || [])];
            urls.splice(imageIndex, 1);
            next[projectIndex] = { ...next[projectIndex], image_urls: urls };
            return next;
        });
        setHasChanges(true);
    };

    // Mock data for preview
    const previewData = {
        contractor: {
            name: 'Sample Contractor',
            email: 'sample@contractor.com',
        },
        signaturePageConfig: {
            show_license: showLicense,
            show_insurance: showInsurance,
            show_w9: showW9,
            show_past_projects: showPastProjects,
            show_about: showAbout,
            license_pdf_url: licensePdfUrl || undefined,
            insurance_pdf_url: insurancePdfUrl || undefined,
            w9_pdf_url: w9PdfUrl || undefined,
            about_text: aboutText,
            about_heading: aboutHeading || undefined,
            about_subheading: aboutSubheading || undefined,
            about_blocks: aboutBlocks.length > 0 ? aboutBlocks : undefined,
            past_projects_count: pastProjectsCount,
            use_curated_past_projects: useCuratedPastProjects,
            past_projects_curated:
                useCuratedPastProjects && pastProjectsCurated.length > 0
                    ? pastProjectsCurated
                    : undefined,
        },
        estimate: {
            id: 'preview',
            contractor_id: 'preview',
            client_id: 'preview',
            title: 'Sample Estimate',
            status: EstimateStatus.ESTIMATE_SENT,
            actual_hours: 0,
            hourly_rate: 0,
            hours_bid: 0,
            estimate_type: 'STANDARD',
            scheduled_date: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: 'preview',
        } as Estimate,
        lineItems: [] as EstimateLineItem[],
        imageResources: [] as EstimateResource[],
        videoResources: [] as EstimateResource[],
    };

    async function openPreviewInNewTab() {
        setOpeningPreview(true);
        try {
            const response = await fetch('/api/signature/ensure-preview-link', {
                method: 'POST',
                headers: getApiHeaders(),
                body: JSON.stringify({
                    signature_page_config: previewData.signaturePageConfig,
                }),
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                notifications.show({
                    title: 'Preview failed',
                    message: err.error || 'Could not open preview',
                    color: 'red',
                });
                return;
            }
            const data = (await response.json()) as { signature_url: string };
            if (data?.signature_url) {
                window.open(data.signature_url, '_blank');
            }
        } catch (e) {
            notifications.show({
                title: 'Preview failed',
                message: e instanceof Error ? e.message : 'Could not open preview',
                color: 'red',
            });
        } finally {
            if (isMountedRef.current) {
                setOpeningPreview(false);
            }
        }
    }

    if (loading) {
        return (
            <Card shadow="sm" padding="lg" withBorder>
                <Stack align="center" gap="md">
                    <Loader size="md" />
                    <Text c="dimmed">Loading configuration...</Text>
                </Stack>
            </Card>
        );
    }

    return (
        <Stack gap="md">
            {error && (
                <Alert color="red" title="Error">
                    {error}
                </Alert>
            )}

            <Card shadow="sm" padding="lg" withBorder>
                <Stack gap="md">
                    <Text size="sm" c="dimmed">
                        Configure what information is displayed on the estimate
                        signature page that clients see.
                    </Text>

                    <Switch
                      label="Show License Information"
                      checked={showLicense}
                      onChange={(e) => {
                            setShowLicense(e.currentTarget.checked);
                            setHasChanges(true);
                        }}
                    />

                    {showLicense && (
                        <Box>
                            <Accordion variant="contained">
                                <Accordion.Item value="license-pdf">
                                    <Accordion.Control icon={<IconFile size={16} />}>
                                        <Group justify="space-between" wrap="nowrap" style={{ width: '100%' }}>
                                            <Text size="sm" fw={500}>
                                                License PDF
                                            </Text>
                                            <Text size="xs" c="dimmed">
                                                {licensePdfUrl ? 'Uploaded' : 'Not uploaded'}
                                            </Text>
                                        </Group>
                                    </Accordion.Control>
                                    <Accordion.Panel>
                                        <Stack gap={2} mb="md">
                                            <Text size="xs" c="dimmed">
                                                Upload a PDF document containing your{' '}
                                                license information.
                                            </Text>
                                            <Text size="xs" c="dimmed">
                                                Max file size: 50MB.
                                            </Text>
                                        </Stack>
                                        <Stack gap="sm">
                                            {licensePdfUrl && (
                                                <Paper p="sm" withBorder>
                                                    <Text size="xs" c="dimmed" mb="xs">
                                                        Preview
                                                    </Text>
                                                    <iframe
                                                      title="License PDF preview"
                                                      src={`${licensePdfUrl}#page=1&view=FitH`}
                                                      style={{
                                                            width: '100%',
                                                            height: 240,
                                                            border: 'none',
                                                            borderRadius: 6,
                                                        }}
                                                    />
                                                    <Button
                                                      component="a"
                                                      href={licensePdfUrl}
                                                      target="_blank"
                                                      size="xs"
                                                      variant="subtle"
                                                      mt="xs"
                                                      fullWidth
                                                    >
                                                        Open PDF in new tab
                                                    </Button>
                                                </Paper>
                                            )}
                                            <Stack gap="xs" style={{ minWidth: 200 }}>
                                                <FileButton
                                                  onChange={(file) => handlePdfUpload(file, 'license')}
                                                  accept="application/pdf"
                                                  disabled={uploadingLicense}
                                                >
                                                    {(props) => (
                                                        <Button
                                                          {...props}
                                                          leftSection={<IconUpload size={16} />}
                                                          loading={uploadingLicense}
                                                          variant="outline"
                                                          fullWidth
                                                        >
                                                            {licensePdfUrl
                                                                ? 'Change License PDF'
                                                                : 'Upload License PDF'}
                                                        </Button>
                                                    )}
                                                </FileButton>
                                                {uploadingLicense && uploadProgress > 0 && (
                                                    <Progress value={uploadProgress} size="sm" />
                                                )}
                                            </Stack>
                                        </Stack>
                                    </Accordion.Panel>
                                </Accordion.Item>
                            </Accordion>
                        </Box>
                    )}

                    <Switch
                      label="Show Insurance Information"
                      checked={showInsurance}
                      onChange={(e) => {
                            setShowInsurance(e.currentTarget.checked);
                            setHasChanges(true);
                        }}
                    />

                    {showInsurance && (
                        <Box>
                            <Accordion variant="contained">
                                <Accordion.Item value="insurance-pdf">
                                    <Accordion.Control icon={<IconFile size={16} />}>
                                        <Group justify="space-between" wrap="nowrap" style={{ width: '100%' }}>
                                            <Text size="sm" fw={500}>
                                                Insurance PDF
                                            </Text>
                                            <Text size="xs" c="dimmed">
                                                {insurancePdfUrl ? 'Uploaded' : 'Not uploaded'}
                                            </Text>
                                        </Group>
                                    </Accordion.Control>
                                    <Accordion.Panel>
                                        <Stack gap={2} mb="md">
                                            <Text size="xs" c="dimmed">
                                                Upload a PDF document containing your{' '}
                                                insurance information.
                                            </Text>
                                            <Text size="xs" c="dimmed">
                                                Max file size: 50MB.
                                            </Text>
                                        </Stack>
                                        <Stack gap="sm">
                                            {insurancePdfUrl && (
                                                <Paper p="sm" withBorder>
                                                    <Text size="xs" c="dimmed" mb="xs">
                                                        Preview
                                                    </Text>
                                                    <iframe
                                                      title="Insurance PDF preview"
                                                      src={`${insurancePdfUrl}#page=1&view=FitH`}
                                                      style={{
                                                            width: '100%',
                                                            height: 240,
                                                            border: 'none',
                                                            borderRadius: 6,
                                                        }}
                                                    />
                                                    <Button
                                                      component="a"
                                                      href={insurancePdfUrl}
                                                      target="_blank"
                                                      size="xs"
                                                      variant="subtle"
                                                      mt="xs"
                                                      fullWidth
                                                    >
                                                        Open PDF in new tab
                                                    </Button>
                                                </Paper>
                                            )}
                                            <Stack gap="xs" style={{ minWidth: 200 }}>
                                                <FileButton
                                                  onChange={(file) => handlePdfUpload(file, 'insurance')}
                                                  accept="application/pdf"
                                                  disabled={uploadingInsurance}
                                                >
                                                    {(props) => (
                                                        <Button
                                                          {...props}
                                                          leftSection={<IconUpload size={16} />}
                                                          loading={uploadingInsurance}
                                                          variant="outline"
                                                          fullWidth
                                                        >
                                                            {insurancePdfUrl
                                                                ? 'Change Insurance PDF'
                                                                : 'Upload Insurance PDF'}
                                                        </Button>
                                                    )}
                                                </FileButton>
                                                {uploadingInsurance && uploadProgress > 0 && (
                                                    <Progress value={uploadProgress} size="sm" />
                                                )}
                                            </Stack>
                                        </Stack>
                                    </Accordion.Panel>
                                </Accordion.Item>
                            </Accordion>
                        </Box>
                    )}

                    <Switch
                      label="Show W9 Form"
                      checked={showW9}
                      onChange={(e) => {
                            setShowW9(e.currentTarget.checked);
                            setHasChanges(true);
                        }}
                    />

                    {showW9 && (
                        <Box>
                            <Accordion variant="contained">
                                <Accordion.Item value="w9-pdf">
                                    <Accordion.Control icon={<IconFile size={16} />}>
                                        <Group justify="space-between" wrap="nowrap" style={{ width: '100%' }}>
                                            <Text size="sm" fw={500}>
                                                W9 PDF
                                            </Text>
                                            <Text size="xs" c="dimmed">
                                                {w9PdfUrl ? 'Uploaded' : 'Not uploaded'}
                                            </Text>
                                        </Group>
                                    </Accordion.Control>
                                    <Accordion.Panel>
                                        <Stack gap={2} mb="md">
                                            <Text size="xs" c="dimmed">
                                                Upload a PDF document containing your W9 form.
                                            </Text>
                                            <Text size="xs" c="dimmed">
                                                Max file size: 50MB.
                                            </Text>
                                        </Stack>
                                        <Stack gap="sm">
                                            {w9PdfUrl && (
                                                <Paper p="sm" withBorder>
                                                    <Text size="xs" c="dimmed" mb="xs">
                                                        Preview
                                                    </Text>
                                                    <iframe
                                                      title="W9 PDF preview"
                                                      src={`${w9PdfUrl}#page=1&view=FitH`}
                                                      style={{
                                                            width: '100%',
                                                            height: 240,
                                                            border: 'none',
                                                            borderRadius: 6,
                                                        }}
                                                    />
                                                    <Button
                                                      component="a"
                                                      href={w9PdfUrl}
                                                      target="_blank"
                                                      size="xs"
                                                      variant="subtle"
                                                      mt="xs"
                                                      fullWidth
                                                    >
                                                        Open PDF in new tab
                                                    </Button>
                                                </Paper>
                                            )}
                                            <Stack gap="xs" style={{ minWidth: 200 }}>
                                                <FileButton
                                                  onChange={(file) => handlePdfUpload(file, 'w9')}
                                                  accept="application/pdf"
                                                  disabled={uploadingW9}
                                                >
                                                    {(props) => (
                                                        <Button
                                                          {...props}
                                                          leftSection={<IconUpload size={16} />}
                                                          loading={uploadingW9}
                                                          variant="outline"
                                                          fullWidth
                                                        >
                                                            {w9PdfUrl ? 'Change W9 PDF' : 'Upload W9 PDF'}
                                                        </Button>
                                                    )}
                                                </FileButton>
                                                {uploadingW9 && uploadProgress > 0 && (
                                                    <Progress value={uploadProgress} size="sm" />
                                                )}
                                            </Stack>
                                        </Stack>
                                    </Accordion.Panel>
                                </Accordion.Item>
                            </Accordion>
                        </Box>
                    )}

                    <Switch
                      label="Show About Section"
                      checked={showAbout}
                      onChange={(e) => {
                            setShowAbout(e.currentTarget.checked);
                            setHasChanges(true);
                        }}
                    />

                    {showAbout && (
                        <Box>
                            <TextInput
                              label="About heading"
                              placeholder="e.g. About RL Peek Painting"
                              description="Main title shown at the top of the About section. Leave blank to use “About [Company Name]”."
                              value={aboutHeading}
                              onChange={(e) => {
                                    setAboutHeading(e.target.value);
                                    setHasChanges(true);
                                }}
                              mb="md"
                            />
                            <TextInput
                              label="About subheading"
                              placeholder="e.g. Summit and Wasatch County painting contractor..."
                              description="Optional tagline or short description under the heading."
                              value={aboutSubheading}
                              onChange={(e) => {
                                    setAboutSubheading(e.target.value);
                                    setHasChanges(true);
                                }}
                              mb="md"
                            />
                            <Text size="sm" fw={500} mb="xs">
                                About content (text and images)
                            </Text>
                            <Text size="xs" c="dimmed" mb="sm">
                                Add text blocks and images in order.
                                You can also keep simple text below for backward compatibility.
                            </Text>
                            <Stack gap="sm">
                                {aboutBlocks.map((block, index) => (
                                    <Paper
                                      key={index}
                                      p="md"
                                      withBorder
                                      onDragOver={(e) => {
                                            e.preventDefault();
                                        }}
                                      onDrop={() => {
                                            if (draggingAboutIndex === null) return;
                                            moveAboutBlock(draggingAboutIndex, index);
                                            setDraggingAboutIndex(null);
                                        }}
                                      style={{
                                            outline:
                                                draggingAboutIndex === index
                                                    ? '2px solid var(--mantine-color-blue-5)'
                                                    : undefined,
                                        }}
                                    >
                                        <Stack gap="xs">
                                            {block.type === 'text' ? (
                                                <>
                                                    <Group justify="space-between" wrap="nowrap">
                                                        <Group gap="xs" wrap="nowrap">
                                                            <ActionIcon
                                                              variant="subtle"
                                                              aria-label="Drag to reorder"
                                                              draggable
                                                              onDragStart={() => {
                                                                    setDraggingAboutIndex(index);
                                                                }}
                                                              onDragEnd={() => {
                                                                    setDraggingAboutIndex(null);
                                                                }}
                                                              style={{ cursor: 'grab' }}
                                                            >
                                                                <IconGripVertical
                                                                  size={16}
                                                                  style={{ opacity: 0.7 }}
                                                                />
                                                            </ActionIcon>
                                                            <Text fw={500} size="sm">
                                                                Text block
                                                            </Text>
                                                        </Group>
                                                        <Button
                                                          size="xs"
                                                          variant="subtle"
                                                          color="red"
                                                          onClick={
                                                            () => handleRemoveAboutBlock(index)
                                                          }
                                                        >
                                                            <IconTrash size={14} />
                                                        </Button>
                                                    </Group>
                                                    <Group justify="space-between" wrap="nowrap">
                                                        <Group gap={6} wrap="nowrap">
                                                            <ActionIcon
                                                              variant="subtle"
                                                              aria-label="Move up"
                                                              disabled={index === 0}
                                                              onClick={() => {
                                                                    moveAboutBlockUp(index);
                                                                }}
                                                            >
                                                                <IconChevronUp size={16} />
                                                            </ActionIcon>
                                                            <ActionIcon
                                                              variant="subtle"
                                                              aria-label="Move down"
                                                              disabled={
                                                                    index === aboutBlocks.length - 1
                                                                }
                                                              onClick={() => {
                                                                    moveAboutBlockDown(index);
                                                                }}
                                                            >
                                                                <IconChevronDown size={16} />
                                                            </ActionIcon>
                                                        </Group>
                                                        <Text size="xs" c="dimmed">
                                                            Drag to reorder
                                                        </Text>
                                                    </Group>
                                                    <Text c="dimmed" size="xs">
                                                        Use the toolbar to format text.
                                                        Line breaks are preserved.
                                                    </Text>
                                                    <RichTextBodyEditor
                                                      value={block.content || ''}
                                                      onChange={(nextValue) =>
                                                          handleAboutBlockContentChange(
                                                            index,
                                                            nextValue,
                                                        )
                                                      }
                                                    />
                                                </>
                                            ) : (
                                                <Stack gap="xs">
                                                    <Group justify="space-between" wrap="nowrap">
                                                        <Group gap="xs" wrap="nowrap">
                                                            <ActionIcon
                                                              variant="subtle"
                                                              aria-label="Drag to reorder"
                                                              draggable
                                                              onDragStart={() => {
                                                                    setDraggingAboutIndex(index);
                                                                }}
                                                              onDragEnd={() => {
                                                                    setDraggingAboutIndex(null);
                                                                }}
                                                              style={{ cursor: 'grab' }}
                                                            >
                                                                <IconGripVertical
                                                                  size={16}
                                                                  style={{ opacity: 0.7 }}
                                                                />
                                                            </ActionIcon>
                                                            <Text fw={500} size="sm">
                                                                Image block
                                                            </Text>
                                                        </Group>
                                                        <Button
                                                          size="xs"
                                                          variant="subtle"
                                                          color="red"
                                                          onClick={() => {
                                                                handleRemoveAboutBlock(index);
                                                            }}
                                                        >
                                                            <IconTrash size={14} />
                                                        </Button>
                                                    </Group>
                                                    <Group justify="space-between" wrap="nowrap">
                                                        <Group gap={6} wrap="nowrap">
                                                            <ActionIcon
                                                              variant="subtle"
                                                              aria-label="Move up"
                                                              disabled={index === 0}
                                                              onClick={() => {
                                                                    moveAboutBlockUp(index);
                                                                }}
                                                            >
                                                                <IconChevronUp size={16} />
                                                            </ActionIcon>
                                                            <ActionIcon
                                                              variant="subtle"
                                                              aria-label="Move down"
                                                              disabled={
                                                                    index === aboutBlocks.length - 1
                                                                }
                                                              onClick={() => {
                                                                    moveAboutBlockDown(index);
                                                                }}
                                                            >
                                                                <IconChevronDown size={16} />
                                                            </ActionIcon>
                                                        </Group>
                                                        <Text size="xs" c="dimmed">
                                                            Drag to reorder
                                                        </Text>
                                                    </Group>
                                                    {block.image_url && (
                                                        <img
                                                          src={block.image_url}
                                                          alt=""
                                                          style={{
                                                                maxWidth: 240,
                                                                maxHeight: 160,
                                                                objectFit: 'contain',
                                                                borderRadius: 6,
                                                            }}
                                                        />
                                                    )}
                                                </Stack>
                                            )}
                                        </Stack>
                                    </Paper>
                                ))}
                                <Group gap="xs">
                                    <Button
                                      size="xs"
                                      variant="light"
                                      leftSection={<IconPlus size={14} />}
                                      onClick={handleAddAboutTextBlock}
                                    >
                                        Add text block
                                    </Button>
                                    <FileButton
                                      onChange={handleAddAboutImageBlock}
                                      accept="image/*"
                                    >
                                        {(props) => (
                                            <Button
                                              {...props}
                                              size="xs"
                                              variant="light"
                                              leftSection={<IconPhotoPlus size={14} />}
                                            >
                                                Add image
                                            </Button>
                                        )}
                                    </FileButton>
                                </Group>
                            </Stack>
                            <Stack gap="xs" mt="md">
                                <Text fw={500} size="sm">
                                    Simple about text (fallback if no blocks)
                                </Text>
                                <Text c="dimmed" size="xs">
                                    Or enter a single block of text.
                                    Leave empty if using blocks above.
                                </Text>
                                <Textarea
                                  placeholder="Enter a single block of text..."
                                  value={aboutText}
                                  onChange={(e) => {
                                        setAboutText(e.target.value);
                                        setHasChanges(true);
                                    }}
                                  minRows={6}
                                />
                            </Stack>
                        </Box>
                    )}

                    <Switch
                      label="Show Past Projects"
                      checked={showPastProjects}
                      onChange={(e) => {
                            setShowPastProjects(e.currentTarget.checked);
                            setHasChanges(true);
                        }}
                    />

                    {showPastProjects && (
                        <>
                            <Switch
                              label="Use curated portfolio"
                              description="Show hand-picked projects with images and descriptions instead of auto-pulled completed estimates"
                              checked={useCuratedPastProjects}
                              onChange={(e) => {
                                    setUseCuratedPastProjects(e.currentTarget.checked);
                                    setHasChanges(true);
                                }}
                            />
                            {useCuratedPastProjects ? (
                                <Box>
                                    <Text size="sm" fw={500} mb="xs">
                                        Curated projects
                                    </Text>
                                    <Stack gap="md">
                                        {pastProjectsCurated.map((project, index) => (
                                            <Paper key={project.id} p="md" withBorder>
                                                <Stack gap="xs">
                                                    <Group justify="space-between">
                                                        <Text size="sm" fw={500}>
                                                            Project {index + 1}
                                                        </Text>
                                                        <Button
                                                          size="xs"
                                                          variant="subtle"
                                                          color="red"
                                                          onClick={() =>
                                                            handleRemoveCuratedProject(index)
                                                          }
                                                        >
                                                            <IconTrash size={14} /> Remove
                                                        </Button>
                                                    </Group>
                                                    <TextInput
                                                      label="Title"
                                                      placeholder="Project title"
                                                      value={project.title || ''}
                                                      onChange={(e) =>
                                                          handleCuratedProjectChange(
                                                              index,
                                                              'title',
                                                              e.currentTarget.value
                                                          )
                                                      }
                                                    />
                                                    <Stack gap="xs">
                                                        <Text fw={500} size="sm">
                                                            Description
                                                        </Text>
                                                        <Text c="dimmed" size="xs">
                                                            Use the toolbar to format text.
                                                            Line breaks are preserved.
                                                        </Text>
                                                        <RichTextBodyEditor
                                                          value={project.description || ''}
                                                          onChange={(nextValue) =>
                                                              handleCuratedProjectChange(
                                                                  index,
                                                                  'description',
                                                                  nextValue
                                                              )
                                                          }
                                                        />
                                                    </Stack>
                                                    <Stack gap="xs">
                                                        <Text size="sm" fw={500}>
                                                            Image gallery
                                                        </Text>
                                                        <Text size="xs" c="dimmed">
                                                            Add multiple images to showcase this
                                                            project. Shown as a gallery to clients.
                                                        </Text>
                                                        {Array.isArray(project.image_urls) &&
                                                            project.image_urls.length > 0 && (
                                                            <SimpleGrid
                                                              cols={{ base: 3, sm: 4, md: 5 }}
                                                              spacing="sm"
                                                              verticalSpacing="sm"
                                                            >
                                                                {project.image_urls.map(
                                                                    (url, i) => {
                                                                        /* eslint-disable max-len */
                                                                        const removeImage = () => {
                                                                            handleRemoveCuratedProjectImage(
                                                                                index,
                                                                                i
                                                                            );
                                                                        };
                                                                        /* eslint-enable max-len */
                                                                        return (
                                                                    <Box
                                                                      key={i}
                                                                      pos="relative"
                                                                      style={{
                                                                          borderRadius: 8,
                                                                          overflow: 'hidden',
                                                                          aspectRatio: '1',
                                                                      }}
                                                                    >
                                                                        <img
                                                                          src={url}
                                                                          alt=""
                                                                          style={{
                                                                              width: '100%',
                                                                              height: '100%',
                                                                              objectFit: 'cover',
                                                                              display: 'block',
                                                                          }}
                                                                        />
                                                                        <ActionIcon
                                                                          size="sm"
                                                                          color="red"
                                                                          variant="filled"
                                                                          pos="absolute"
                                                                          top={4}
                                                                          right={4}
                                                                          onClick={removeImage}
                                                                          aria-label="Remove"
                                                                        >
                                                                            <IconTrash size={12} />
                                                                        </ActionIcon>
                                                                    </Box>
                                                                        );
                                                                    }
                                                                )}
                                                            </SimpleGrid>
                                                        )}
                                                        <FileButton
                                                          onChange={(file) =>
                                                              handleCuratedProjectImageUpload(
                                                                  index,
                                                                  file,
                                                              )
                                                          }
                                                          accept="image/*"
                                                        >
                                                            {(props) => (
                                                                <Button
                                                                  {...props}
                                                                  size="xs"
                                                                  variant="light"
                                                                  leftSection={
                                                                      <IconPhotoPlus size={14} />
                                                                  }
                                                                >
                                                                    {Array.isArray(
                                                                        project.image_urls
                                                                    ) &&
                                                                    project.image_urls
                                                                        .length > 0
                                                                        ? 'Add another image'
                                                                        : 'Add images to gallery'}
                                                                </Button>
                                                            )}
                                                        </FileButton>
                                                    </Stack>
                                                </Stack>
                                            </Paper>
                                        ))}
                                        <Button
                                          size="sm"
                                          variant="light"
                                          leftSection={<IconPlus size={16} />}
                                          onClick={handleAddCuratedProject}
                                        >
                                            Add project
                                        </Button>
                                    </Stack>
                                </Box>
                            ) : (
                                <NumberInput
                                  label="Number of Past Projects to Display"
                                  description="How many completed projects to show on the signature page"
                                  value={pastProjectsCount}
                                  onChange={(value) => {
                                        setPastProjectsCount(typeof value === 'number' ? value : 5);
                                        setHasChanges(true);
                                    }}
                                  min={1}
                                  max={20}
                                />
                            )}
                        </>
                    )}

                    <Divider my="md" />

                    <Group justify="space-between">
                        <Button
                          leftSection={<IconEye size={16} />}
                          variant="light"
                          onClick={openPreviewInNewTab}
                          loading={openingPreview}
                          disabled={openingPreview}
                        >
                            Preview in new tab
                        </Button>
                        <Button
                          onClick={handleSave}
                          disabled={!hasChanges || saving}
                          loading={saving}
                        >
                            Save Changes
                        </Button>
                    </Group>
                </Stack>
            </Card>
        </Stack>
    );
}
