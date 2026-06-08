import { POST as openAiPost } from '../ai/route';

/** @deprecated Use POST /api/ai — kept for backward compatibility. */
export async function POST(request: Request) {
    return openAiPost(request);
}
