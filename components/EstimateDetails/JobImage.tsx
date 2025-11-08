'use client';

import { useEffect, useRef, useState } from 'react';

import { Button, Card, Flex, Image, Loader, Modal, Paper, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconX } from '@tabler/icons-react';

import ImageUpload from './ImageUpload';
import classes from './styles/VideoUploader.module.css';

import { UpdateJobContent } from '@/app/api/projects/jobTypes';

interface JobImageProps {
    estimateID: string;
    imageName: string;
    onUpdate?: () => void | Promise<void>;
}

const JobImage = ({ estimateID, imageName, onUpdate }: JobImageProps) => {
    const [showImageUploadModal, setShowImageUploadModal] = useState(false);
    const [imagePath, setImagePath] = useState('');
    const [image, setImage] = useState(imageName);
    const [isDeleting, setIsDeleting] = useState(false);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (image) {
            const key = `${estimateID}/${image}`;
            setImagePath(`https://rl-peek-job-images.s3.us-west-2.amazonaws.com/${key}`);
        } else {
            setImagePath('');
        }
    }, [image, estimateID]);

    const handleImageSet = (newImageName: string) => {
        setImage(newImageName);
        if (onUpdate) {
            onUpdate();
        }
    };

    const deleteImage = async () => {
        if (isDeleting) return;

        try {
            setIsDeleting(true);
            const content: UpdateJobContent = {
                delete_image: true,
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

            if (!isMountedRef.current) return;

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = errorData.message || errorData.error || 'Failed to delete image';
                throw new Error(errorMsg);
            }

            await response.json();

            if (!isMountedRef.current) return;

            setImagePath('');
            setImage('');

            notifications.show({
                title: 'Image Deleted',
                position: 'top-center',
                color: 'green',
                message: 'The image has been deleted successfully.',
            });

            if (onUpdate) {
                await onUpdate();
            }
        } catch (error) {
            if (!isMountedRef.current) return;

            const errorMsg = error instanceof Error ? error.message : 'Failed to delete image';
            notifications.show({
                title: 'Delete Failed',
                position: 'top-center',
                color: 'red',
                message: errorMsg,
            });
        } finally {
            if (isMountedRef.current) {
                setIsDeleting(false);
            }
        }
    };

    return (
        <>
            {imagePath ? (
                <Card shadow="xs" radius="md" withBorder className={classes.jobImageWrapper} style={{ position: 'relative' }}>
                    {isDeleting ? (
                        <Flex justify="center" align="center" style={{ minHeight: '200px' }}>
                            <Loader size="md" />
                        </Flex>
                    ) : (
                        <>
                            <IconX
                              onClick={deleteImage}
                              style={{
                                  cursor: 'pointer',
                                  position: 'absolute',
                                  right: '10px',
                                  top: '10px',
                                  width: '20px',
                                  height: '20px',
                                  zIndex: 10,
                                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                  borderRadius: '50%',
                                  padding: '2px',
                              }}
                            />
                            <Image
                              className={classes.jobImage}
                              radius={20}
                              src={imagePath}
                              alt="Job image"
                            />
                        </>
                    )}
                </Card>
            ) : (
                <Paper shadow="sm" radius="md" withBorder p="lg">
                    <Flex justify="center" align="center" gap="lg" direction="column">
                        <Image
                          className={classes.jobImage}
                          radius={20}
                          src="https://i.ibb.co/R0xWFjF/Screenshot-2025-01-26-at-6-23-24-PM.png"
                          alt="Placeholder"
                        />
                        <Button onClick={() => setShowImageUploadModal(true)}>
                            Upload a picture of the house
                        </Button>
                    </Flex>
                </Paper>
            )}
            <Modal
              opened={showImageUploadModal}
              onClose={() => setShowImageUploadModal(false)}
              size={700}
              padding={30}
              transitionProps={{ duration: 200 }}
              withCloseButton
              centered
              title={<Text fz={24} fw={700}>Upload Images</Text>}
            >
                <ImageUpload
                  estimateID={estimateID}
                  setImage={handleImageSet}
                  setShowModal={setShowImageUploadModal}
                />
            </Modal>
        </>
    );
};

export default JobImage;
