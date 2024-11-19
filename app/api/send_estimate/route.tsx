const axios = require('axios').default;

export async function POST(request: Request) {
    try {
        const {
            template_id,
        } = await request.json();

        const options = {
            method: 'POST',
            url: 'https://api.docuseal.com/submissions',
            headers: { 'X-Auth-Token': process.env.DOCU_SEAL_KEY, 'content-type': 'application/json' },
            data: {
              template_id,
              send_email: true,
              submitters: [{ role: 'First Party', email: 'jonas+thisand@rlpeekpainting.com' }],
            },
          };

        return axios.request(options).then((response: any) => {
            const output = response.data;
            return Response.json({ output });
        }).catch((error: any) => Response.json({ error: error.message }));
    } catch (error: any) {
        return Response.json({ error: error.message });
    }
}
