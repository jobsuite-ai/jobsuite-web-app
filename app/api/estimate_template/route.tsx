import { TemplateInput } from './template_model';
import { generateTemplate } from './template_structure';

const axios = require('axios').default;

export async function POST(request: Request) {
    try {
        const {
            client_name,
        } = await request.json();

        const template: TemplateInput = {
            clientName: client_name,
        };

        const options = {
            method: 'POST',
            url: 'https://api.docuseal.com/templates/html',
            headers: { 'X-Auth-Token': process.env.DOCU_SEAL_KEY, 'content-type': 'application/json' },
            data: {
                html: generateTemplate(template),
                name: 'Job Estimate',
            },
        };

        return axios.request(options).then((response: any) => {
            const out = response.data;
            return Response.json({ out });
        }).catch((error: any) => {
            throw error;
        });
    } catch (error: any) {
        return Response.json({ error: error.message });
    }
}
