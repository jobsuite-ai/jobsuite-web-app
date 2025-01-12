"use client";

import { generateTemplate } from '@/app/api/estimate_template/template_builder';
import { TemplateDescription, TemplateInput } from '@/app/api/estimate_template/template_model';
import { JobStatus, SingleJob } from '@/components/Global/model';
import UniversalError from '@/components/Global/UniversalError';
import { UploadNewTemplate } from '@/components/JobDetails/estimate/UploadNewTemplate';
import { Flex, Paper } from '@mantine/core';
import classes from '../styles/JobDetails.module.css';
import { remark } from 'remark';
import html from 'remark-html';
import { useEffect, useState } from 'react';
import LoadingState from '@/components/Global/LoadingState';
import { v4 as uuidv4 } from 'uuid';
import EstimateTodo from './EstimateTodo';

export default function EstimateDetails({ job }: { job: SingleJob }) {
    const [loading, setLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [template, setTemplate] = useState<string>('');

    useEffect(() => {
        setLoading(true);
        buildTemplate().finally(() => setLoading(false));
    }, []);

    const imagePath = job.images
            ? "https://rl-peek-job-images.s3.us-west-2.amazonaws.com/" + job.id.S + '/' +job.images.L[0].M.name.S
            : '';

    async function buildTemplate() {
        const result = await remark().use(html).process(job.transcription_summary.S);
        const htmlString = result.toString();

        let lineItems: TemplateDescription[] = [];
        if (job?.line_items) {
            lineItems = job?.line_items?.L.map((item) => ({
                header: item.M.header.S,
                content: item.M.description.S,
                price: +item.M.price.N,
            }))
        };

        const template: TemplateInput = {
            client: {
                name: job.client_name.S,
                city: job.city.S,
                state: job.state.S,
                email: job.client_email.S,
                address: job.client_address.S,
                phone: job.client_phone_number.S
            },
            items: lineItems,
            image: imagePath,
            notes: htmlString,
            estimateNumber: uuidv4().split('-')[0],
        };

        setTemplate(generateTemplate(template));
    }

    return (
        <>{loading || isSending ? <LoadingState /> :
            <div className={classes.jobDetailsWrapper}>
                {job ? 
                    <>
                        {job.job_status.S == JobStatus.PENDING_ESTIMATE ?
                            <h1 style={{ marginTop: '30px' }}>Estimate Preview</h1>
                            :
                            <h1 style={{ marginTop: '30px' }}>Estimate Has Been Sent</h1>
                        }

                        <EstimateTodo job={job} />
                        <Paper shadow='sm' radius='md' mt='lg' withBorder>
                            <div dangerouslySetInnerHTML={{ __html: template }} />
                        </Paper>
                        
                        
                            <UploadNewTemplate template={template} job={job} setLoading={setIsSending} />
                    </>
                    : <UniversalError message='Unable to access job details' />
                }
            </div>
        }</>
    );
}