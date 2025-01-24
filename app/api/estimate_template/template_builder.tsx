import { TemplateInput, TemplateDescription } from './template_model';

const generateDescriptions = (descriptions: TemplateDescription[]) => {
    let output = '';
    descriptions.forEach((description) => {
        const html = `
            <div class="description">
                <div class="price-section">
                    <p>${description.header}</p>
                    <p>${getPriceFromNumber(description.price)}</p>
                </div>
                <div>
                    ${description.content}
                </div>
            </div>
        `;
        output += html;
    });

    return output;
};

const generateTotals = (descriptions: TemplateDescription[]) => {
    let output = '';
    let total = 0;

    descriptions.forEach((description) => {
        total += description.price;
        const html = `
            <div class="subtotal">
                <div>${description.header}</div>
                <div style="font-weight: normal;">${getPriceFromNumber(description.price)}</div>
            </div>
        `;
        output += html;
    });

    const subAndTotal = `
        <div class="subtotal" style="border-top: 1px solid !important; padding-top: 10px;">
            <div>Subtotal</div>
            <div style="font-weight: normal;">${getPriceFromNumber(total)}</div>
        </div>
        <div class="total">
            <p>Total</p>
            <p>${getPriceFromNumber(total)}</p>
        </div>
    `;

    output += subAndTotal;
    return output;
};

const getPriceFromNumber = (num: number) => num.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
    });

const getTodaysDate = () => {
    const today = new Date();
    return `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
};

export const generateTemplate = (template: TemplateInput) => `
    <!DOCTYPE html>
    <html lang="en">

    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Estimate #3110</title>
        <style>
            p {
                margin: 0;
            }

            .body-wrapper {
                font-family: Helvetica Neue, Helvetica, Arial, sans-serif;
                line-height: 1.5;
                color: #333;
            }

            .container {
                background: #fff;
                border-radius: 5px;
                padding: 40px;
                max-width: 800px;
                margin: auto;
            }

            h1 {
                margin: 0;
                text-align: center;
                color: lightgrey;
                font-weight: lighter;
                font-weight: 200;
                font-family: Helvetica Neue, Helvetica, Arial, sans-serif;
            }

            /* Flex Box Page Layout */
            .full-page-wrapper {
                display: flex;
                flex-direction: column;
            }

            .top-wrapper {
                display: flex;
                flex-direction: row;
                justify-content: space-between;
            }

            .left-top-wrapper {
                display: flex;
                flex: 1;
                flex-direction: column;
            }

            /* Section Styling */
            .rlpp-contact {
                text-align: left;
            }

            .client-contact {
                flex: 1;
                text-align: right;
            }

            .image-wrapper {
                margin-top: 30px;
            }

            .estimate-details {
                margin-bottom: 50px;
            }

            .estimate-body {
                padding-bottom: 30px;
            }

            .footer {
                text-align: center;
                font-size: 0.9em;
                color: #555;
            }
            
            .description {
                border-bottom: 1px solid !important;
                padding: 10px 0;
            }

            .price-section {
                font-size: 18px;
                margin-bottom: 30px;
            }

            /* Component Styling */
            .logo {
                width: 40%;
                margin-bottom: 10px;
            }

            .price-section,
            .content-headers {
                display: flex;
                flex-direction: row;
                justify-content: space-between;
            }

            .total {
                border-top: 2px solid !important;
            }
            .subtotal {
                margin-bottom: 10px;
            }

            .subtotal,
            .total {
                display: flex;
                justify-content: space-between;
                flex-direction: row;
                font-weight: bold;
                font-size: 18px;
            }

            .totals-container {
                flex-grow: 2;
                width: 50%;
            }

            .totals-wrapper {
                padding: 50px 0;
                display: flex;
            }

            .content-headers {
                padding-bottom: 5px;
                border-bottom: 1px solid !important;
                margin-bottom: 10px;
            }

            .notes {
                margin-top: 30px;
                padding-top: 30px;
                padding-bottom: 30px;
            }

            .signature-section {
                display: flex;
                flex-direction: row;
                justify-content: space-between;
                margin-bottom: 30px;
            }

            .signature-field-wrapper {
                display: flex;
                flex-direction: column;
                padding: 20px;
            }

            .signature-field {
                border-bottom: 1px solid !important;
                width: 300px;
                height: 80px;
            }

            .signature-label {
                font-size: 18px;
                text-align: center;
            }

            .page-break {
                page-break-before: always;
                height: 2px; /* Optional height */
                margin-top: 20px; /* Optional margin */
            }

        </style>
    </head>

    <body class="body-wrapper">
        <div class="full-page-wrapper">
            <div class="container">
                <h1>ESTIMATE</h1>

                <div class="top-wrapper">
                    <div class="left-top-wrapper">
                        <img class="logo" src="https://i.postimg.cc/qMqG0VVT/rlpp-logo-clear.png" alt="RL Peek Painting Logo">
                        <div class="rlpp-contact">
                            <h3>R L Peek Painting</h3>
                            <p>P.O. Box 2351, Park City, Utah 84060</p>
                            <p>Phone: <a href="tel:(435)649-0158">(435) 649-0158</a></p>
                            <p>Email: <a href="mailto:info@rlpeekpainting.com">info@rlpeekpainting.com</a></p>
                            <p>Web: <a href="http://www.rlpeekpainting.com" target="_blank">www.rlpeekpainting.com</a></p>
                        </div>
                    </div>

                    <div class="client-contact">
                        <p><strong>Date:</strong> ${getTodaysDate()}</p>
                        <p><strong>Estimate ID:</strong> 8a57d91694e3</p>
                        <h3 style="margin-top: 60px;">Prepared For</h3>
                        <p>${template.client.name}</p>
                        <p>${template.client.address}, ${template.client.city}, ${template.client.state}</p>
                        <p>Phone: ${template.client.phone}</p>
                        <p>${template.client.email}</p>
                    </div>
                </div>

                <div class="image-wrapper">
                    <img src="${template.image}" alt="Image of the house" style="width: 720px; border-radius: 5px; display: block; margin: 30px auto;" />
                </div>

                <div class="page-break"></div>

                <div class="estimate-details">                    
                    <div class="notes">
                        <p>${template.notes}</p>
                    </div>
                </div>

                <div class="page-break"></div>

                <div class="estimate-details">      
                    <div class="content-headers">
                        <h3>Description</h3>
                        <h3>Total</h3>
                    </div>
                    <div class="estimate-body">
                        ${generateDescriptions(template.items)}
                    </div>


                    <div class="totals-wrapper">
                        <div class="totals-container"></div>
                        <div class="totals-container">
                            ${generateTotals(template.items)}
                        </div>
                    </div>
                </div>

                <div class="page-break"></div>

                <p style="text-transform: uppercase;">
                    PLEASE NOTE THAT A WORK TRAILER WILL NEED TO BE PLACED IN HOMEOWNER'S DRIVEWAY. WE
                    ARE PROHIBITED FROM PARKING TRAILERS ON THE STREET.
                </p>

                <div class="terms">
                    <h3>Terms</h3>
                    <div style="margin-bottom: 30px;">
                        <ul>
                            <li>A 30% deposit is due prior to commencement of work. Balance is due upon completion.</li>
                            <li>Only payment form accepted is check.</li>
                            <li>We do not wash windows upon completion.</li>
                            <li>We do not dispose of any additional paint or stain material.</li>
                            <li>This proposal is valid for completion of the project within 6 months.</li>
                            <li>All accounts are due on completion of job.</li>
                        </ul>
                    </div>
                    <p style="margin-bottom: 30px;">
                        Customer agrees to pay R. L. Peek Painting interest
                        on all past due accounts at a rate of 2% per month and agrees to pay all expenses incurred by R.
                        L. Peek Painting in collecting this account, including costs and reasonable attorneys fees
                        incurred before and after suit and judgement.
                    </p>
                </div>

                <div class="signature-section">
                    <div class="signature-field-wrapper">
                        <signature-field name="RL Peek Painting Signature" role="Service Provider" class="signature-field">
                        </signature-field>
                        <div class="signature-label">RL Peek Painting</div>
                    </div>
                    <div class="signature-field-wrapper">
                        <signature-field name="Property Owner's Signature" role="Property Owner" class="signature-field">
                        </signature-field>
                        <div class="signature-label">${template.client.name}</div>
                    </div>
                </div>

                <div class="footer">
                    <p>© 2024 R L Peek Painting. All rights reserved.</p>
                </div>
            </div>
        </div>
    </body>

    </html>
`;
