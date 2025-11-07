'use client';

import { useEffect, useState } from 'react';

import { Button, Card, Flex, Image, Modal, Paper } from '@mantine/core';
import { IconX } from '@tabler/icons-react';

import ImageUpload from './ImageUpload';
import classes from './styles/VideoUploader.module.css';

import { UpdateJobContent } from '@/app/api/projects/jobTypes';

const JobImage = ({ estimateID, imageName }: { estimateID: string, imageName: string }) => {
    const [showImageUploadModal, setShowImageUploadModal] = useState(false);
    const [imagePath, setImagePath] = useState('');
    const [image, setImage] = useState(imageName);

    useEffect(() => {
        if (image) {
            const key = `${estimateID}/${image}`;
            setImagePath(`https://rl-peek-job-images.s3.us-west-2.amazonaws.com/${key}`);
        }
    }, [image]);

    const deleteImage = async () => {
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

        await response.json();
        setImagePath('');
    };

    return (
        <>
            {imagePath ?
                <Card shadow="xs" radius="md" withBorder className={classes.jobImageWrapper}>
                    <IconX
                      onClick={() => deleteImage()}
                      style={{ cursor: 'pointer', position: 'absolute', right: '10px', top: '10px', width: '20px' }}
                    />
                    <Image
                      className={classes.jobImage}
                      radius={20}
                      src={imagePath}
                    />
                </Card>
                :
                <Paper shadow="sm" radius="md" withBorder p="lg">
                    <Flex justify="center" align="center" gap="lg" direction="column">
                        <Image
                          className={classes.jobImage}
                          radius={20}
                          src="https://i.ibb.co/R0xWFjF/Screenshot-2025-01-26-at-6-23-24-PM.png"
                        />
                        <Button onClick={() => setShowImageUploadModal(true)}>
                            Upload a picture of the house
                        </Button>
                    </Flex>
                </Paper>
            }
            <Modal
              opened={showImageUploadModal}
              size={700}
              padding={30}
              transitionProps={{ duration: 200 }}
              withCloseButton
              onClose={() => setShowImageUploadModal(false)}
            >
                <ImageUpload
                  estimateID={estimateID}
                  setImage={setImage}
                  setShowModal={setShowImageUploadModal}
                />
            </Modal>
        </>
    );
};

export default JobImage;
