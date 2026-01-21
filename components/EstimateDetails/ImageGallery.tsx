'use client';

import { useCallback, useEffect, useState } from 'react';

import { ActionIcon, Badge, Button, Flex, Image, Modal, Text } from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconPhoto, IconPlus, IconX } from '@tabler/icons-react';

import ImageUpload from './ImageUpload';
import classes from './styles/EstimateDetails.module.css';

import { EstimateResource } from '@/components/Global/model';

interface ImageGalleryProps {
  estimateID: string;
  resources: EstimateResource[];
  coverPhotoResourceId?: string;
  onUpdate?: () => void;
}

export default function ImageGallery({
  estimateID,
  resources,
  coverPhotoResourceId,
  onUpdate,
}: ImageGalleryProps) {
  const [showImageUploadModal, setShowImageUploadModal] = useState(false);
  const [viewerModalOpened, setViewerModalOpened] = useState(false);
  const [isSelectingCoverPhoto, setIsSelectingCoverPhoto] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
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
          // Determine env based on bucket name if available, otherwise default to dev
          const branch = process.env.AWS_BRANCH || process.env.AMPLIFY_BRANCH;
          const isProduction = branch === 'production' || branch === 'prod';
          const env = isProduction ? 'prod' : 'dev';
          return `jobsuite-resource-images-${env}`;
        };

        const paths = imageResources.map((resource) => {
          // Determine region based on bucket name (more reliable than env vars)
          // If bucket name contains '-prod', use us-east-1, otherwise us-west-2
          const bucket = resource.s3_bucket || getImageBucket();
          const isProduction = bucket.includes('-prod');
          const region = isProduction ? 'us-east-1' : 'us-west-2';

          // If we have s3_bucket and s3_key, construct the correct S3 URL
          if (resource.s3_bucket && resource.s3_key) {
            const url = `https://${bucket}.s3.${region}.amazonaws.com/${resource.s3_key}`;
            return { url, resource };
          }

          // Legacy fallback: use old format (for resources without s3_bucket/s3_key)
          // This should only happen for very old resources that were uploaded
          // before S3 metadata was stored
          const imageName = resource.resource_location;
          const url = imageName
            ? `https://${getImageBucket()}.s3.${region}.amazonaws.com/${estimateID}/${imageName}`
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

  const openImageViewer = (index: number, selectingCoverPhoto = false) => {
    setSelectedImageIndex(index);
    setIsSelectingCoverPhoto(selectingCoverPhoto);
    setViewerModalOpened(true);
  };

  const setCoverPhoto = async (resourceId: string) => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) return;

    try {
      const response = await fetch(`/api/estimates/${estimateID}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cover_photo_resource_id: resourceId }),
      });

      if (response.ok) {
        setViewerModalOpened(false);
        setIsSelectingCoverPhoto(false);
        if (onUpdate) {
          onUpdate();
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to set cover photo:', error);
    }
  };

  const handleSelectCoverPhoto = () => {
    if (imagePaths.length > 0) {
      openImageViewer(0, true);
    }
  };

  const navigateImage = useCallback((direction: 'prev' | 'next') => {
    setSelectedImageIndex((prev) => {
      if (direction === 'prev') {
        return prev > 0 ? prev - 1 : imagePaths.length - 1;
      }
      return prev < imagePaths.length - 1 ? prev + 1 : 0;
    });
  }, [imagePaths.length]);

  useEffect(() => {
    if (!viewerModalOpened) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        navigateImage('prev');
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        navigateImage('next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line consistent-return
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [viewerModalOpened, navigateImage]);

  return (
    <>
      <div className={classes.imageGalleryContainer}>
        <Flex direction="column" gap="md">
          {imagePaths.length > 0 ? (
            <div className={classes.imageGalleryScroll}>
              {imagePaths.map((item, index) => (
                <div
                  key={item.resource.id}
                  role="button"
                  tabIndex={0}
                  style={{ position: 'relative', flexShrink: 0, cursor: 'pointer' }}
                  onClick={() => openImageViewer(index)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openImageViewer(index);
                    }
                  }}
                >
                  <IconX
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteImage(item.resource);
                    }}
                    style={{
                      cursor: 'pointer',
                      position: 'absolute',
                      right: '8px',
                      top: '8px',
                      width: '18px',
                      height: '18px',
                      zIndex: 10,
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      borderRadius: '50%',
                      padding: '2px',
                    }}
                  />
                  {coverPhotoResourceId === item.resource.id && (
                    <Badge
                      color="blue"
                      variant="filled"
                      style={{
                        position: 'absolute',
                        left: '8px',
                        top: '8px',
                        zIndex: 10,
                      }}
                    >
                      Cover
                    </Badge>
                  )}
                  <Image
                    src={item.url}
                    alt={`Image ${index + 1}`}
                    radius="md"
                    style={{ width: '150px', height: '150px', objectFit: 'cover' }}
                  />
                </div>
              ))}
            </div>
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
        <Flex justify="center" align="center" direction="row" gap="md" mt="md">
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => setShowImageUploadModal(true)}
            >
              Add Image
            </Button>
            {imagePaths.length > 0 && (
              <Button
                variant="light"
                leftSection={<IconPhoto size={16} />}
                onClick={handleSelectCoverPhoto}
              >
                Change Cover Photo
              </Button>
            )}
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

      <Modal
        opened={viewerModalOpened}
        onClose={() => {
          setViewerModalOpened(false);
          setIsSelectingCoverPhoto(false);
        }}
        size="xl"
        padding={0}
        withCloseButton={false}
        centered
        overlayProps={{
          backgroundOpacity: 0.75,
          blur: 3,
        }}
        zIndex={400}
        radius="md"
        styles={{
          body: { position: 'relative', padding: 0 },
          content: { borderRadius: 'var(--mantine-radius-md)' },
          overlay: { zIndex: 400 },
        }}
      >
        {imagePaths.length > 0 && (
          <div style={{ position: 'relative', width: '100%', height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ActionIcon
              variant="filled"
              size="lg"
              radius="xl"
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                zIndex: 10,
              }}
              onClick={() => {
                setViewerModalOpened(false);
                setIsSelectingCoverPhoto(false);
              }}
            >
              <IconX size={20} />
            </ActionIcon>
            <Image
              src={imagePaths[selectedImageIndex].url}
              alt={`Image ${selectedImageIndex + 1}`}
              fit="contain"
              style={{ maxWidth: '100%', maxHeight: '100%' }}
            />
            {imagePaths.length > 1 && !isSelectingCoverPhoto && (
              <>
                <ActionIcon
                  variant="filled"
                  size="xl"
                  radius="xl"
                  style={{
                    position: 'absolute',
                    left: 16,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 10,
                  }}
                  onClick={() => navigateImage('prev')}
                >
                  <IconChevronLeft size={24} />
                </ActionIcon>
                <ActionIcon
                  variant="filled"
                  size="xl"
                  radius="xl"
                  style={{
                    position: 'absolute',
                    right: 16,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 10,
                  }}
                  onClick={() => navigateImage('next')}
                >
                  <IconChevronRight size={24} />
                </ActionIcon>
              </>
            )}
            {isSelectingCoverPhoto && (
              <Button
                variant="filled"
                color="blue"
                size="lg"
                style={{
                  position: 'absolute',
                  top: 20,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 10,
                }}
                onClick={() => setCoverPhoto(imagePaths[selectedImageIndex].resource.id)}
              >
                Set as Cover Photo
              </Button>
            )}
            {imagePaths.length > 1 && isSelectingCoverPhoto && (
              <>
                <ActionIcon
                  variant="filled"
                  size="xl"
                  radius="xl"
                  style={{
                    position: 'absolute',
                    left: 16,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 10,
                  }}
                  onClick={() => navigateImage('prev')}
                >
                  <IconChevronLeft size={24} />
                </ActionIcon>
                <ActionIcon
                  variant="filled"
                  size="xl"
                  radius="xl"
                  style={{
                    position: 'absolute',
                    right: 16,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 10,
                  }}
                  onClick={() => navigateImage('next')}
                >
                  <IconChevronRight size={24} />
                </ActionIcon>
              </>
            )}
            <Text
              size="sm"
              c="dimmed"
              style={{
                position: 'absolute',
                bottom: isSelectingCoverPhoto ? 16 : 16,
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                padding: '4px 12px',
                borderRadius: 4,
                color: 'white',
              }}
            >
              {selectedImageIndex + 1} / {imagePaths.length}
            </Text>
          </div>
        )}
      </Modal>
    </>
  );
}
