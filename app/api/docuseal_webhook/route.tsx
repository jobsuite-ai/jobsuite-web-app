import { JobStatus } from "@/components/Global/model";
import updateJobStatus from "@/components/Global/updateJobStatus";

export async function POST(request: Request) {
    try {
      const payload = await request.json();

      const jobStatusEnum = () => {
        switch(payload.event_type.split('.')[1]) {
          case 'viewed':
            return JobStatus.ESTIMATE_OPENED;
          case 'started':
            return JobStatus.ESTIMATE_OPENED;
          case 'completed':
            return JobStatus.ESTIMATE_ACCEPTED;
          case 'declined':
            return JobStatus.ESTIMATE_DECLINED;
          default:
            return JobStatus.PENDING_ESTIMATE;
        }
      }

      updateJobStatus(jobStatusEnum(), payload.data.template.external_id);
      return Response.json({ message: `Webhook received successfully ${payload}` }, { status: 200 });
    } catch (error) {
      return Response.json({ error: 'Failed to process webhook' }, { status: 500 });
    }
  }
