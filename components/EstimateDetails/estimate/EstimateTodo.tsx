import { List, Text, ThemeIcon, rem } from '@mantine/core';
import { IconCircleDashed } from '@tabler/icons-react';

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
            <IconCircleDashed style={{ width: rem(16), height: rem(16) }} />
        </ThemeIcon>
    );

    const hasAllItems = hasImages && hasVideo && hasTranscriptionSummary && hasLineItems;

    return (
        <>
            {!hasAllItems && (
                <Text>Please complete the following steps before sending the estimate</Text>
            )}
            <List spacing="xs" size="sm" mt="lg">
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
        </>
    );
}
