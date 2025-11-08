import { List, Text, ThemeIcon, rem } from '@mantine/core';
import { IconCircleDashed } from '@tabler/icons-react';

import { Estimate } from '@/components/Global/model';

export default function EstimateTodo({ estimate }: { estimate: Estimate }) {
    const inProgressIcon = (
        <ThemeIcon color="blue" size={24} radius="xl">
            <IconCircleDashed style={{ width: rem(16), height: rem(16) }} />
        </ThemeIcon>
    );

    return (
        <>
            {(!estimate.images || !estimate.video ||
            !estimate.transcription_summary ||
            !estimate.line_items ||
            !estimate.transcription_summary) &&
                <Text>Please complete the following steps before sending the estimate</Text>
            }
            <List spacing="xs" size="sm" mt="lg">
                {!estimate.images &&
                    <List.Item icon={inProgressIcon}>Upload an image of the house</List.Item>
                }
                {!estimate.video &&
                    <List.Item icon={inProgressIcon}>Upload a video of the house</List.Item>
                }
                {!estimate.line_items &&
                    <List.Item icon={inProgressIcon}>
                        Add line items for the cost of the job
                    </List.Item>
                }
                {!estimate.transcription_summary &&
                    <List.Item icon={inProgressIcon}>
                        Wait for transcription summary to be uploaded
                    </List.Item>
                }
            </List>
        </>
    );
}
