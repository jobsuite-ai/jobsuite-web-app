const axios = require('axios').default;

export async function POST(request: Request) {
    try {
        const {
            template,
        } = await request.json();

        const options = {
            method: 'POST',
            url: 'https://api.docuseal.com/templates/html',
            headers: { 'X-Auth-Token': process.env.DOCU_SEAL_KEY, 'content-type': 'application/json' },
            data: {
                html: template,
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
