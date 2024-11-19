export async function POST(request: Request) {
    try {
      const payload = await request.json();
  
      // Process the webhook payload
      console.log("Webhook payload:");
      console.log(payload);
  
      // Perform necessary actions based on the payload
  
      return Response.json({ message: "Webhook received successfully" }, { status: 200 });
    } catch (error) {
      console.error("Error processing webhook:", error);
      return Response.json({ error: "Failed to process webhook" }, { status: 500 });
    }
  }