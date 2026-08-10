export const dynamic = 'force-dynamic';

/** Web liveness probe. */
export function GET() {
  return Response.json({ status: 'ok', service: 'web' });
}
