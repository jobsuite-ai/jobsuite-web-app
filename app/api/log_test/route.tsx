import { logToCloudWatch } from "@/public/logger";

const axios = require('axios').default;

export async function GET(req: Request) {

    try {
        await logToCloudWatch("This is a test log from Next.js!");
        return Response.json({ message: `Webhook received successfully` }, { status: 200 });
      } catch (error) {
        return Response.json({ message: `Webhook failed` }, { status: 500 });
      }
}