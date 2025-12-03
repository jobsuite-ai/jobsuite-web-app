'use client';

import { useEffect, useState } from 'react';

import { Button, Card, Flex, Group, Modal, Stack, Text } from '@mantine/core';
import { IconDownload, IconFile, IconPlus, IconX } from '@tabler/icons-react';

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

  return (
    <>
      <div className={classes.sectionContent}>
        <Flex direction="column" gap="md">
          {fileResources.length > 0 ? (
            <Stack gap="sm">
              {fileResources.map((resource) => (
                <Card key={resource.id} shadow="xs" radius="md" withBorder p="md">
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
              ))}
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
