'use client';

import { useEffect, useState } from 'react';

import { Button, Card, Flex, Grid, Image, Modal, Text } from '@mantine/core';
import { IconPlus, IconX } from '@tabler/icons-react';

import ImageUpload from './ImageUpload';
import classes from './styles/EstimateDetails.module.css';

import { EstimateResource } from '@/components/Global/model';

interface ImageGalleryProps {
  estimateID: string;
  resources: EstimateResource[];
  onUpdate?: () => void;
}

export default function ImageGallery({ estimateID, resources, onUpdate }: ImageGalleryProps) {
  const [showImageUploadModal, setShowImageUploadModal] = useState(false);
  const [imagePaths, setImagePaths] = useState<Array<{
    url: string;
    resource: EstimateResource;
  }>>([]);

  useEffect(() => {
    const loadImageUrls = async () => {
      if (resources && resources.length > 0) {
        const imageResources = resources.filter(
          (r) => r.resource_type === 'IMAGE' && r.upload_status === 'COMPLETED'
        );

        const getImageBucket = () => {
          const env = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';
          return `jobsuite-resource-images-${env}`;
        };

        const paths = imageResources.map((resource) => {
          // If we have s3_bucket and s3_key, construct the correct S3 URL
          if (resource.s3_bucket && resource.s3_key) {
            // Use the bucket from the resource, or fallback to default
            const bucket = resource.s3_bucket || getImageBucket();
            const region = 'us-west-2'; // Default region, could be made configurable
            const url = `https://${bucket}.s3.${region}.amazonaws.com/${resource.s3_key}`;
            return { url, resource };
          }

          // Legacy fallback: use old format (for resources without s3_bucket/s3_key)
          // This should only happen for very old resources that were uploaded
          // before S3 metadata was stored
          const imageName = resource.resource_location;
          const url = imageName
            ? `https://${getImageBucket()}.s3.us-west-2.amazonaws.com/${estimateID}/${imageName}`
            : null;
          return { url, resource };
        });

        const validPaths = paths.filter((item) => item.url !== null) as Array<{
          url: string;
          resource: EstimateResource;
        }>;
        setImagePaths(validPaths);
      } else {
        setImagePaths([]);
      }
    };

    loadImageUrls();
  }, [resources, estimateID]);

  const deleteImage = async (resource: EstimateResource) => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) return;

    try {
      const response = await fetch(
        `/api/estimates/${estimateID}/resources/${resource.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok && onUpdate) {
        onUpdate();
      }
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
              {imagePaths.map((item, index) => (
                <Grid.Col key={item.resource.id} span={{ base: 12, sm: 6, md: 4 }}>
                  <Card shadow="xs" radius="md" withBorder style={{ position: 'relative' }}>
                    <IconX
                      onClick={() => deleteImage(item.resource)}
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
                      src={item.url}
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
