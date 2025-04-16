'use client';

import { useState } from 'react';

import { Button, Card, Flex, Switch, Text, Textarea } from '@mantine/core';
import '@mantine/core/styles.css';
import { IconEdit } from '@tabler/icons-react';

import LoadingState from '../Global/LoadingState';
import { SingleJob } from '../Global/model';
import classes from './styles/PaintDetails.module.css';

import { UpdateJobContent } from '@/app/api/jobs/jobTypes';

export default function PaintDetails({ job }: { job: SingleJob }) {
    const [keepSameColors, setKeepSameColors] = useState<boolean>(
        job.keep_same_colors?.BOOL || false
    );
    const [hasExistingPaint, setHasExistingPaint] = useState<boolean>(
        job.has_existing_paint?.BOOL || false
    );
    const [paintDetails, setPaintDetails] = useState<string>(
        job.paint_details?.S || ''
    );
    const [edit, setEdit] = useState(false);
    const [loading, setLoading] = useState(false);

    const toggleKeepSameColors = (checked: boolean) => {
        setKeepSameColors(checked);
    };

    const toggleHasExistingPaint = (checked: boolean) => {
        setHasExistingPaint(checked);
    };

    const setPaintDetailsText = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setPaintDetails(event.target.value);
    };

    const updateJob = async () => {
        setLoading(true);
        const updateJobContent: UpdateJobContent = {
            update_paint_details: {
                keep_same_colors: keepSameColors,
                has_existing_paint: hasExistingPaint,
                paint_details: paintDetails,
            },
        };

        const content: UpdateJobContent = {
            update_paint_details: updateJobContent.update_paint_details,
        };

        try {
            const response = await fetch(
                '/api/jobs',
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ content, jobID: job.id.S }),
                }
            );

            await response.json();
            setEdit(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card
          shadow="sm"
          padding="lg"
          radius="md"
          pt="md"
          withBorder
          className={classes.colorWrapper}
        >
            <div style={{ position: 'relative' }}>
                <IconEdit
                  onClick={() => setEdit(true)}
                  style={{ cursor: 'pointer', position: 'absolute', top: '-5px', right: '-5px' }}
                />
            </div>
            {loading ? (
                <LoadingState size="md" />
            ) : edit ? (
                <div className={classes.editFlexContainer}>
                    <Switch
                      label="Keep Same Colors"
                      checked={keepSameColors}
                      onChange={(event) => toggleKeepSameColors(event.currentTarget.checked)}
                    />
                    <Switch
                      label="Has Existing Paint"
                      checked={hasExistingPaint}
                      onChange={(event) => toggleHasExistingPaint(event.currentTarget.checked)}
                    />
                    <Textarea
                      label="Paint Details"
                      placeholder="Enter paint details or matching instructions"
                      value={paintDetails}
                      minRows={5}
                      autosize
                      maxRows={10}
                      style={{ minHeight: '120px' }}
                      onChange={(event) => setPaintDetailsText(event)}
                    />
                </div>
            ) : (
                <>
                    <Flex justify="center" direction="column" gap="md">
                        <Text size="sm" fw={700}>
                            Keep Same Colors: {keepSameColors ? 'Yes' : 'No'}
                        </Text>
                        <Text size="sm" fw={700}>
                            Has Existing Paint: {hasExistingPaint ? 'Yes' : 'No'}
                        </Text>
                        {paintDetails && (
                            <Text size="sm">
                                Paint Details: {paintDetails}
                            </Text>
                        )}
                    </Flex>
                </>
            )}
            {edit && !loading && (
                <Flex direction="row" justify="center" gap="lg">
                    <Button onClick={() => setEdit(false)}>Cancel</Button>
                    <Button onClick={updateJob}>Update</Button>
                </Flex>
            )}
        </Card>
    );
}
