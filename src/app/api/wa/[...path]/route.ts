import { forwardToWhatsAppService } from '@/server/wa-proxy';

interface RouteProps {
  params: Promise<{ path?: string[] }>;
}

export async function GET(request: Request, props: RouteProps) {
  const { path } = await props.params;
  return forwardToWhatsAppService(request, path || []);
}

export async function POST(request: Request, props: RouteProps) {
  const { path } = await props.params;
  return forwardToWhatsAppService(request, path || []);
}

export async function PUT(request: Request, props: RouteProps) {
  const { path } = await props.params;
  return forwardToWhatsAppService(request, path || []);
}

export async function DELETE(request: Request, props: RouteProps) {
  const { path } = await props.params;
  return forwardToWhatsAppService(request, path || []);
}
