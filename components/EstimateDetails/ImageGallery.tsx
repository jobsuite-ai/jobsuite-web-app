'use client';

import { useEffect, useState } from 'react';

import { Button, Card, Flex, Grid, Image, Modal, Text } from '@mantine/core';
import { IconPlus, IconX } from '@tabler/icons-react';

import ImageUpload from './ImageUpload';
import classes from './styles/EstimateDetails.module.css';

import { UpdateJobContent } from '@/app/api/projects/jobTypes';

interface ImageGalleryProps {
  estimateID: string;
  images?: any;
  onUpdate?: () => void;
}

export default function ImageGallery({ estimateID, images, onUpdate }: ImageGalleryProps) {
  const [showImageUploadModal, setShowImageUploadModal] = useState(false);
  const [imagePaths, setImagePaths] = useState<string[]>([]);

  useEffect(() => {
    if (images) {
      const paths: string[] = [];

      // Handle different image formats
      if (Array.isArray(images)) {
        images.forEach((img) => {
          const imageName = typeof img === 'string' ? img : img?.name || img;
          if (imageName) {
            paths.push(`https://rl-peek-job-images.s3.us-west-2.amazonaws.com/${estimateID}/${imageName}`);
          }
        });
      } else if (images?.L && Array.isArray(images.L)) {
        images.L.forEach((item: any) => {
          const imageName = item?.M?.name?.S || item?.name;
          if (imageName) {
            paths.push(`https://rl-peek-job-images.s3.us-west-2.amazonaws.com/${estimateID}/${imageName}`);
          }
        });
      } else if (images?.name) {
        const imageName = typeof images.name === 'string' ? images.name : (images.name?.S || images.name);
        if (imageName) {
          paths.push(`https://rl-peek-job-images.s3.us-west-2.amazonaws.com/${estimateID}/${imageName}`);
        }
      }

      setImagePaths(paths);
    }
  }, [images, estimateID]);

  const deleteImage = async (imageIndex: number) => {
    const content: UpdateJobContent = {
      delete_image: true,
    };

    try {
      await fetch(`/api/estimates/${estimateID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(content),
      });

      // Remove from local state
      setImagePaths((prev) => prev.filter((_, idx) => idx !== imageIndex));

      if (onUpdate) onUpdate();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to delete image:', error);
    }
  };

  const handleImageUpload = () => {
    setShowImageUploadModal(false);
    // Refresh the image list
    if (onUpdate) {
      // Small delay to ensure backend has processed the upload
      setTimeout(() => {
        onUpdate();
      }, 500);
    }
  };

  return (
    <>
      <div className={classes.imageGalleryContainer}>
        <Flex direction="column" gap="md">
          {imagePaths.length > 0 ? (
            <Grid className={classes.imageGrid}>
              {imagePaths.map((path, index) => (
                <Grid.Col key={index} span={{ base: 12, sm: 6, md: 4 }}>
                  <Card shadow="xs" radius="md" withBorder style={{ position: 'relative' }}>
                    <IconX
                      onClick={() => deleteImage(index)}
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
                      src={path}
                      alt={`Image ${index + 1}`}
                      radius="md"
                      style={{ width: '100%', height: 'auto' }}
                    />
                  </Card>
                </Grid.Col>
              ))}
            </Grid>
          ) : (
            <div className={classes.emptyState}>
              <Image
                radius={20}
                src="https://i.ibb.co/R0xWFjF/Screenshot-2025-01-26-at-6-23-24-PM.png"
                style={{ maxWidth: '300px' }}
              />
              <Text c="dimmed" ta="center">
                No images uploaded yet
              </Text>
            </div>
          )}
        </Flex>
        <Flex justify="center" align="center" direction="column" gap="md" mt="md">
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => setShowImageUploadModal(true)}
            >
              Add Image
            </Button>
        </Flex>
      </div>

      <Modal
        opened={showImageUploadModal}
        size={700}
        padding={30}
        transitionProps={{ duration: 200 }}
        withCloseButton
        onClose={() => setShowImageUploadModal(false)}
        title="Upload Images"
      >
        <ImageUpload
          estimateID={estimateID}
          setImage={handleImageUpload}
          setShowModal={setShowImageUploadModal}
        />
      </Modal>
    </>
  );
}
