"use client";

import { TemplateInput } from '@/app/api/estimate_template/template_model';
import { Button } from '@mantine/core';

export function UploadNewTemplate() {
    async function createAndSendTemplate() {
        const template: TemplateInput = {
            client: {
                name: "Test Name",
                address: "1234 Example St",
                phone: "(435)-640-1234"
            },
            items: [
                {
                    header: 'Test',
                    price: 10000.50,
                    content: `This is some good content. This is some good content. This is some good content. 
                    This is some good content. This is some good content. `,
                },
                {
                    header: 'Test 2',
                    price: 100001.00,
                    content: `This is some good content. This is some good content. This is some good content. 
                    This is some good content. This is some good content. `,
                }
            ],
            notes: `These are some good notes. These are some good notes. These are some good notes. 
            These are some good notes. `,
            estimateNumber: 3115,
        };

        const templateResponse = await fetch(
            '/api/estimate_template',
            {
                method: 'POST',
                body: JSON.stringify({
                    templateInput: template,
                })
            }
        );
        const templateData = await templateResponse.json();
        

        const sendResponse = await fetch(
            '/api/send_estimate',
            {
                method: 'POST',
                body: JSON.stringify({
                    template_id: templateData.out.id,
                })
            }
        );
        const sendData = await sendResponse.json();
        console.log('Sent docuseal request.');
    }

    return (
        <div className='workflow-container'>
            <Button onClick={createAndSendTemplate}>
                Send Estimate
            </Button>
        </div>
    );
}