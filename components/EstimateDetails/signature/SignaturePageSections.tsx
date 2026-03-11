'use client';

import { useEffect, useState } from 'react';

import { Carousel } from '@mantine/carousel';
import {
    Card,
    Box,
    Paper,
    SimpleGrid,
    Stack,
    Text,
    Title,
    Modal,
    Image,
    Group,
    Badge,
} from '@mantine/core';

import MarkdownRenderer from '@/components/Global/MarkdownRenderer';

export type AboutBlockImageSize = 'small' | 'medium' | 'large' | 'full';
export type AboutBlockImageWrap = 'none' | 'left' | 'right';

export interface AboutBlock {
    type: 'text' | 'image';
    content?: string;
    image_url?: string;
    /** Image block: display size. Default 'full' for backward compat. */
    size?: AboutBlockImageSize;
    /** Image block: text wrap. Default 'none' for backward compat. */
    wrap?: AboutBlockImageWrap;
}

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
        about_heading?: string;
        about_subheading?: string;
        about_blocks?: AboutBlock[];
        past_projects_count: number;
        use_curated_past_projects?: boolean;
        past_projects_curated?: PastProject[];
    };
    signatureHash: string;
    /**
     * When provided (e.g. from main signature payload for curated portfolio),
     * skip contractor-info fetch.
     */
    pastProjectsOverride?: PastProject[] | null;
}

export interface PastProject {
    id: string;
    title?: string;
    description?: string;
    /** Markdown body (e.g. from contractor page); shown in modal when present. */
    body?: string;
    address_street?: string;
    address_city?: string;
    address_state?: string;
    status?: string;
    updated_at?: string;
    completed_at?: string;
    image_urls?: string[];
}

export default function SignaturePageSections({
    contractor,
    signaturePageConfig,
    signatureHash,
    pastProjectsOverride,
}: SignaturePageSectionsProps) {
    const [pastProjects, setPastProjects] = useState<PastProject[]>([]);
    const [loadingProjects, setLoadingProjects] = useState(false);
    const [selectedProject, setSelectedProject] = useState<PastProject | null>(null);

    useEffect(() => {
        if (
            signaturePageConfig.show_past_projects &&
            pastProjectsOverride === undefined
        ) {
            const fetchPastProjects = async () => {
                try {
                    setLoadingProjects(true);
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
    }, [
        signaturePageConfig.show_past_projects,
        signatureHash,
        pastProjectsOverride,
    ]);

    const displayedPastProjects =
        pastProjectsOverride !== undefined && pastProjectsOverride !== null
            ? pastProjectsOverride
            : pastProjects;

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
                            width: '100%',
                        }}>
                            <iframe
                              title="License PDF"
                              src={signaturePageConfig.license_pdf_url}
                              style={{
                                    width: '100%',
                                    height: 'calc(100vh - 300px)',
                                    minHeight: '600px',
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
                            width: '100%',
                        }}>
                            <iframe
                              title="Insurance PDF"
                              src={signaturePageConfig.insurance_pdf_url}
                              style={{
                                    width: '100%',
                                    height: 'calc(100vh - 300px)',
                                    minHeight: '600px',
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
                        width: '100%',
                    }}>
                        <iframe
                          title="W9 PDF"
                          src={signaturePageConfig.w9_pdf_url}
                          style={{
                                width: '100%',
                                height: 'calc(100vh - 300px)',
                                minHeight: '600px',
                                border: 'none',
                                borderRadius: '4px',
                            }}
                        />
                    </div>
                </Paper>
            )}

            {/* About Section */}
            {signaturePageConfig.show_about &&
                (() => {
                    const blocks = signaturePageConfig.about_blocks;
                    const hasBlocks = Array.isArray(blocks) && blocks.length > 0;
                    if (!hasBlocks && !signaturePageConfig.about_text) return null;
                    const heading =
                        signaturePageConfig.about_heading?.trim() ||
                        `About ${contractor?.name || 'Us'}`;
                    const subheading =
                        signaturePageConfig.about_subheading?.trim() || null;
                    return (
                        <Box
                          style={{
                                display: 'flex',
                                justifyContent: 'center',
                                width: '100%',
                            }}
                        >
                            <Stack gap="lg" style={{ maxWidth: '720px', width: '100%' }}>
                            <Stack gap="xs">
                                <Title order={2} fw={700} size="h3" style={{ letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                                    {heading}
                                </Title>
                                {subheading && (
                                    <Text size="lg" c="dimmed" style={{ lineHeight: 1.5 }}>
                                        {subheading}
                                    </Text>
                                )}
                            </Stack>
                            {hasBlocks ? (
                                <Stack gap="lg" style={{ overflow: 'auto' }}>
                                    {blocks.map((block, index) =>
                                        block.type === 'text' ? (
                                            block.content ? (
                                                block.content.trim().startsWith('<') ? (
                                                    <div
                                                      key={index}
                                                      className="signature-about-block-content"
                                                      style={{
                                                          fontSize: 'var(--mantine-font-size-md)',
                                                          lineHeight: 1.7,
                                                          color: 'var(--mantine-color-dark-6)',
                                                      }}
                                                      dangerouslySetInnerHTML={{
                                                          __html: block.content,
                                                      }}
                                                    />
                                                ) : (
                                                    <Text
                                                      key={index}
                                                      size="md"
                                                      style={{ whiteSpace: 'pre-line', lineHeight: 1.7 }}
                                                      c="dark.6"
                                                    >
                                                        {block.content}
                                                    </Text>
                                                )
                                            ) : null
                                        ) : (
                                            block.image_url && (
                                                (() => {
                                                    const size = block.size ?? 'full';
                                                    const wrap = block.wrap ?? 'none';
                                                    const maxWidth =
                                                        size === 'small'
                                                            ? 200
                                                            : size === 'medium'
                                                                ? 360
                                                                : size === 'large'
                                                                    ? 520
                                                                    : undefined;
                                                    const float =
                                                        wrap === 'left'
                                                            ? ('left' as const)
                                                            : wrap === 'right'
                                                                ? ('right' as const)
                                                                : undefined;
                                                    const margin =
                                                        wrap === 'left'
                                                            ? '0 1rem 0.5rem 0'
                                                            : wrap === 'right'
                                                                ? '0 0 0.5rem 1rem'
                                                                : undefined;
                                                    return (
                                                        <div
                                                          key={index}
                                                          style={{
                                                              width: float ? undefined : '100%',
                                                              maxWidth: maxWidth ?? '100%',
                                                              overflow: 'hidden',
                                                              borderRadius: '8px',
                                                              float,
                                                              margin,
                                                          }}
                                                        >
                                                            <img
                                                              src={block.image_url}
                                                              alt=""
                                                              style={{
                                                                  maxWidth: '100%',
                                                                  height: 'auto',
                                                                  display: 'block',
                                                              }}
                                                            />
                                                        </div>
                                                    );
                                                })()
                                            )
                                        )
                                    )}
                                </Stack>
                            ) : (
                                <Text
                                  size="md"
                                  style={{ whiteSpace: 'pre-line', lineHeight: 1.7 }}
                                  c="dark.6"
                                >
                                    {signaturePageConfig.about_text}
                                </Text>
                            )}
                            </Stack>
                        </Box>
                    );
                })()}

            {/* Past Projects Section */}
            {signaturePageConfig.show_past_projects && (
                <Stack gap="md">
                    <Title order={4} mb="xs">
                        Latest Projects
                    </Title>
                    <Text size="sm" c="dimmed" mb="md">
                        Check out the most recent photos and completed projects.
                    </Text>
                    {pastProjectsOverride === undefined && loadingProjects ? (
                        <Text c="dimmed" size="sm">
                            Loading projects...
                        </Text>
                    ) : displayedPastProjects.length > 0 ? (
                        <SimpleGrid
                          cols={{ base: 1, sm: 2, md: 3 }}
                          spacing="lg"
                          verticalSpacing="lg"
                        >
                            {displayedPastProjects.map((project) => {
                                const imageUrl =
                                    Array.isArray(project.image_urls) &&
                                    project.image_urls.length > 0
                                        ? project.image_urls[0]
                                        : null;
                                return (
                                    <Card
                                      key={project.id}
                                      shadow="sm"
                                      padding={0}
                                      radius="md"
                                      withBorder
                                      style={{
                                            overflow: 'hidden',
                                            cursor: 'pointer',
                                        }}
                                      onClick={() => setSelectedProject(project)}
                                    >
                                        <div
                                          style={{
                                                aspectRatio: '4/3',
                                                backgroundColor: 'var(--mantine-color-gray-2)',
                                                overflow: 'hidden',
                                            }}
                                        >
                                            {imageUrl ? (
                                                <img
                                                  src={imageUrl}
                                                  alt=""
                                                  style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover',
                                                        display: 'block',
                                                    }}
                                                />
                                            ) : (
                                                <div
                                                  style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    }}
                                                >
                                                    <Text size="xs" c="dimmed">
                                                        No image
                                                    </Text>
                                                </div>
                                            )}
                                        </div>
                                        <Stack gap={4} p="sm">
                                            {project.title && (
                                                <Text fw={600} size="sm" lineClamp={2}>
                                                    {project.title}
                                                </Text>
                                            )}
                                            {project.description &&
                                                typeof project.description === 'string' &&
                                                !project.description.trim().startsWith('<') && (
                                                <Text
                                                  size="xs"
                                                  c="dimmed"
                                                  lineClamp={2}
                                                  style={{ whiteSpace: 'pre-line' }}
                                                >
                                                    {project.description}
                                                </Text>
                                            )}
                                            {project.description &&
                                                typeof project.description === 'string' &&
                                                project.description.trim().startsWith('<') && (
                                                <div
                                                  style={{
                                                        fontSize: 'var(--mantine-font-size-xs)',
                                                        color: 'var(--mantine-color-dimmed)',
                                                        lineHeight: 1.4,
                                                        overflow: 'hidden',
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical',
                                                    }}
                                                  dangerouslySetInnerHTML={{
                                                        __html: project.description,
                                                    }}
                                                />
                                            )}
                                        </Stack>
                                    </Card>
                                );
                            })}
                        </SimpleGrid>
                    ) : (
                        <Text c="dimmed" size="sm">
                            No completed projects to display.
                        </Text>
                    )}
                </Stack>
            )}

            <Modal
              opened={selectedProject !== null}
              onClose={() => setSelectedProject(null)}
              title={selectedProject?.title || 'Project details'}
              size="lg"
              radius="md"
            >
                {selectedProject && (
                    <Stack gap="md">
                        {(selectedProject.image_urls?.length ?? 0) > 0 && (
                            <Box style={{ margin: '0 -4px' }}>
                                {selectedProject.image_urls!.length === 1 ? (
                                    <Image
                                      src={selectedProject.image_urls![0]}
                                      alt=""
                                      radius="sm"
                                      fit="cover"
                                      style={{ maxHeight: 360 }}
                                    />
                                ) : (
                                    <Carousel
                                      withIndicators
                                      height={360}
                                      slideSize="100%"
                                      slideGap={0}
                                      loop
                                      styles={{
                                          control: {
                                              background: 'var(--mantine-color-gray-1)',
                                              color: 'var(--mantine-color-gray-7)',
                                              border: '1px solid var(--mantine-color-gray-3)',
                                          },
                                      }}
                                    >
                                        {selectedProject.image_urls!.map((url, i) => (
                                            <Carousel.Slide key={i}>
                                                <Image
                                                  src={url}
                                                  alt=""
                                                  radius="sm"
                                                  fit="cover"
                                                  h={360}
                                                  style={{ objectPosition: 'center' }}
                                                />
                                            </Carousel.Slide>
                                        ))}
                                    </Carousel>
                                )}
                            </Box>
                        )}
                        {selectedProject.body && selectedProject.body.trim() && (
                            <Box
                              className="signature-about-block-content"
                              style={{
                                  fontSize: 'var(--mantine-font-size-sm)',
                                  color: 'var(--mantine-color-dark-6)',
                                  lineHeight: 1.6,
                              }}
                            >
                                <MarkdownRenderer markdown={selectedProject.body} />
                            </Box>
                        )}
                        {!selectedProject.body?.trim() &&
                            selectedProject.description &&
                            typeof selectedProject.description === 'string' &&
                            !selectedProject.description.trim().startsWith('<') && (
                            <Text
                              size="sm"
                              c="dark.6"
                              style={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}
                            >
                                {selectedProject.description}
                            </Text>
                        )}
                        {!selectedProject.body?.trim() &&
                            selectedProject.description &&
                            typeof selectedProject.description === 'string' &&
                            selectedProject.description.trim().startsWith('<') && (
                            <div
                              className="signature-about-block-content"
                              style={{
                                  fontSize: 'var(--mantine-font-size-sm)',
                                  color: 'var(--mantine-color-dark-6)',
                                  lineHeight: 1.6,
                              }}
                              dangerouslySetInnerHTML={{
                                  __html: selectedProject.description,
                              }}
                            />
                        )}
                        {(selectedProject.address_street ||
                            selectedProject.address_city ||
                            selectedProject.address_state) && (
                            <Group gap="xs" wrap="wrap">
                                <Text size="xs" c="dimmed">
                                    Address:
                                </Text>
                                <Text size="xs">
                                    {[
                                        selectedProject.address_street,
                                        selectedProject.address_city,
                                        selectedProject.address_state,
                                    ]
                                        .filter(Boolean)
                                        .join(', ')}
                                </Text>
                            </Group>
                        )}
                        {(selectedProject.status || selectedProject.updated_at) && (
                            <Group gap="sm">
                                {selectedProject.status && (
                                    <Badge variant="light" size="sm">
                                        {selectedProject.status}
                                    </Badge>
                                )}
                                {selectedProject.updated_at && (
                                    <Text size="xs" c="dimmed">
                                        Updated{' '}
                                        {new Date(
                                            selectedProject.updated_at
                                        ).toLocaleDateString()}
                                    </Text>
                                )}
                            </Group>
                        )}
                    </Stack>
                )}
            </Modal>
        </Stack>
    );
}
