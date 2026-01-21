'use client';

import { useEffect, useState } from 'react';

import {
    Alert,
    Button,
    Paper,
    Stack,
    Text,
    Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconExternalLink, IconCheck, IconSignature } from '@tabler/icons-react';

import SignatureForm from './signature/SignatureForm';

import { getApiHeaders } from '@/app/utils/apiClient';
import { useAuth } from '@/hooks/useAuth';

interface SignatureInfo {
    estimate_id: string;
    signature_links: Array<{
        id: string;
        signature_hash: string;
        client_email: string;
        status: string;
    }>;
    signatures: Array<{
        id: string;
        signature_type: string;
        signer_name: string;
        signer_email: string;
        signed_at: string;
    }>;
}

interface ContractorConfiguration {
    id: string;
    user_id: string;
    contractor_id: string;
    settings: Record<string, any>;
    configuration_type: string;
    configuration: Record<string, any>;
    edited: any[];
    services: string[];
    updated_at: string;
}

interface ContractorSignatureRequiredProps {
    estimateId: string;
    onSignatureComplete: () => void;
}

export default function ContractorSignatureRequired({
    estimateId,
    onSignatureComplete,
}: ContractorSignatureRequiredProps) {
    const { user } = useAuth({ fetchUser: true });
    const [loading, setLoading] = useState(true);
    const [signatureInfo, setSignatureInfo] = useState<SignatureInfo | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [signed, setSigned] = useState(false);
    const [contractorSignatureHash, setContractorSignatureHash] = useState<string | null>(null);
    const [signatureModalOpened, setSignatureModalOpened] = useState(false);
    const [contractorEmail, setContractorEmail] = useState<string | null>(null);
    const [contractorName, setContractorName] = useState<string | null>(null);

    const userEmail = user?.email || null;

    // Fetch contractor configuration to get contractor email and name
    useEffect(() => {
        const fetchContractorConfig = async () => {
            try {
                const response = await fetch(
                    '/api/configurations?config_type=contractor_config',
                    {
                        method: 'GET',
                        headers: getApiHeaders(),
                    }
                );

                if (response.ok) {
                    const configs: ContractorConfiguration[] = await response.json();
                    const config = configs.find(
                        (c) => c.configuration_type === 'contractor_config'
                    );

                    if (config) {
                        // Use contractor settings if available, otherwise fall back to user details
                        const email =
                            config.configuration?.client_communication_email ||
                            user?.email ||
                            null;
                        const name =
                            config.configuration?.client_communication_name ||
                            user?.full_name ||
                            user?.email ||
                            null;
                        setContractorEmail(email);
                        setContractorName(name);
                    } else {
                        // No config found, use user details as fallback
                        setContractorEmail(user?.email || null);
                        setContractorName(user?.full_name || user?.email || null);
                    }
                } else {
                    // API error, use user details as fallback
                    setContractorEmail(user?.email || null);
                    setContractorName(user?.full_name || user?.email || null);
                }
            } catch (err) {
                // Error fetching config, use user details as fallback
                // eslint-disable-next-line no-console
                console.error('Error fetching contractor configuration:', err);
                setContractorEmail(user?.email || null);
                setContractorName(user?.full_name || user?.email || null);
            }
        };

        if (user) {
            fetchContractorConfig();
        }
    }, [user]);

    useEffect(() => {
        fetchSignatures();
    }, [estimateId, userEmail]);

    const fetchSignatures = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(
                `/api/estimates/${estimateId}/signatures`,
                {
                    method: 'GET',
                    headers: getApiHeaders(),
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to fetch signatures');
            }

            const data = await response.json();
            setSignatureInfo(data);

            // Check if contractor has already signed (only valid signatures)
            // Filter out invalidated signatures from re-sends
            const validSignatures = (data.signatures || []).filter(
                (sig: any) => sig.is_valid !== false
            );
            const contractorSignature = validSignatures.find(
                (sig: any) => sig.signature_type === 'CONTRACTOR'
            );
            const clientSignature = validSignatures.find(
                (sig: any) => sig.signature_type === 'CLIENT'
            );

            // Only mark as signed if BOTH parties have valid signatures
            if (contractorSignature && clientSignature) {
                setSigned(true);
                return;
            }

            // If contractor hasn't signed, check if we need to generate a signature link
            // Look for an existing contractor signature link, or use client's link
            const contractorLink = data.signature_links?.find(
                (link: any) => link.client_email === userEmail
            );
            const clientSignedLink = data.signature_links?.find(
                (link: any) => link.status === 'SIGNED'
            );

            // Use contractor's link if exists, otherwise use client's signed link
            // (contractors can sign using client's link hash with CONTRACTOR type)
            if (contractorLink) {
                setContractorSignatureHash(contractorLink.signature_hash);
            } else if (clientSignedLink) {
                setContractorSignatureHash(clientSignedLink.signature_hash);
            } else if (userEmail) {
                // Generate a signature link for the contractor
                await generateContractorSignatureLink();
            }
        } catch (err: any) {
            // eslint-disable-next-line no-console
            console.error('Error fetching signatures:', err);
            setError(err.message || 'Failed to load signature information');
        } finally {
            setLoading(false);
        }
    };

    const generateContractorSignatureLink = async () => {
        if (!userEmail) return;

        try {
            const response = await fetch(
                `/api/estimates/${estimateId}/signature-links`,
                {
                    method: 'POST',
                    headers: getApiHeaders(),
                    body: JSON.stringify({
                        client_email: userEmail,
                        expires_in_days: 30,
                    }),
                }
            );

            if (response.ok) {
                const data = await response.json();
                setContractorSignatureHash(data.signature_hash);
            } else {
                // If generation fails, we can still use client's link
                // eslint-disable-next-line no-console
                console.warn('Failed to generate contractor signature link, will use client link');
            }
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Error generating contractor signature link:', err);
        }
    };

    const handleSignatureSuccess = async () => {
        setSigned(true);
        notifications.show({
            title: 'Success',
            message: 'Estimate signed successfully',
            color: 'green',
            icon: <IconCheck size={16} />,
        });
        // Refresh signatures to get updated status
        await fetchSignatures();

        // Note: PDF generation and storage is handled automatically by the backend
        // when signatures are recorded via _generate_and_store_pdf_after_signature.
        // No need to generate/upload PDF from the frontend.

        onSignatureComplete();
    };

    if (loading) {
        return (
            <Paper shadow="sm" p="xl" radius="md" withBorder>
                <Stack align="center" gap="md">
                    <Text c="dimmed">Loading signature information...</Text>
                </Stack>
            </Paper>
        );
    }

    if (error) {
        return (
            <Paper shadow="sm" p="xl" radius="md" withBorder>
                <Alert color="red" title="Error">
                    {error}
                </Alert>
            </Paper>
        );
    }

    if (signed) {
        // Filter to only valid signatures
        const validSignatures = (signatureInfo?.signatures || []).filter(
            (sig: any) => sig.is_valid !== false
        );
        const contractorSignature = validSignatures.find(
            (sig) => sig.signature_type === 'CONTRACTOR'
        );
        const clientSignature = validSignatures.find(
            (sig) => sig.signature_type === 'CLIENT'
        );

        // Find the most recent active (SIGNED and not REVOKED) signature link to generate view URL
        const activeLinks = (signatureInfo?.signature_links || []).filter(
            (link: any) => link.status === 'SIGNED' && link.status !== 'REVOKED' && link.status !== 'EXPIRED'
        );
        // Sort by created_at descending to get the most recent
        activeLinks.sort((a: any, b: any) => {
            const dateA = new Date(a.created_at || 0).getTime();
            const dateB = new Date(b.created_at || 0).getTime();
            return dateB - dateA;
        });
        const activeLink = activeLinks[0];

        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://jobsuite.app';
        const signedEstimateUrl = activeLink ? `${baseUrl}/sign/${activeLink.signature_hash}` : null;

        return (
            <Paper shadow="sm" p="xl" radius="md" withBorder>
                <Stack align="center" gap="md">
                    <IconCheck size={48} color="green" />
                    <Title order={3}>Estimate Signed</Title>
                    <Text c="dimmed" ta="center">
                        This estimate has been signed by both parties.
                        The signed PDF has been automatically generated and stored.
                    </Text>
                    {contractorSignature && (
                        <Text size="sm" c="dimmed">
                            Contractor: {contractorSignature.signer_name || contractorSignature.signer_email} on{' '}
                            {new Date(contractorSignature.signed_at).toLocaleDateString()}
                        </Text>
                    )}
                    {clientSignature && (
                        <Text size="sm" c="dimmed">
                            Client: {clientSignature.signer_name || clientSignature.signer_email} on{' '}
                            {new Date(clientSignature.signed_at).toLocaleDateString()}
                        </Text>
                    )}
                    {signedEstimateUrl && (
                        <Button
                          component="a"
                          href={signedEstimateUrl}
                          target="_blank"
                          variant="light"
                          leftSection={<IconExternalLink size={16} />}
                          mt="md"
                        >
                            View Signed Estimate
                        </Button>
                    )}
                </Stack>
            </Paper>
        );
    }

    // Check if client has signed (only valid signatures)
    const validSignatures = (signatureInfo?.signatures || []).filter(
        (sig: any) => sig.is_valid !== false
    );
    const clientSignature = validSignatures.find(
        (sig) => sig.signature_type === 'CLIENT'
    );
    const clientSignatureLink = signatureInfo?.signature_links?.find(
        (link) => link.status === 'SIGNED'
    );

    if (!clientSignature && !clientSignatureLink) {
        return (
            <Paper shadow="sm" p="xl" radius="md" withBorder>
                <Stack align="center" gap="md">
                    <Text c="dimmed" ta="center">
                        Waiting for client to sign the estimate...
                    </Text>
                </Stack>
            </Paper>
        );
    }

    // Get the signature hash - prefer contractor's hash, fallback to client's signed link
    const signatureHash = contractorSignatureHash || clientSignatureLink?.signature_hash;

    if (!signatureHash) {
        return (
            <Paper shadow="sm" p="xl" radius="md" withBorder>
                <Alert color="yellow" title="Signature Link Required">
                    A signature link is required to sign this estimate. Please generate one first.
                </Alert>
            </Paper>
        );
    }

    return (
        <>
            <Paper shadow="sm" p="xl" radius="md" withBorder>
                <Stack gap="xl">
                    <Stack align="center" gap="md">
                        <IconSignature size={48} color="blue" />
                        <Title order={2}>Contractor Signature Required</Title>
                        <Text c="dimmed" ta="center">
                            The client has signed this estimate.
                            Please sign to complete the agreement.
                        </Text>
                        {clientSignature && (
                            <Alert color="green" title="Client Signed">
                              <Text size="sm">
                                Signed by {clientSignature.signer_name || clientSignature.signer_email} on{' '}
                                {new Date(clientSignature.signed_at).toLocaleDateString()}
                              </Text>
                            </Alert>
                        )}
                    </Stack>

                    <Button
                      size="lg"
                      leftSection={<IconSignature size={20} />}
                      onClick={() => setSignatureModalOpened(true)}
                      fullWidth
                    >
                        Sign Estimate
                    </Button>
                </Stack>
            </Paper>

            <SignatureForm
              signatureHash={signatureHash}
              clientEmail={contractorEmail || userEmail || ''}
              onSignatureSuccess={handleSignatureSuccess}
              signatureType="CONTRACTOR"
              opened={signatureModalOpened}
              onClose={() => setSignatureModalOpened(false)}
              contractorName={contractorName || undefined}
            />
        </>
    );
}
