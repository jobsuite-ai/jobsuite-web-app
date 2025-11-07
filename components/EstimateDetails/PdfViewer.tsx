'use client';

import { useEffect, useState } from 'react';

import { Button, Center, Flex, Modal, Paper, Text } from '@mantine/core';

import classes from './styles/EstimateDetails.module.css';

import { UpdateJobContent } from '@/app/api/projects/jobTypes';

export function PdfViewer({ name, estimateID, refresh }: {
    name: string,
    estimateID: string,
    refresh: Function
}) {
    const [objectExists, setObjectExists] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        checkIfPdfExists();
    }, []);

    const key = `${estimateID}/${name}`;
    const baseCloudFrontURL = 'https://rl-peek-job-pdfs.s3.us-west-2.amazonaws.com/';

    async function checkIfPdfExists() {
        try {
            const response = await fetch(
                '/api/s3',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        bucketName: process.env.AWS_PDF_BUCKET_NAME as string,
                        objectKey: key,
                    }),
                }
            );

            if (response.ok) {
                const { exists, s3error } = await response.json();
                if (!s3error) {
                    setObjectExists(exists);
                } else {
                    setObjectExists(false);
                    setError('Error checking PDF existence');
                }
            } else {
                setObjectExists(false);
                setError('Failed to check PDF existence');
            }
        } catch (err) {
            setObjectExists(false);
            setError('Error checking PDF existence');
        }
    }

    const deletePdf = async () => {
        try {
            const content: UpdateJobContent = {
                delete_pdf: true,
            };

        const response = await fetch(
            `/api/estimates/${estimateID}`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(content),
            }
        );

            if (!response.ok) {
                throw new Error('Failed to delete PDF');
            }

            await refresh();
            setIsModalOpen(false);
        } catch (err) {
            setError('Failed to delete PDF');
        }
    };

    return (
        <>
            <Paper shadow="sm" radius="md" withBorder className={classes.videoFrame}>
                {objectExists ? (
                    <>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            flexDirection: 'column',
                            minHeight: '500px',
                            position: 'relative',
                        }}>
                            {error && (
                                <Text color="red" ta="center" mt="md">
                                    {error}
                                </Text>
                            )}

                            <iframe
                              title={`PDF viewer for ${name}`}
                              src={baseCloudFrontURL + key}
                              style={{ width: '100%', height: '800px' }}
                            />
                        </div>
                        <Flex direction="column" align="center" p="md">
                            <Center>
                                <Button
                                  onClick={() => setIsModalOpen(true)}
                                  color="red"
                                  variant="light"
                                >
                                    Delete PDF
                                </Button>
                            </Center>
                        </Flex>
                    </>
                ) : (
                    <Flex direction="column" justify="center" align="center" p="lg" h="100%">
                        <Text ta="center" fz="lg">
                            PDF not found
                        </Text>
                        <Text ta="center" fz="sm" mt="xs" c="dimmed">
                            The PDF file could not be found. Please try uploading again.
                        </Text>
                    </Flex>
                )}
            </Paper>

            <Modal
              opened={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              title="Delete PDF"
              centered
            >
                <Text>Are you sure you want to delete this PDF?</Text>
                <Flex gap="md" justify="center" mt="xl">
                    <Button onClick={deletePdf} color="red">Delete</Button>
                    <Button onClick={() => setIsModalOpen(false)} variant="light">Cancel</Button>
                </Flex>
            </Modal>
        </>
    );
}
