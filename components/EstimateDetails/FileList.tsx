'use client';

import { useCallback, useEffect, useState } from 'react';

import { Button, Card, Flex, Group, Modal, Skeleton, Stack, Text } from '@mantine/core';
import { IconDownload, IconFile, IconEye, IconPlus, IconX } from '@tabler/icons-react';

import FileUpload from './FileUpload';
import classes from './styles/EstimateDetails.module.css';

import { EstimateResource } from '@/components/Global/model';

interface FileListProps {
  estimateID: string;
  resources: EstimateResource[];
  onUpdate?: () => void;
}

function getFileIcon() {
    return <IconFile size={24} />;
}

export default function FileList({ estimateID, resources, onUpdate }: FileListProps) {
  const [showFileUploadModal, setShowFileUploadModal] = useState(false);
  const [fileResources, setFileResources] = useState<EstimateResource[]>([]);
  const [previewStates, setPreviewStates] = useState<Record<string, {
    url: string | null;
    loading: boolean;
    isOpen: boolean;
  }>>({});

  useEffect(() => {
    if (resources && resources.length > 0) {
      const documentResources = resources.filter(
        (r) => r.resource_type === 'DOCUMENT' && r.upload_status === 'COMPLETED'
      );
      setFileResources(documentResources);
    } else {
      setFileResources([]);
    }
  }, [resources]);

  const deleteFile = async (resource: EstimateResource) => {
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
      console.error('Failed to delete file:', error);
    }
  };

  const handleFileUpload = () => {
    setShowFileUploadModal(false);
    // Refresh the file list
    if (onUpdate) {
      // Small delay to ensure backend has processed the upload
      setTimeout(() => {
        onUpdate();
      }, 500);
    }
  };

  const downloadFile = async (resource: EstimateResource) => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) return;

    try {
      // Get presigned URL for the file
      const response = await fetch(
        `/api/estimates/${estimateID}/resources/${resource.id}/presigned-url`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get download URL');
      }

      const data = await response.json();
      const presignedUrl = data.presigned_url || data.url;

      if (presignedUrl) {
        // Open the presigned URL in a new tab to download
        window.open(presignedUrl, '_blank');
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to download file:', error);
    }
  };

  const isPdfFile = (resource: EstimateResource) => resource.resource_location?.toLowerCase().endsWith('.pdf') ?? false;

  const getPdfPresignedUrl = useCallback(async (resource: EstimateResource) => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) return;

    // Set loading state
    setPreviewStates(prev => ({
      ...prev,
      [resource.id]: { ...prev[resource.id], loading: true, isOpen: true },
    }));

    try {
      const response = await fetch(
        `/api/estimates/${estimateID}/resources/${resource.id}/presigned-url`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // eslint-disable-next-line no-console
        console.error('Error fetching PDF presigned URL:', errorData);
        setPreviewStates(prev => ({
          ...prev,
          [resource.id]: { url: null, loading: false, isOpen: true },
        }));
        return;
      }

      const data = await response.json();
      const presignedUrl = data.presigned_url || data.url;

      if (!presignedUrl) {
        // eslint-disable-next-line no-console
        console.error('No presigned URL in response:', data);
        setPreviewStates(prev => ({
          ...prev,
          [resource.id]: { url: null, loading: false, isOpen: true },
        }));
        return;
      }

      setPreviewStates(prev => ({
        ...prev,
        [resource.id]: { url: presignedUrl, loading: false, isOpen: true },
      }));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching PDF presigned URL:', error);
      setPreviewStates(prev => ({
        ...prev,
        [resource.id]: { url: null, loading: false, isOpen: true },
      }));
    }
  }, [estimateID]);

  const togglePreview = (resource: EstimateResource) => {
    const currentState = previewStates[resource.id];

    if (currentState?.isOpen) {
      // Close preview
      setPreviewStates(prev => ({
        ...prev,
        [resource.id]: { ...prev[resource.id], isOpen: false },
      }));
    } else if (!currentState?.url && !currentState?.loading) {
        getPdfPresignedUrl(resource);
    } else {
        setPreviewStates(prev => ({
            ...prev,
            [resource.id]: { ...prev[resource.id], isOpen: true },
        }));
    }
  };

  return (
    <>
      <div className={classes.sectionContent}>
        <Flex direction="column" gap="md">
          {fileResources.length > 0 ? (
            <Stack gap="sm">
              {fileResources.map((resource) => {
                const previewState = previewStates[resource.id];
                const isPdf = isPdfFile(resource);

                return (
                  <div key={resource.id}>
                    <Card shadow="xs" radius="md" withBorder p="md">
                      <Group justify="space-between" align="center">
                        <Group gap="sm">
                          {getFileIcon()}
                          <div>
                            <Text fw={500} size="sm">
                              {resource.resource_location}
                            </Text>
                            <Text size="xs" c="dimmed">
                              Uploaded {new Date(resource.created_at).toLocaleDateString()}
                            </Text>
                          </div>
                        </Group>
                        <Group gap="xs">
                          {isPdf && (
                            <Button
                              variant="subtle"
                              size="xs"
                              leftSection={<IconEye size={16} />}
                              onClick={() => togglePreview(resource)}
                            >
                              {previewState?.isOpen ? 'Hide Preview' : 'Preview'}
                            </Button>
                          )}
                          <Button
                            variant="subtle"
                            size="xs"
                            leftSection={<IconDownload size={16} />}
                            onClick={() => downloadFile(resource)}
                          >
                            Download
                          </Button>
                          <IconX
                            onClick={() => deleteFile(resource)}
                            style={{
                              cursor: 'pointer',
                              width: '20px',
                              height: '20px',
                            }}
                          />
                        </Group>
                      </Group>
                    </Card>
                    {isPdf && previewState?.isOpen && (
                      <Card shadow="xs" radius="md" withBorder p="md" mt="sm">
                        {previewState.loading ? (
                          <Skeleton height={600} radius="md" />
                        ) : previewState.url ? (
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            minHeight: '500px',
                            width: '100%',
                            position: 'relative',
                            backgroundColor: '#f5f5f5',
                          }}>
                            <iframe
                              title={`PDF preview for ${resource.resource_location}`}
                              src={previewState.url || ''}
                              style={{
                                width: '100%',
                                height: '600px',
                                border: 'none',
                                borderRadius: '8px',
                                maxHeight: '70vh',
                                minHeight: '500px',
                                backgroundColor: '#fff',
                              }}
                              onLoad={() => {
                                // eslint-disable-next-line no-console
                                console.log('PDF iframe loaded successfully');
                              }}
                              onError={() => {
                                // eslint-disable-next-line no-console
                                console.error('PDF iframe failed to load');
                              }}
                            />
                            <Button
                              variant="light"
                              size="sm"
                              mt="md"
                              onClick={() => {
                                if (previewState.url) {
                                  window.open(previewState.url, '_blank');
                                }
                              }}
                            >
                              Open PDF in New Tab
                            </Button>
                          </div>
                        ) : (
                          <Text c="dimmed" ta="center" p="md">
                            Unable to load PDF preview
                          </Text>
                        )}
                      </Card>
                    )}
                  </div>
                );
              })}
            </Stack>
          ) : (
            <div className={classes.emptyState}>
              <IconFile size={48} style={{ opacity: 0.3 }} />
              <Text c="dimmed" ta="center">
                No files uploaded yet
              </Text>
            </div>
          )}
        </Flex>
        <Flex justify="center" align="center" direction="column" gap="md" mt="md">
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => setShowFileUploadModal(true)}
          >
            Add File
          </Button>
        </Flex>
      </div>

      <Modal
        opened={showFileUploadModal}
        size={700}
        padding={30}
        transitionProps={{ duration: 200 }}
        withCloseButton
        onClose={() => setShowFileUploadModal(false)}
        title="Upload Files"
      >
        <FileUpload
          estimateID={estimateID}
          setFile={handleFileUpload}
          setShowModal={setShowFileUploadModal}
        />
      </Modal>
    </>
  );
}
