import { forwardToWhatsAppService } from '@/server/wa-proxy';

export async function GET(request: Request) {
  return forwardToWhatsAppService(request, ['status']);
}

export async function POST(request: Request) {
  return forwardToWhatsAppService(request, ['status']);
}
