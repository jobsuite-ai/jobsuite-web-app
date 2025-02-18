import { generateTemplate } from "../api/estimate_template/template_builder";
import { TemplateDescription, TemplateInput } from "../api/estimate_template/template_model";
import { v4 as uuidv4 } from 'uuid';

export default function Test() {
    let lineItems: TemplateDescription[] = [
        {
            header: "Test Header",
            content: "Test Content",
            price: 190
        }
    ];

    const template: TemplateInput = {
        client: {
            name: "Test Name",
            city: "Park City",
            state: "UT",
            email: "test@email.com",
            address: "1234 Test Rd",
            phone: "1234567890"
        },
        items: lineItems,
        image: "https://rl-peek-job-images.s3.us-west-2.amazonaws.com/029daa70-3650-4b1a-a909-9dc8e6997326/rotated_image-4.jpg",
        notes: "Some test stuff",
        estimateNumber: uuidv4().split('-')[0],
        rate: Number("106")
    };

    const generatedTemplate = generateTemplate(template);
    return (<>{generatedTemplate}</>);
}
