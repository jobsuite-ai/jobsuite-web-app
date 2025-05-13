'use client';

import { useEffect, useState } from 'react';

import { Button, Center, Flex, Modal, Paper, Text } from '@mantine/core';
import { useParams } from 'next/navigation';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { Document, Page, pdfjs } from 'react-pdf';

import classes from './styles/JobDetails.module.css';

import { UpdateJobContent } from '@/app/api/jobs/jobTypes';

// Initialize PDF.js worker
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
    const { job_id } = useParams() as any;

    useEffect(() => {
        checkIfPdfExists();
    }, []);

    const key = `${job_id}/${name}`;
    const baseCloudFrontURL = 'https://rl-peek-job-pdfs.s3.us-west-2.amazonaws.com/';

    async function checkIfPdfExists() {
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
            const { exists, error } = await response.json();
            if (!error) {
                setObjectExists(exists);
            } else {
                setObjectExists(false);
            }
        } else {
            setObjectExists(false);
        }
    }

    const deletePdf = async () => {
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

        await response.json();
        await refresh();
        setIsModalOpen(false);
    };

    function onDocumentLoadSuccess(document: PDFDocumentProxy) {
        setNumPages(document.numPages);
    }

    return (
        <>
            <Paper shadow="sm" radius="md" withBorder className={classes.videoFrame}>
                {objectExists ? (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
                            <Document
                              file={baseCloudFrontURL + key}
                              onLoadSuccess={onDocumentLoadSuccess}
                              className="pdf-document"
                            >
                                <Page pageNumber={pageNumber} width={800} />
                            </Document>
                            {numPages && (
                                <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                                    <p>
                                        Page {pageNumber} of {numPages}
                                    </p>
                                    <Flex gap="md" justify="center">
                                        <Button
                                          onClick={() =>
                                            setPageNumber(page => Math.max(1, page - 1))
                                        }
                                          disabled={pageNumber <= 1}
                                        >
                                            Previous
                                        </Button>
                                        <Button
                                          onClick={() =>
                                            setPageNumber(page => Math.min(numPages, page + 1))
                                          }
                                          disabled={pageNumber >= numPages}
                                        >
                                            Next
                                        </Button>
                                    </Flex>
                                </div>
                            )}
                        </div>
                        <Flex direction="column" align="center" p="md">
                            <Center>
                                <Button onClick={() => setIsModalOpen(true)}>Delete PDF</Button>
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
            >
                <Text>Are you sure you want to delete this PDF?</Text>
                <Flex gap="md" justify="center" mt="xl">
                    <Button onClick={deletePdf} color="red">Delete</Button>
                    <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
                </Flex>
            </Modal>
        </>
    );
}
