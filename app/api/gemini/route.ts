import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
    try {
        const { message, history } = await request.json();
        const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: 'Google Gemini API key is not configured' }, { status: 500 });
        }

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        // Initialize Supabase Client
        // We use the ANON key here. In a real production app with RLS, this might be limited.
        // If the user is authenticated in the app, we ideally want to forward their session,
        // but for this server-side API simplified demo, we'll try fetching what's accessible.
        // If RLS blocks this, we might need a Service Role key (careful!) or proper auth forwarding.
        // For now, assuming the public data or locally accessible data is fine for the tool.
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Fetch context data - RICHER DATA set for specific answers
        // 1. Saved People
        const { data: people } = await supabase
            .from('people')
            .select('name, title, organization_name, city, country, email, phone, linkedin_url')
            .limit(50); // Increased limit slightly

        // 2. Saved Companies
        const { data: companies } = await supabase
            .from('companies')
            .select('name, industry, location, website, phone, description')
            .limit(20);

        // Format context data string
        const peopleContext = people?.map(p =>
            `- NAME: ${p.name}
  TITLE: ${p.title} at ${p.organization_name}
  LOCATION: ${p.city}, ${p.country}
  EMAIL: ${p.email || 'N/A'}
  PHONE: ${p.phone || 'N/A'}
  LINKEDIN: ${p.linkedin_url || 'N/A'}`
        ).join('\n\n') || 'No saved people.';

        const companiesContext = companies?.map(c =>
            `- COMPANY: ${c.name}
  INDUSTRY: ${c.industry}
  LOCATION: ${c.location}
  WEBSITE: ${c.website || 'N/A'}
  PHONE: ${c.phone || 'N/A'}
  DESC: ${c.description || 'N/A'}`
        ).join('\n\n') || 'No saved companies.';

        const ai = new GoogleGenAI({ apiKey });

        const systemPrompt = `You are Fairplatz AI, an intelligent marketing assistant for Fairplatz.

SCOPE RESTRICTION:
You are STRICTLY limited to answering questions about:
1. Trade shows, exhibitions, and B2B marketing strategies.
2. The user's SAVED DATA (People and Companies) provided below.
3. Sales outreach, email drafting, and lead generation.

You MUST REFUSE to answer irrelevant topics (e.g., cooking, coding unconnected to marketing, general world trivia) by politely stating you are a specialized marketing assistant.

DATABASE CONTEXT:
The following is the user's saved data from Supabase. Use this EXACT data to answer questions like "What is the email of [Name]?" or "Give me details about [Company]".

--- SAVED PEOPLE ---
${peopleContext}

--- SAVED COMPANIES ---
${companiesContext}

--- END DATA ---

INSTRUCTIONS:
- When asked for details (email, phone, etc.), look them up in the provided data and answer accurately.
- If data is "N/A", state that it is not available in the saved records.
- Be helpful, professional, and concise.`;

        // Build conversation with system prompt
        // Note: SDK structure
        const conversation = [
            {
                role: 'user',
                parts: [{ text: systemPrompt }]
            },
            {
                role: 'model',
                parts: [{ text: 'Understood. I am Fairplatz AI, ready to help with marketing and your saved data.' }]
            },
            ...(history || []).map((msg: any) => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            })),
            {
                role: 'user',
                parts: [{ text: message }]
            }
        ];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: conversation,
        });

        const responseText = response.text;
        return NextResponse.json({ response: responseText });

    } catch (error: any) {
        console.error('Gemini API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate response' },
            { status: 500 }
        );
    }
}
