'use client';

import { useState } from 'react';

import { Text } from '@mantine/core';
import { IconReload } from '@tabler/icons-react';

import MarkdownRenderer from '../../Global/MarkdownRenderer';
import { Estimate } from '../../Global/model';
import classes from '../styles/EstimateDetails.module.css';

import LoadingState from '@/components/Global/LoadingState';

export default function SpanishTranscription({ estimate, refresh }: {
    estimate: Estimate;
    refresh: Function;
}) {
    const [loading, setLoading] = useState(false);

    // Check if spanish_transcription exists and is not empty
    const hasSpanishTranscription = estimate.spanish_transcription
        && estimate.spanish_transcription.trim().length > 0;

    const reload = async () => {
        setLoading(true);
        refresh().finally(() => setLoading(false));
    };

    // Note: Spanish transcription can exist without a video, so we don't require video

    return (
        <div className={classes.transcriptionContainer}>
            {hasSpanishTranscription ?
                <MarkdownRenderer markdown={estimate.spanish_transcription || ''} />
                :
                <>
                    {loading ?
                        <LoadingState size="sm" />
                        :
                        <>
                            <div style={{ position: 'relative' }}>
                                <IconReload
                                  onClick={() => reload()}
                                  style={{ cursor: 'pointer', position: 'absolute', right: '0px' }}
                                />
                            </div>
                            <Text>The spanish transcription is still processing.</Text>
                        </>
                    }
                </>
            }
        </div>
    );
}
