'use client';

import { useEffect, useState } from 'react';

import { useUser } from '@auth0/nextjs-auth0/client';
import { Button, Group, Textarea } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { v4 as uuidv4 } from 'uuid';

import { JobComment } from './JobComment';
import { SingleComment } from '../../Global/model';
import classes from '../styles/EstimateDetails.module.css';

import LoadingState from '@/components/Global/LoadingState';

export default function JobComments({ estimateID }: { estimateID: string }) {
    const [loading, setLoading] = useState(true);
    const [commentInputLoading, setCommentInputLoading] = useState(false);
    const [jobComments, setJobComments] = useState<SingleComment[]>();
    const [commentContents, setCommentContents] = useState<string>();
    const { user, isLoading } = useUser();

    useEffect(() => {
        setLoading(true);
        getJobComments().finally(() => setLoading(false));
    }, []);

    async function getJobComments() {
        const response = await fetch(
            `/api/job-comments/${estimateID}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        const { Items } = await response.json();
        setJobComments(Items);
    }

    async function postJobComment() {
        setCommentInputLoading(true);
        const timestamp = new Date();
        const id = uuidv4();
        const commenter = user?.name ?? 'unknown';
        const response = await fetch(
            '/api/job-comments',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id,
                    job_id: estimateID,
                    commenter,
                    comment_contents: commentContents,
                    timestamp,
                }),
            }
        );

        if (response.ok) {
            setCommentInputLoading(false);
            notifications.show({
                title: 'Success!',
                position: 'top-center',
                color: 'green',
                message: 'The comment was added successfully.',
            });
            setCommentContents('');
            const newComment: SingleComment = {
                id,
                job_id: estimateID,
                commenter,
                comment_contents: commentContents ?? '',
                timestamp: timestamp.toISOString(),
            };
            jobComments ? setJobComments([...jobComments, newComment])
                : setJobComments([newComment]);
        } else {
            notifications.show({
                title: 'Creation Failed',
                position: 'top-center',
                color: 'red',
                message: 'The comment failed to create.',
            });
        }
    }

    return (
        <>
            {(loading || isLoading || !user) ? <LoadingState /> :
                <div className={classes.commentsContainer}>
                    {jobComments?.map((comment) => (
                        <div key={comment.id}>
                            <JobComment commentDetails={comment} />
                        </div>
                    ))}
                    {commentInputLoading ? <LoadingState /> :
                    <>
                        <Textarea
                          w="100%"
                          placeholder="Enter comment here"
                          label="Add comment"
                          autosize
                          minRows={2}
                          onChange={(event) => setCommentContents(event.currentTarget.value)}
                          value={commentContents}
                          mt="md"
                        />
                        <Group justify="right" mt="md">
                            <Button onClick={() => postJobComment()}>Post Job Comment</Button>
                        </Group>
                    </>
                    }
                </div>
            }
        </>
    );
}
