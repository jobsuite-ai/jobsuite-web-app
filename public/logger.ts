/**
 * Client-side logger that sends logs to a server-side API route.
 * This keeps AWS credentials secure on the server side.
 */
export async function logToCloudWatch(message: string, log_stream?: string) {
  try {
    await fetch('/api/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        logStream: log_stream,
      }),
    });
  } catch (err) {
    // Silently fail - logging should not break the application
    // Errors are handled server-side
  }
}
