'use client';

import { Avatar, Card, Flex, Group, Paper, Skeleton, Stack } from '@mantine/core';
import { IconClock } from '@tabler/icons-react';

import CollapsibleSection from './CollapsibleSection';
import classes from './styles/EstimateDetails.module.css';

export default function EstimateDetailsSkeleton() {
    return (
        <div className={classes.twoColumnLayout}>
            {/* Column 1: Main Content */}
            <div className={classes.mainColumn}>
                <div className={classes.jobTitleWrapper}>
                    <Flex justify="space-between" align="center" gap="md" w="100%">
                        <Skeleton height={32} width={300} />
                        <Skeleton height={36} width={36} circle />
                    </Flex>
                </div>
                <div className={classes.columnContent}>
                    {/* Video Section Skeleton */}
                    <CollapsibleSection title="Video" defaultOpen={false}>
                        <Skeleton height={400} radius="md" />
                    </CollapsibleSection>

                    {/* Activity Section Skeleton */}
                    <CollapsibleSection title="Activity" defaultOpen={false}>
                        <Stack gap="md">
                            <Card shadow="xs" padding="md" radius="md" withBorder>
                                <Stack gap="md">
                                    <Skeleton height={100} radius="sm" />
                                    <Group gap="xs">
                                        <Skeleton height={32} width={80} />
                                        <Skeleton height={32} width={100} />
                                        <Skeleton height={32} width={120} />
                                    </Group>
                                </Stack>
                            </Card>
                            {/* Comment skeletons */}
                            {[1, 2, 3].map((i) => (
                                <Card key={i} shadow="xs" padding="md" radius="md" withBorder>
                                    <Stack gap="xs">
                                        <Group justify="space-between" align="flex-start" wrap="nowrap">
                                            <Group gap="sm" align="center" wrap="nowrap">
                                                <Avatar size="md" radius="xl" color="blue" variant="light">
                                                    <Skeleton height={32} width={32} circle />
                                                </Avatar>
                                                <div>
                                                    <Skeleton height={16} width={120} radius="sm" mb={4} />
                                                    <Group gap={4} mt={2}>
                                                        <IconClock
                                                          size={12}
                                                          style={{ opacity: 0.6 }}
                                                        />
                                                        <Skeleton height={12} width={100} radius="sm" />
                                                    </Group>
                                                </div>
                                            </Group>
                                        </Group>
                                        <div style={{ paddingLeft: '48px' }}>
                                            <Skeleton height={14} width="100%" radius="sm" mb={6} />
                                            <Skeleton height={14} width="90%" radius="sm" mb={6} />
                                            <Skeleton height={14} width="75%" radius="sm" />
                                        </div>
                                    </Stack>
                                </Card>
                            ))}
                        </Stack>
                    </CollapsibleSection>

                    {/* Image Gallery Skeleton */}
                    <CollapsibleSection title="Image Gallery" defaultOpen={false}>
                        <div className={classes.imageGalleryScroll}>
                            {[1, 2, 3, 4].map((i) => (
                                <Skeleton key={i} height={200} width={200} radius="md" />
                            ))}
                        </div>
                    </CollapsibleSection>

                    {/* PDF Preview Skeleton */}
                    <CollapsibleSection title="PDF Preview" defaultOpen={false}>
                        <Skeleton height={800} radius="md" />
                    </CollapsibleSection>

                    {/* Files Skeleton */}
                    <CollapsibleSection title="Files" defaultOpen={false}>
                        <Stack gap="xs">
                            {[1, 2].map((i) => (
                                <Card key={i} padding="sm" withBorder>
                                    <Group justify="space-between">
                                        <Skeleton height={20} width={200} />
                                        <Skeleton height={20} width={80} />
                                    </Group>
                                </Card>
                            ))}
                        </Stack>
                    </CollapsibleSection>

                    {/* Description Skeleton */}
                    <CollapsibleSection title="Description" defaultOpen={false}>
                        <Stack gap="xs">
                            <Skeleton height={16} width="100%" radius="sm" />
                            <Skeleton height={16} width="95%" radius="sm" />
                            <Skeleton height={16} width="90%" radius="sm" />
                            <Skeleton height={16} width="85%" radius="sm" />
                        </Stack>
                    </CollapsibleSection>

                    {/* Spanish Transcription Skeleton */}
                    <CollapsibleSection title="Spanish Transcription" defaultOpen={false}>
                        <Stack gap="xs">
                            <Skeleton height={16} width="100%" radius="sm" />
                            <Skeleton height={16} width="95%" radius="sm" />
                            <Skeleton height={16} width="90%" radius="sm" />
                        </Stack>
                    </CollapsibleSection>

                    {/* Line Items Skeleton */}
                    <CollapsibleSection title="Line Items" defaultOpen={false}>
                        <Stack gap="md">
                            {[1, 2].map((i) => (
                                <Card key={i} padding="md" withBorder>
                                    <Skeleton height={20} width="60%" mb="xs" />
                                    <Skeleton height={16} width="80%" mb="xs" />
                                    <Group gap="md">
                                        <Skeleton height={16} width={100} />
                                        <Skeleton height={16} width={100} />
                                    </Group>
                                </Card>
                            ))}
                        </Stack>
                    </CollapsibleSection>

                    {/* Change Orders Skeleton */}
                    <CollapsibleSection title="Change Orders" defaultOpen={false}>
                        <Card shadow="sm" padding="lg" radius="md" withBorder>
                            <Skeleton height={20} width={200} mb="md" />
                            <Stack gap="xs">
                                {[1, 2].map((i) => (
                                    <Card key={i} padding="sm" withBorder>
                                        <Skeleton height={16} width={150} mb="xs" />
                                        <Skeleton height={14} width={100} />
                                    </Card>
                                ))}
                            </Stack>
                        </Card>
                    </CollapsibleSection>

                    {/* Estimate Preview Skeleton */}
                    <CollapsibleSection title="Estimate Preview" defaultOpen={false}>
                        <Paper shadow="sm" p="lg" radius="md" withBorder>
                            <Skeleton height={400} radius="md" />
                        </Paper>
                    </CollapsibleSection>
                </div>
            </div>

            {/* Column 2: Sidebar */}
            <div className={classes.sidebarColumn}>
                <div className={classes.sidebarContent}>
                    <Paper shadow="sm" radius="md" withBorder p="lg">
                        <Stack gap="md">
                            {/* Status */}
                            <div>
                                <Skeleton height={16} width={80} mb="xs" />
                                <Skeleton height={24} width={120} />
                            </div>

                            {/* Owned by */}
                            <div>
                                <Skeleton height={16} width={100} mb="xs" />
                                <Skeleton height={20} width={150} />
                            </div>

                            {/* Client */}
                            <div>
                                <Skeleton height={16} width={80} mb="xs" />
                                <Skeleton height={20} width={150} />
                            </div>

                            {/* Email */}
                            <div>
                                <Skeleton height={16} width={80} mb="xs" />
                                <Skeleton height={20} width={200} />
                            </div>

                            {/* Phone */}
                            <div>
                                <Skeleton height={16} width={80} mb="xs" />
                                <Skeleton height={20} width={150} />
                            </div>

                            {/* Address */}
                            <div>
                                <Skeleton height={16} width={80} mb="xs" />
                                <Skeleton height={20} width={200} />
                            </div>

                            {/* City */}
                            <div>
                                <Skeleton height={16} width={80} mb="xs" />
                                <Skeleton height={20} width={150} />
                            </div>

                            {/* Zip Code */}
                            <div>
                                <Skeleton height={16} width={80} mb="xs" />
                                <Skeleton height={20} width={100} />
                            </div>

                            {/* Job Hours */}
                            <div>
                                <Skeleton height={16} width={100} mb="xs" />
                                <Skeleton height={20} width={80} />
                            </div>

                            {/* Job Rate */}
                            <div>
                                <Skeleton height={16} width={100} mb="xs" />
                                <Skeleton height={20} width={100} />
                            </div>

                            {/* Job Total */}
                            <div>
                                <Skeleton height={16} width={100} mb="xs" />
                                <Skeleton height={20} width={120} />
                            </div>

                            {/* Discount Percentage */}
                            <div>
                                <Skeleton height={16} width={150} mb="xs" />
                                <Skeleton height={20} width={80} />
                            </div>

                            {/* Discount Reason */}
                            <div>
                                <Skeleton height={16} width={120} mb="xs" />
                                <Skeleton height={20} width={200} />
                            </div>

                            {/* Paint Details */}
                            <div>
                                <Skeleton height={16} width={120} mb="xs" />
                                <Skeleton height={60} width="100%" />
                            </div>

                            {/* Crew Lead */}
                            <div>
                                <Skeleton height={16} width={100} mb="xs" />
                                <Skeleton height={20} width={150} />
                            </div>

                            {/* Actual Hours */}
                            <div>
                                <Skeleton height={16} width={120} mb="xs" />
                                <Skeleton height={20} width={80} />
                            </div>
                        </Stack>
                    </Paper>

                    {/* Resource Links Skeleton */}
                    <div>
                        <Skeleton height={24} width={150} mb="md" />
                        <Flex direction="row" justify="center" gap="xl">
                            <Skeleton height={40} width={100} />
                            <Skeleton height={40} width={100} />
                        </Flex>
                    </div>

                    {/* Archive Button Skeleton */}
                    <Flex direction="row" justify="center">
                        <Skeleton height={36} width="100%" />
                    </Flex>
                </div>
            </div>
        </div>
    );
}
