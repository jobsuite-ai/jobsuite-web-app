import { TemplateInput } from './template_model';

export const generateTemplate = (template: TemplateInput) => `
    <!DOCTYPE html>
    <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Estimate #3110</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    margin: 0;
                    padding: 20px;
                    background-color: #f9f9f9;
                    color: #333;
                }
                .container {
                    background: #fff;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                    padding: 20px;
                    max-width: 800px;
                    margin: auto;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }
                h1 {
                    text-align: center;
                }
                .header, .footer {
                    text-align: center;
                    font-size: 0.9em;
                    color: #555;
                }
                .contact, .estimate-details, .notes {
                    margin: 20px 0;
                }
                .contact p, .estimate-details p, .notes p {
                    margin: 5px 0;
                }
                .total {
                    font-weight: bold;
                    font-size: 1.2em;
                }
                .notes, .terms {
                    background: #f8f8f8;
                    border-left: 4px solid #007bff;
                    padding: 10px;
                    margin: 20px 0;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Estimate</h1>
                
                <div class="header">
                    <p><strong>R L Peek Painting</strong></p>
                    <p>P.O. Box 2351, Park City, Utah 84060</p>
                    <p>Phone: <a href="tel:(435)649-0158">(435) 649-0158</a></p>
                    <p>Email: <a href="mailto:info@rlpeekpainting.com">info@rlpeekpainting.com</a></p>
                    <p>Web: <a href="http://www.rlpeekpainting.com" target="_blank">www.rlpeekpainting.com</a></p>
                </div>
                
                <div class="contact">
                    <h2>Prepared For:</h2>
                    <p><strong>${template.clientName}</strong></p>
                    <p>9325 Back Nine Circle</p>
                    <p>Phone: (650) 248-0967</p>
                </div>

                <div class="estimate-details">
                    <p><strong>Estimate #:</strong> 3110</p>
                    <p><strong>Date:</strong> 10/08/2024</p>
                    <h3>Description</h3>
                    <p>Interior: $34,228.00</p>
                    <p>
                        Areas to be painted are all areas other than Master bedroom/bath/closet, kitchen and dining 
                        areas, garage/mudroom area, basement (except stairway). No posts and beams to be painted 
                        except one in upper bedroom. Mask and cover any areas needing protection. Prime and paint:
                    </p>
                    <ul>
                        <li>All vanities (excluding Master Bedroom)</li>
                        <li>All interior doors, jambs, and casings in specified areas</li>
                        <li>Office cabinets, living room mantel and cabinet underneath</li>
                        <li>Railings to upstairs and downstairs</li>
                        <li>Exterior window/door casings & baseboards</li>
                        <li>Stairway walls to basement (no walls or trim beyond that area)</li>
                    </ul>
                    <p>All closets in upstairs bedroom areas will be painted. Brush and roll two coats on walls 
                    and ceilings in specified areas. Clean and remove any paint/stain-related debris.</p>
                    <p class="total"><strong>Total:</strong> $34,228.00</p>
                </div>

                <div class="notes">
                    <h3>Notes</h3>
                    <p>Estimate includes a winter discount for work completed between January 6th and April 1st.</p>
                </div>

                <div class="terms">
                    <h3>Terms</h3>
                    <p>
                        A 30% deposit is due prior to commencement of work. Balance is due upon completion. 
                        Accepted payment method: Check only.
                    </p>
                    <p>Customer agrees to pay 2% interest per month on past-due accounts. Additional costs, 
                    including legal fees, will be borne by the customer in case of delinquency.</p>
                    <p>
                        <strong>Additional Notes:</strong> A work trailer will need to be placed in the homeowner's driveway. 
                        R. L. Peek Painting does not dispose of unused paint or wash windows upon completion.
                    </p>
                </div>


                <signature-field
                    name="Property Owner's Signature"
                    role="Property Owner"
                    style="width: 160px; height: 80px; display: inline-block;">
                </signature-field>

                <div class="footer">
                    <p>© 2024 R L Peek Painting. All rights reserved.</p>
                </div>
            </div>
        </body>
    </html>
`;
