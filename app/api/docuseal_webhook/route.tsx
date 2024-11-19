export async function POST(request: Request) {
    try {
      const payload = await request.json();

      return Response.json({ message: `Webhook received successfully${payload}` }, { status: 200 });
    } catch (error) {
      return Response.json({ error: 'Failed to process webhook' }, { status: 500 });
    }
  }
