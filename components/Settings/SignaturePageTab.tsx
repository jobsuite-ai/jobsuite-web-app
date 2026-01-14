'use client';

import { useEffect, useRef, useState } from 'react';

import {
    Button,
    Card,
    Group,
    Stack,
    Text,
    Switch,
    Textarea,
    NumberInput,
    FileButton,
    Box,
    Divider,
    Alert,
    Loader,
    Paper,
    Title,
    Container,
    Progress,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX, IconUpload, IconEye, IconFile } from '@tabler/icons-react';

import { getApiHeaders } from '@/app/utils/apiClient';
import { EstimateLineItem } from '@/components/EstimateDetails/estimate/LineItem';
import EstimateSignaturePreview from '@/components/EstimateDetails/signature/EstimateSignaturePreview';
import SignaturePageSections from '@/components/EstimateDetails/signature/SignaturePageSections';
import { Estimate, EstimateResource, EstimateStatus } from '@/components/Global/model';

interface SignaturePageConfig {
    show_license: boolean;
    show_insurance: boolean;
    show_past_projects: boolean;
    show_about: boolean;
    license_pdf_url?: string;
    license_pdf_s3_key?: string;
    insurance_pdf_url?: string;
    insurance_pdf_s3_key?: string;
    about_text: string;
    past_projects_count: number;
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
    const [showPreview, setShowPreview] = useState(false);

    // Signature page configuration state
    const [showLicense, setShowLicense] = useState(false);
    const [showInsurance, setShowInsurance] = useState(false);
    const [showPastProjects, setShowPastProjects] = useState(false);
    const [showAbout, setShowAbout] = useState(false);
    const [licensePdfUrl, setLicensePdfUrl] = useState<string | null>(null);
    const [insurancePdfUrl, setInsurancePdfUrl] = useState<string | null>(null);
    const [aboutText, setAboutText] = useState('');
    const [pastProjectsCount, setPastProjectsCount] = useState(5);
    const [uploadingLicense, setUploadingLicense] = useState(false);
    const [uploadingInsurance, setUploadingInsurance] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const isMountedRef = useRef(true);

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
                        show_past_projects: false,
                        show_about: false,
                        about_text: '',
                        past_projects_count: 5,
                    };
                setShowLicense(sigConfig.show_license || false);
                setShowInsurance(sigConfig.show_insurance || false);
                setShowPastProjects(sigConfig.show_past_projects || false);
                setShowAbout(sigConfig.show_about || false);
                setLicensePdfUrl(sigConfig.license_pdf_url || null);
                setInsurancePdfUrl(sigConfig.insurance_pdf_url || null);
                setAboutText(sigConfig.about_text || '');
                setPastProjectsCount(sigConfig.past_projects_count || 5);
            } else {
                setConfigId(null);
                // Reset to defaults
                setShowLicense(false);
                setShowInsurance(false);
                setShowPastProjects(false);
                setShowAbout(false);
                setLicensePdfUrl(null);
                setInsurancePdfUrl(null);
                setAboutText('');
                setPastProjectsCount(5);
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
                        show_past_projects: showPastProjects,
                        show_about: showAbout,
                        license_pdf_url: licensePdfUrl,
                        insurance_pdf_url: insurancePdfUrl,
                        about_text: aboutText,
                        past_projects_count: pastProjectsCount,
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
        type: 'license' | 'insurance'
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
        type: 'license' | 'insurance'
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

        // Use multipart upload for files larger than 10MB, or always use multipart for consistency
        const USE_MULTIPART_THRESHOLD = 10 * 1024 * 1024; // 10MB
        const useMultipart = file.size > USE_MULTIPART_THRESHOLD;

        try {
            if (type === 'license') {
                setUploadingLicense(true);
            } else {
                setUploadingInsurance(true);
            }
            setUploadProgress(0);

            const accessToken = localStorage.getItem('access_token');
            if (!accessToken) {
                throw new Error('No access token found');
            }

            if (useMultipart) {
                // Use multipart upload for large files
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
                    } else {
                        setInsurancePdfUrl(result.pdf_url);
                    }
                } catch (uploadError) {
                    // Abort upload on error
                    if (pdfId) {
                        await abortMultipartUpload(pdfId);
                    }
                    throw uploadError;
                }
            } else {
                // Use simple upload for small files
                const formData = new FormData();
                formData.append('file', file);
                formData.append('type', type);

                const response = await fetch('/api/configurations/signature-pdf', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                    body: formData,
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    const errorMsg = errorData.message || errorData.detail || 'Failed to upload PDF';
                    throw new Error(errorMsg);
                }

                const data = await response.json();
                if (type === 'license') {
                    setLicensePdfUrl(data.pdf_url);
                } else {
                    setInsurancePdfUrl(data.pdf_url);
                }
            }

            setHasChanges(true);

            notifications.show({
                title: 'Success',
                message: `${type === 'license' ? 'License' : 'Insurance'} PDF uploaded successfully`,
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
            } else {
                setUploadingInsurance(false);
            }
            setUploadProgress(0);
        }
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
            show_past_projects: showPastProjects,
            show_about: showAbout,
            license_info: licensePdfUrl ? 'PDF uploaded' : '',
            insurance_info: insurancePdfUrl ? 'PDF uploaded' : '',
            about_text: aboutText,
            past_projects_count: pastProjectsCount,
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
                            <Text size="sm" fw={500} mb="xs">
                                License PDF
                            </Text>
                            <Text size="xs" c="dimmed" mb="md">
                                Upload a PDF document containing your license information.
                                Max file size: 50MB.
                            </Text>
                            <Group gap="md" align="flex-start">
                                {licensePdfUrl && (
                                    <Paper p="sm" withBorder style={{ maxWidth: 200 }}>
                                        <Group gap="xs">
                                            <IconFile size={24} color="red" />
                                            <Text size="sm" truncate>
                                                License PDF
                                            </Text>
                                        </Group>
                                        <Button
                                          component="a"
                                          href={licensePdfUrl}
                                          target="_blank"
                                          size="xs"
                                          variant="subtle"
                                          mt="xs"
                                          fullWidth
                                        >
                                            View PDF
                                        </Button>
                                    </Paper>
                                )}
                                <Stack gap="xs" style={{ flex: 1 }}>
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
                                            >
                                                {licensePdfUrl ? 'Change License PDF' : 'Upload License PDF'}
                                            </Button>
                                        )}
                                    </FileButton>
                                    {uploadingLicense && uploadProgress > 0 && (
                                        <Progress value={uploadProgress} size="sm" />
                                    )}
                                </Stack>
                            </Group>
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
                            <Text size="sm" fw={500} mb="xs">
                                Insurance PDF
                            </Text>
                            <Text size="xs" c="dimmed" mb="md">
                                Upload a PDF document containing your insurance information.
                                Max file size: 50MB.
                            </Text>
                            <Group gap="md" align="flex-start">
                                {insurancePdfUrl && (
                                    <Paper p="sm" withBorder style={{ maxWidth: 200 }}>
                                        <Group gap="xs">
                                            <IconFile size={24} color="red" />
                                            <Text size="sm" truncate>
                                                Insurance PDF
                                            </Text>
                                        </Group>
                                        <Button
                                          component="a"
                                          href={insurancePdfUrl}
                                          target="_blank"
                                          size="xs"
                                          variant="subtle"
                                          mt="xs"
                                          fullWidth
                                        >
                                            View PDF
                                        </Button>
                                    </Paper>
                                )}
                                <Stack gap="xs" style={{ flex: 1 }}>
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
                                            >
                                                {insurancePdfUrl ? 'Change Insurance PDF' : 'Upload Insurance PDF'}
                                            </Button>
                                        )}
                                    </FileButton>
                                    {uploadingInsurance && uploadProgress > 0 && (
                                        <Progress value={uploadProgress} size="sm" />
                                    )}
                                </Stack>
                            </Group>
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
                        <Textarea
                          label="About Text"
                          placeholder="Enter information about your company..."
                          value={aboutText}
                          onChange={(e) => {
                                setAboutText(e.target.value);
                                setHasChanges(true);
                            }}
                          minRows={4}
                        />
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

                    <Divider my="md" />

                    <Group justify="space-between">
                        <Button
                          leftSection={<IconEye size={16} />}
                          variant="light"
                          onClick={() => setShowPreview(!showPreview)}
                        >
                            {showPreview ? 'Hide Preview' : 'Show Preview'}
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

            {showPreview && (
                <Card shadow="sm" padding="lg" withBorder>
                    <Title order={3} mb="md">
                        Signature Page Preview
                    </Title>
                    <Container size="lg" py="xl" style={{ border: '1px solid #dee2e6', borderRadius: '4px' }}>
                        <Stack gap="xl">
                            <Paper shadow="xs" p="md" radius="md" withBorder>
                                <Title order={3}>{previewData.contractor.name}</Title>
                                <Text c="dimmed" size="sm">
                                    {previewData.contractor.email}
                                </Text>
                            </Paper>

                            <EstimateSignaturePreview
                              estimate={previewData.estimate}
                              imageResources={previewData.imageResources}
                              videoResources={previewData.videoResources}
                              lineItems={previewData.lineItems}
                            />

                            <SignaturePageSections
                              contractor={previewData.contractor}
                              signaturePageConfig={previewData.signaturePageConfig}
                              signatureHash="preview"
                            />
                        </Stack>
                    </Container>
                </Card>
            )}
        </Stack>
    );
}
