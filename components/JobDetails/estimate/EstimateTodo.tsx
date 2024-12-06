import { JobStatus, SingleJob } from '@/components/Global/model';
import { List, Text, ThemeIcon, rem } from '@mantine/core';
import { IconCircleDashed } from '@tabler/icons-react';

export default function EstimateTodo({ job }: { job: SingleJob }) {
    const inProgressIcon = (
        <ThemeIcon color="blue" size={24} radius="xl">
            <IconCircleDashed style={{ width: rem(16), height: rem(16) }} />
        </ThemeIcon>
    );

    if (!job.job_status || job.job_status.S !== JobStatus.PENDING_ESTIMATE) {
        return (
            <>
                {!job.images || !job.video || !job.transcription_summary &&
                    <Text>Please complete the following steps before sending the estimate</Text>
                }
                <List spacing="xs" size="sm" mt='lg'>
                    {!job.images && <List.Item icon={inProgressIcon}>Upload an image of the house</List.Item>}
                    {!job.video && <List.Item icon={inProgressIcon}>Upload a video of the house</List.Item>}
                    {!job.transcription_summary && 
                        <List.Item icon={inProgressIcon}>Wait for transcription summary to be uploaded</List.Item>
                    }
                </List>
            </>
        );
    } else {
        return <></>;
    }
}