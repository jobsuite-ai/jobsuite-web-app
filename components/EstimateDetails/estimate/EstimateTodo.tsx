import { Alert, Flex, List, ThemeIcon, rem } from '@mantine/core';
import { IconCircleDashedCheck } from '@tabler/icons-react';

interface EstimateTodoProps {
    hasImages: boolean;
    hasVideo: boolean;
    hasTranscriptionSummary: boolean;
    hasLineItems: boolean;
}

export default function EstimateTodo({
    hasImages,
    hasVideo,
    hasTranscriptionSummary,
    hasLineItems,
}: EstimateTodoProps) {
    const inProgressIcon = (
        <ThemeIcon color="blue" size={24} radius="xl">
            <IconCircleDashedCheck style={{ width: 22, height: 22 }} />
        </ThemeIcon>
    );

    const hasAllItems = hasImages && hasVideo && hasTranscriptionSummary && hasLineItems;

    return (
        <Flex direction="row" gap="xl" justify="center" align="center">
            {!hasAllItems && (
                <Alert
                  color="yellow"
                  style={{ flex: 1, width: '50%', borderRadius: rem(8) }}
                  styles={{
                      message: { fontSize: rem(16) },
                  }}
                >
                    Please complete the following steps before sending the estimate.
                    A preview will be generated once all items are complete.
                </Alert>
            )}
            {!hasAllItems && (
                <List spacing="xs" size="sm" style={{ flex: 1, width: '50%' }}>
                    {!hasImages && (
                        <List.Item icon={inProgressIcon}>Upload an image of the house</List.Item>
                    )}
                    {!hasVideo && (
                        <List.Item icon={inProgressIcon}>Upload a video of the house</List.Item>
                    )}
                    {!hasLineItems && (
                        <List.Item icon={inProgressIcon}>
                            Add line items for the cost of the job
                        </List.Item>
                    )}
                    {!hasTranscriptionSummary && (
                        <List.Item icon={inProgressIcon}>
                            Wait for transcription summary to be uploaded
                        </List.Item>
                    )}
                </List>
            )}
        </Flex>
    );
}
