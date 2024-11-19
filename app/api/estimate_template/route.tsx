import { TemplateInput } from "./template_model";
import { generateTemplate } from "./template_structure";

export async function POST(request: Request) {
    try {
        const {
            client_name,
        } = await request.json()

        const template: TemplateInput = {
            clientName: client_name,
        }

        var axios = require("axios").default;

        var options = {
            method: 'POST',
            url: 'https://api.docuseal.com/templates/html',
            headers: {'X-Auth-Token': process.env.DOCU_SEAL_KEY, 'content-type': 'application/json'},
            data: {
                html: generateTemplate(template),
                name: 'Job Estimate'
            }
        };


        return axios.request(options).then(function (response: any) {
            console.log(response.data);
            const out = response.data;
            return Response.json({ out });
        }).catch(function (error: any) {
            throw error;
        });
    } catch (error: any) {
        return Response.json({ error: error.message })
    }
}
