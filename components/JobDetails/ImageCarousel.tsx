"use client";

import { Carousel } from '@mantine/carousel';
import { Button, Group, Image, Modal, Paper, Text } from '@mantine/core';
import classes from './styles/NewJobVideoUpload.module.css';
import { useState } from 'react';
import ImageUpload from './ImageUpload';

const ImageCarousel = ({ jobID, imageNames }: { jobID: string, imageNames: string[] }) => {
    const [showImageUploadModal, setShowImageUploadModal] = useState(false);
    const [images, setImages] = useState(imageNames);

    const getImagePaths = () => {
        return images.map((imageName) => {
            const key = jobID + '/' + imageName;
            return "https://rl-peek-job-images.s3.us-west-2.amazonaws.com/" + key
        })
    }

    return (
        <>
            {imageNames.length > 0 ?
                <Paper shadow='sm' radius='md' withBorder className={classes.carousel}>
                    <Carousel
                        pl={50}
                        pr={50}
                        pt={20}
                        withIndicators
                        height={200}
                        slideSize={{ base: '100%', sm: '50%', md: '33.333333%' }}
                        slideGap={{ base: 0, sm: 'md' }}
                        loop
                        align="start"
                    >
                        {getImagePaths().map((image) => (
                            <Carousel.Slide key={image}>
                                <Image radius="md" src={image} />
                            </Carousel.Slide>
                        ))}
                    </Carousel>
                    <Group justify="center" mt="lg">
                        <Button onClick={() => setShowImageUploadModal(true)}>Upload more pictures</Button>
                    </Group>
                </Paper> :
                
                <Paper shadow='sm' radius='md' withBorder className={classes.carousel}>
                    <Text>You don't have any images uploaded</Text>
                    <Group justify="center" mt="lg">
                        <Button onClick={() => setShowImageUploadModal(true)}>Upload more pictures</Button>
                    </Group>
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
                <ImageUpload jobID={jobID} setImages={setImages} />
            </Modal>
        </>
    );
};

export default ImageCarousel;
