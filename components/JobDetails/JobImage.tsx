"use client";

import { Button, Card, Flex, Image, Modal, Paper, Text } from '@mantine/core';
import classes from './styles/VideoUploader.module.css';
import { useEffect, useState } from 'react';
import ImageUpload from './ImageUpload';
import { IconX } from '@tabler/icons-react';
import { UpdateJobContent } from '@/app/api/jobs/jobTypes';
import LoadingState from '../Global/LoadingState';

const JobImage = ({ jobID, imageName }: { jobID: string, imageName: string }) => {
    const [showImageUploadModal, setShowImageUploadModal] = useState(false);
    const [imagePath, setImagePath] = useState('');
    const [image, setImage] = useState(imageName);

    useEffect(() => {
        if (image) {
            const key = jobID + '/' + image;
            setImagePath("https://rl-peek-job-images.s3.us-west-2.amazonaws.com/" + key);
        }
    }, [image]);


    const deleteImage = async () => {
        const content: UpdateJobContent = {
            delete_image: true
        }
    
        const response = await fetch(
            '/api/jobs',
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content: content, jobID }),
            }
        )
    
        const { Attributes } = await response.json();
        setImagePath('');
    }

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
                <Paper shadow='sm' radius='md' withBorder p='lg'>
                    <Flex justify="center" align='center' gap='lg' direction='column'>
                        <Image
                            className={classes.jobImage}
                            radius={20}
                            src='https://i.ibb.co/R0xWFjF/Screenshot-2025-01-26-at-6-23-24-PM.png'
                        />
                        <Button onClick={() => setShowImageUploadModal(true)}>Upload a picture of the house</Button>
                    </Flex>
                </Paper>
            }    
            <Modal
                opened={showImageUploadModal}
                size={700}
                padding={30}
                transitionProps={{ duration: 200 }}
                withCloseButton={true}
                onClose={() => setShowImageUploadModal(false)}
            >
                <ImageUpload jobID={jobID} setImage={setImage} setShowModal={setShowImageUploadModal} />
            </Modal>
        </>
    );
};

export default JobImage;
