'use client';

import { useEffect, useState } from 'react';

import { Button, Center, Flex, Modal, Paper, Text, Loader } from '@mantine/core';
import { useParams } from 'next/navigation';
import { Document, Page, pdfjs } from 'react-pdf';
import { OnDocumentLoadSuccess } from 'react-pdf/dist/cjs/shared/types';

import classes from './styles/JobDetails.module.css';

import { UpdateJobContent } from '@/app/api/jobs/jobTypes';

// Initialize PDF.js worker with CDN
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export function PdfViewer({ name, jobID, refresh }: {
    name: string,
    jobID: string,
    refresh: Function
}) {
    const [objectExists, setObjectExists] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { job_id } = useParams() as any;

    useEffect(() => {
        checkIfPdfExists();
    }, []);

    const key = `${job_id}/${name}`;
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
                        bucketName: process.env.AWS_PDF_BUCKET_NAME,
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
                '/api/jobs',
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ content, jobID }),
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

    const onDocumentLoadSuccess: OnDocumentLoadSuccess = (document) => {
        setNumPages(document.numPages);
        setIsLoading(false);
        setError(null);
    };

    const onDocumentLoadError = () => {
        setIsLoading(false);
        setError('Failed to load PDF');
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
                            {isLoading && (
                                <Center style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                                    <Loader size="xl" />
                                </Center>
                            )}

                            {error && (
                                <Text color="red" ta="center" mt="md">
                                    {error}
                                </Text>
                            )}

                            <Document
                              file={baseCloudFrontURL + key}
                              onLoadSuccess={onDocumentLoadSuccess}
                              onLoadError={onDocumentLoadError}
                              loading={
                                    <Center>
                                        <Loader size="xl" />
                                    </Center>
                                }
                              className="pdf-document"
                            >
                                <Page
                                  pageNumber={pageNumber}
                                  width={Math.min(800, window.innerWidth - 40)}
                                  renderTextLayer={false}
                                  renderAnnotationLayer={false}
                                />
                            </Document>

                            {numPages && !error && (
                                <div style={{ marginTop: '1rem', textAlign: 'center', width: '100%' }}>
                                    <Text size="sm" mb="xs">
                                        Page {pageNumber} of {numPages}
                                    </Text>
                                    <Flex gap="md" justify="center">
                                        <Button
                                          onClick={() =>
                                            setPageNumber(page => Math.max(1, page - 1))
                                          }
                                          disabled={pageNumber <= 1}
                                          variant="light"
                                        >
                                            Previous
                                        </Button>
                                        <Button
                                          onClick={() =>
                                            setPageNumber(page => Math.min(numPages, page + 1))
                                          }
                                          disabled={pageNumber >= numPages}
                                          variant="light"
                                        >
                                            Next
                                        </Button>
                                    </Flex>
                                </div>
                            )}
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
