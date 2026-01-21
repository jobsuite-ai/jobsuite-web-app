/**
 * Utility functions for extracting and forwarding custom headers from backend responses
 */

/**
 * List of custom headers that should be forwarded from backend to browser
 * Headers starting with 'x-' are typically custom headers
 */
const FORWARDABLE_HEADERS = [
  'x-cache-hit',
  'x-backend-version',
  'x-backend-env',
] as const;

/**
 * Extracts custom headers from a backend Response object that should be forwarded to the browser
 * @param backendResponse - The Response object from a backend fetch call
 * @returns A Record<string, string> with the extracted headers, suitable for NextResponse
 */
export function extractBackendHeaders(
  backendResponse: Response
): Record<string, string> {
  const headers: Record<string, string> = {};

  // Extract each forwardable header if it exists
  for (const headerName of FORWARDABLE_HEADERS) {
    const headerValue = backendResponse.headers.get(headerName);
    if (headerValue !== null) {
      headers[headerName] = headerValue;
    }
  }

  return headers;
}
