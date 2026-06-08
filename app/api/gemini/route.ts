import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildRagSystemPrompt, retrieveSupabaseContext } from '@/lib/aiRag';
import { createServiceSupabaseClient } from '@/lib/supabase-server';

const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash'];

function isRetryableGeminiError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return /503|429|high demand|unavailable|overloaded/i.test(message);
}

async function generateGeminiResponse(
    apiKey: string,
    systemPrompt: string,
    history: { role: string; content: string }[],
    message: string,
): Promise<string> {
    const genAI = new GoogleGenerativeAI(apiKey);

    const contents = [
        ...(history || []).map((msg) => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
        })),
        {
            role: 'user' as const,
            parts: [{ text: message }],
        },
    ];

    let lastError: unknown;

    for (const modelName of GEMINI_MODELS) {
        try {
            const model = genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: systemPrompt,
            });

            const result = await model.generateContent({ contents });
            return result.response.text();
        } catch (error) {
            lastError = error;
            console.error(`[gemini] ${modelName} failed:`, error);
            if (!isRetryableGeminiError(error)) break;
        }
    }

    throw lastError instanceof Error ? lastError : new Error('Failed to generate response');
}

export async function POST(request: Request) {
    try {
        const { message, history, userName, userRole } = await request.json();
        const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: 'Google Gemini API key is not configured' }, { status: 500 });
        }

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        const supabase = createServiceSupabaseClient();
        const ragContext = await retrieveSupabaseContext(supabase, message);
        const systemPrompt = buildRagSystemPrompt(ragContext, userName, userRole, message);

        const text = await generateGeminiResponse(apiKey, systemPrompt, history || [], message);

        return NextResponse.json({
            response: text,
            sources: {
                searchTerms: ragContext.searchTerms,
                people: ragContext.people.length,
                companies: ragContext.companies.length,
                shows: ragContext.shows.length,
                tasks: ragContext.tasks.length,
            },
        });
    } catch (error) {
        console.error('Gemini API Error:', error);
        const message = error instanceof Error ? error.message : 'Failed to generate response';
        const friendly = /503|high demand|unavailable/i.test(message)
            ? 'Fairplatz AI is busy right now. Please try again in a moment.'
            : message;
        return NextResponse.json({ error: friendly }, { status: 500 });
    }
}
