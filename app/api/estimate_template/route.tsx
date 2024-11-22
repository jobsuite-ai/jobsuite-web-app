import { generateTemplate } from './template_builder';
// import * as fs from 'fs';

const axios = require('axios').default;

export async function POST(request: Request) {
    try {
        const {
            templateInput,
        } = await request.json();

        // Testing Resources Commented Out

        // const filename = './template.html';
        // const data = generateTemplate(template);
        // fs.writeFile(filename, data, (err) => {
        //     if (err) {
        //         console.error("Error writing to file:", err);
        //     } else {
        //         console.log("File written successfully!");
        //     }
        // });

        const options = {
            method: 'POST',
            url: 'https://api.docuseal.com/templates/html',
            headers: { 'X-Auth-Token': process.env.DOCU_SEAL_KEY, 'content-type': 'application/json' },
            data: {
                html: generateTemplate(templateInput),
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
