'use client';

import { useEffect, useState } from 'react';

import { Paper } from '@mantine/core';
import { remark } from 'remark';
import html from 'remark-html';
import { v4 as uuidv4 } from 'uuid';

import EstimateTodo from './EstimateTodo';
import classes from '../styles/JobDetails.module.css';

import { generateTemplate } from '@/app/api/estimate_template/template_builder';
import { TemplateDescription, TemplateInput } from '@/app/api/estimate_template/template_model';
import LoadingState from '@/components/Global/LoadingState';
import { DynamoClient, JobStatus, SingleJob } from '@/components/Global/model';
import UniversalError from '@/components/Global/UniversalError';
import { UploadNewTemplate } from '@/components/JobDetails/estimate/UploadNewTemplate';

export default function EstimateDetails({ job }: { job: SingleJob }) {
    const [loading, setLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [client, setClient] = useState<DynamoClient>();
    const [template, setTemplate] = useState<string>('');

    useEffect(() => {
        setLoading(true);
        const loadClientDetails = async () => {
            const response = await fetch(
                `/api/clients/${job.client_id.S}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            const { Item } = await response.json();
            setClient(Item);
        };
        if (!client) {
            loadClientDetails();
        }
        buildTemplate().finally(() => setLoading(false));
    }, [client]);

    const imagePath = job.images
            ? `https://rl-peek-job-images.s3.us-west-2.amazonaws.com/${job.id.S}/${job.images.L[0].M.name.S}`
            : '';

    async function buildTemplate() {
        const result = await remark().use(html).process(job.transcription_summary?.S);
        const htmlString = result.toString();

        let lineItems: TemplateDescription[] = [];
        if (job?.line_items) {
            lineItems = job?.line_items?.L.map((item) => ({
                header: item.M.header.S,
                content: item.M.description.S,
                price: +item.M.price.N,
                hours: item.M.hours ? +item.M.hours.N : undefined,
            }));
        }

        if (client) {
            const templateInput: TemplateInput = {
                client: {
                    name: client.client_name.S,
                    city: job.city.S,
                    state: job.state.S,
                    email: client.email.S,
                    address: job.client_address.S,
                    phone: client.phone_number.S,
                },
                items: lineItems,
                image: imagePath,
                notes: htmlString,
                discountReason: job.discount_reason?.S ?? 'Winter Discount',
                estimateNumber: uuidv4().split('-')[0],
                rate: Number(job.hourly_rate.N),
            };

            setTemplate(generateTemplate(templateInput));
        }
    }

    return (
        <>{loading || isSending || !client ? <LoadingState /> :
            <div className={classes.jobDetailsWrapper}>
                {job ?
                    <>
                        {job.job_status.S === JobStatus.PENDING_ESTIMATE ?
                            <h1 style={{ marginTop: '30px' }}>Estimate Preview</h1>
                            :
                            <h1 style={{ marginTop: '30px' }}>Estimate Has Been Sent</h1>
                        }

                        <EstimateTodo job={job} />
                        <Paper shadow="sm" radius="md" mt="lg" withBorder>
                            <div dangerouslySetInnerHTML={{ __html: template }} />
                        </Paper>

                        <UploadNewTemplate
                          template={template}
                          job={job}
                          clientEmail={client.email.S}
                          setLoading={setIsSending}
                        />
                    </>
                    : <UniversalError message="Unable to access job details" />
                }
            </div>
        }
        </>
    );
}
