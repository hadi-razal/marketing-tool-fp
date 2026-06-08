import { NextResponse } from 'next/server';
import { buildRagSystemPrompt, retrieveSupabaseContext } from '@/lib/aiRag';
import { formatAiError, generateFairplatzAiResponse } from '@/lib/aiProvider';
import { createServiceSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
    try {
        const { message, history, userName, userRole } = await request.json();

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
            return NextResponse.json({ error: 'Supabase is not configured' }, { status: 500 });
        }

        const supabase = createServiceSupabaseClient();
        const ragContext = await retrieveSupabaseContext(supabase, message);
        const systemPrompt = buildRagSystemPrompt(ragContext, userName, userRole, message);

        const { text, provider } = await generateFairplatzAiResponse(
            systemPrompt,
            history || [],
            message,
        );

        return NextResponse.json({
            response: text,
            provider,
            sources: {
                searchTerms: ragContext.searchTerms,
                people: ragContext.people.length,
                companies: ragContext.companies.length,
                shows: ragContext.shows.length,
                tasks: ragContext.tasks.length,
            },
        });
    } catch (error) {
        console.error('Fairplatz AI Error:', error);
        return NextResponse.json({ error: formatAiError(error) }, { status: 500 });
    }
}
