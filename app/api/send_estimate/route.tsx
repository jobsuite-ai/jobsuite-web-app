export async function POST(request: Request) {
    try {
        const {
            template_id,
        } = await request.json()

        var axios = require("axios").default;

        var options = {
            method: 'POST',
            url: 'https://api.docuseal.com/submissions',
            headers: {'X-Auth-Token': process.env.DOCU_SEAL_KEY, 'content-type': 'application/json'},
            data: {
              template_id: template_id,
              send_email: true,
              submitters: [{role: 'First Party', email: 'jonas+thisand@rlpeekpainting.com'}]
            }
          };

        return axios.request(options).then(function (response: any) {
            console.log(response.data);
            const output = response.data;
            return Response.json({ output });
        }).catch(function (error: any) {
            console.error(error);
        });
    } catch (error: any) {
        return Response.json({ error: error.message })
    }
}
