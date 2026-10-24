import { forwardToWhatsAppService } from '@/server/wa-proxy';

export async function POST(request: Request) {
  return forwardToWhatsAppService(request, ['send']);
}
