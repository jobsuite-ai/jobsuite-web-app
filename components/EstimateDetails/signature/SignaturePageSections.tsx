'use client';

import { useEffect, useState } from 'react';

import { Card, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';

interface SignaturePageSectionsProps {
    contractor: any;
    signaturePageConfig: {
        show_license: boolean;
        show_insurance: boolean;
        show_w9: boolean;
        show_past_projects: boolean;
        show_about: boolean;
        license_info?: string;
        license_pdf_url?: string;
        insurance_info?: string;
        insurance_pdf_url?: string;
        w9_pdf_url?: string;
        about_text: string;
        past_projects_count: number;
    };
    signatureHash: string;
}

interface PastProject {
    id: string;
    title?: string;
    address_street?: string;
    address_city?: string;
    address_state?: string;
    status?: string;
    updated_at?: string;
}

export default function SignaturePageSections({
    contractor,
    signaturePageConfig,
    signatureHash,
}: SignaturePageSectionsProps) {
    const [pastProjects, setPastProjects] = useState<PastProject[]>([]);
    const [loadingProjects, setLoadingProjects] = useState(false);

    useEffect(() => {
        if (signaturePageConfig.show_past_projects) {
            const fetchPastProjects = async () => {
                try {
                    setLoadingProjects(true);
                    // Use Next.js API route as proxy
                    const response = await fetch(
                        `/api/signature/${signatureHash}/contractor-info`,
                        {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                        }
                    );

                    if (response.ok) {
                        const data = await response.json();
                        setPastProjects(data.past_projects || []);
                    }
                } catch (error) {
                    // eslint-disable-next-line no-console
                    console.error('Error fetching past projects:', error);
                } finally {
                    setLoadingProjects(false);
                }
            };

            fetchPastProjects();
        }
    }, [signaturePageConfig.show_past_projects, signatureHash]);

    return (
        <Stack gap="md">
            {/* License Section */}
            {signaturePageConfig.show_license && (
                signaturePageConfig.license_pdf_url ||
                signaturePageConfig.license_info
            ) && (
                <Paper shadow="xs" p="md" radius="md" withBorder>
                    <Title order={4} mb="sm">
                        License Information
                    </Title>
                    {signaturePageConfig.license_pdf_url ? (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            minHeight: '500px',
                            width: '100%',
                        }}>
                            <iframe
                              title="License PDF"
                              src={signaturePageConfig.license_pdf_url}
                              style={{
                                    width: '100%',
                                    height: '600px',
                                    border: 'none',
                                    borderRadius: '4px',
                                }}
                            />
                        </div>
                    ) : (
                        <Text size="sm" style={{ whiteSpace: 'pre-line' }}>
                            {signaturePageConfig.license_info}
                        </Text>
                    )}
                </Paper>
            )}

            {/* Insurance Section */}
            {signaturePageConfig.show_insurance && (
                signaturePageConfig.insurance_pdf_url ||
                signaturePageConfig.insurance_info
            ) && (
                <Paper shadow="xs" p="md" radius="md" withBorder>
                    <Title order={4} mb="sm">
                        Insurance Information
                    </Title>
                    {signaturePageConfig.insurance_pdf_url ? (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            minHeight: '500px',
                            width: '100%',
                        }}>
                            <iframe
                              title="Insurance PDF"
                              src={signaturePageConfig.insurance_pdf_url}
                              style={{
                                    width: '100%',
                                    height: '600px',
                                    border: 'none',
                                    borderRadius: '4px',
                                }}
                            />
                        </div>
                    ) : (
                        <Text size="sm" style={{ whiteSpace: 'pre-line' }}>
                            {signaturePageConfig.insurance_info}
                        </Text>
                    )}
                </Paper>
            )}

            {/* W9 Section */}
            {signaturePageConfig.show_w9 && signaturePageConfig.w9_pdf_url && (
                <Paper shadow="xs" p="md" radius="md" withBorder>
                    <Title order={4} mb="sm">
                        W9 Form
                    </Title>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        minHeight: '500px',
                        width: '100%',
                    }}>
                        <iframe
                          title="W9 PDF"
                          src={signaturePageConfig.w9_pdf_url}
                          style={{
                                width: '100%',
                                height: '600px',
                                border: 'none',
                                borderRadius: '4px',
                            }}
                        />
                    </div>
                </Paper>
            )}

            {/* About Section */}
            {signaturePageConfig.show_about && signaturePageConfig.about_text && (
                <Paper shadow="xs" p="md" radius="md" withBorder>
                    <Title order={4} mb="sm">
                        About {contractor?.name || 'Us'}
                    </Title>
                    <Text size="sm" style={{ whiteSpace: 'pre-line' }}>
                        {signaturePageConfig.about_text}
                    </Text>
                </Paper>
            )}

            {/* Past Projects Section */}
            {signaturePageConfig.show_past_projects && (
                <Paper shadow="xs" p="md" radius="md" withBorder>
                    <Title order={4} mb="md">
                        Recent Completed Projects
                    </Title>
                    {loadingProjects ? (
                        <Text c="dimmed" size="sm">
                            Loading projects...
                        </Text>
                    ) : pastProjects.length > 0 ? (
                        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                            {pastProjects.map((project) => (
                                <Card key={project.id} shadow="xs" padding="sm" radius="md" withBorder>
                                    <Stack gap="xs">
                                        {project.title && (
                                            <Text fw={500} size="sm">
                                                {project.title}
                                            </Text>
                                        )}
                                        {(project.address_street || project.address_city) && (
                                            <Text size="xs" c="dimmed">
                                                {[
                                                    project.address_street,
                                                    project.address_city,
                                                    project.address_state,
                                                ]
                                                    .filter(Boolean)
                                                    .join(', ')}
                                            </Text>
                                        )}
                                        {project.updated_at && (
                                            <Text size="xs" c="dimmed">
                                                Completed:{' '}
                                                {new Date(project.updated_at).toLocaleDateString()}
                                            </Text>
                                        )}
                                    </Stack>
                                </Card>
                            ))}
                        </SimpleGrid>
                    ) : (
                        <Text c="dimmed" size="sm">
                            No completed projects to display.
                        </Text>
                    )}
                </Paper>
            )}
        </Stack>
    );
}
