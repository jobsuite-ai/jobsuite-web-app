import { TemplateDescription, TemplateInput } from './template_model';

const getPrice = (description: TemplateDescription) =>
    // Always use the price from the line item (already calculated as hours * rate)
    getPriceFromNumber(description.price);

const generateDescriptions = (
    descriptions: TemplateDescription[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    rate: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    discountReason?: string
) => {
    let output = '';

    descriptions.forEach((description) => {
        // Always use the actual price from the line item (already calculated correctly)
        const displayPrice = getPrice(description);

        const html = `
            <div class="description">
                <div class="price-section">
                    <p>${description.header}</p>
                    <p>${displayPrice}</p>
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

const generateTotals = (
    descriptions: TemplateDescription[],
    rate: number,
    discountReason?: string,
    discountPercentage?: number,
) => {
    let output = '';
    // Sum up the actual prices from line items
    const subtotal = descriptions.reduce((sum, desc) => sum + desc.price, 0);

    // Calculate discount amount if discount percentage is provided
    const discountAmount = discountPercentage
        ? subtotal * (discountPercentage / 100)
        : 0;

    const total = subtotal - discountAmount;
    const percentDiscount = discountPercentage || 0;

    descriptions.forEach((description) => {
        const html = `
            <div class="subtotal">
                <div>${description.header}</div>
                <div style="font-weight: normal;">${getPrice(description)}</div>
            </div>
        `;
        output += html;
    });

    const subAndTotal = `
        <div class="subtotal" style="border-top: 1px solid !important; padding-top: 10px;">
            <div>Subtotal</div>
            ${discountPercentage ? `
                <div style="display: flex; flex-direction: column">
                    <div style="font-weight: normal; text-decoration: line-through;">${getPriceFromNumber(subtotal)}</div>
                    <div style="font-weight: normal;">${getPriceFromNumber(total)}</div>
                </div>
            ` : `<div style="font-weight: normal;">${getPriceFromNumber(subtotal)}</div>`}
        </div>
        ${discountPercentage ? `
            <div class="subtotal" style="border-top: 1px solid !important; padding-top: 10px;">
                <div style="color: green;">${discountReason || 'Discount'} (${percentDiscount.toFixed(1)}%)</div>
                <div style="font-weight: normal; color: green">-${getPriceFromNumber(discountAmount)}</div>
            </div>
        ` : ''}
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
                padding: 40px;
                max-width: 800px;
                margin: auto;
                border: none !important;
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
                border: none !important;
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
                display: flex;
                flex-direction: column;
            }

            .estimate-meta {
                margin-bottom: 0;
            }

            .client-info {
                margin-top: 0;
                /* Add padding to align with contractor name (logo is ~120px + margin) */
                padding-top: 62px;
            }

            .client-name {
                padding-top: 16px;
            }

            .client-info h3 {
                margin-top: 0;
                margin-bottom: 0;
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

            .terms {
                border-bottom: none !important;
                border-top: none !important;
            }

            .footer {
                text-align: center;
                font-size: 0.9em;
                color: #555;
                border-top: none !important;
                border-bottom: none !important;
                border-left: none !important;
                border-right: none !important;
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

            .trailer-notice {
                page-break-inside: avoid;
                break-inside: avoid;
                margin-top: 20px;
                margin-bottom: 20px;
            }

            .signature-section {
                display: flex;
                flex-direction: row;
                justify-content: space-between;
                margin-bottom: 30px;
                border-bottom: none !important;
                border-top: none !important;
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
                <h1>Project Proposal</h1>

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
                        <div class="estimate-meta">
                            <p><strong>Date:</strong> ${getTodaysDate()}</p>
                            <p><strong>Estimate ID:</strong> ${template.estimateNumber}</p>
                        </div>
                        <div class="client-info">
                            <h3>Prepared For</h3>
                            <p class="client-name">${template.client.name}</p>
                            <p>${template.client.address}, ${template.client.city}, ${template.client.state}</p>
                            <p>Phone: ${template.client.phone}</p>
                            <p>${template.client.email}</p>
                        </div>
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
                        ${generateDescriptions(template.items, template.rate, template.discountReason)}
                    </div>


                    <div class="totals-wrapper">
                        <div class="totals-container"></div>
                        <div class="totals-container">
                            ${generateTotals(template.items, template.rate, template.discountReason, template.discountPercentage)}
                        </div>
                    </div>
                </div>

                <div class="page-break"></div>

                <div class="trailer-notice">
                    <p style="text-transform: uppercase;">
                        PLEASE NOTE THAT A WORK TRAILER WILL NEED TO BE PLACED IN HOMEOWNER'S DRIVEWAY. WE
                        ARE PROHIBITED FROM PARKING TRAILERS ON THE STREET.
                    </p>
                </div>

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

                <div class="footer" style="border: none !important;">
                    <p style="border: none !important;">© 2025 R.L. Peek Painting. All rights reserved.</p>
                </div>
            </div>
        </div>
    </body>

    </html>
`;
