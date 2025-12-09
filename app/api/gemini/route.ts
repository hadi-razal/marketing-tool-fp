import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
    try {
        const { message, history, userName } = await request.json();
        const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: 'Google Gemini API key is not configured' }, { status: 500 });
        }

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        // Supabase client
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Fetch saved people
        const { data: people } = await supabase
            .from('people')
            .select('name, title, organization_name, city, country, email, phone, linkedin_url')
            .limit(50);

        // Fetch saved companies
        const { data: companies } = await supabase
            .from('companies')
            .select('name, industry, location, website, phone, description')
            .limit(20);

        // Format people context
        const peopleContext = people?.map(p =>
            `- NAME: ${p.name}
  TITLE: ${p.title} at ${p.organization_name}
  LOCATION: ${p.city}, ${p.country}
  EMAIL: ${p.email || 'N/A'}
  PHONE: ${p.phone || 'N/A'}
  LINKEDIN: ${p.linkedin_url || 'N/A'}`
        ).join('\n\n') || 'No saved people.';

        // Format company context
        const companiesContext = companies?.map(c =>
            `- COMPANY: ${c.name}
  INDUSTRY: ${c.industry}
  LOCATION: ${c.location}
  WEBSITE: ${c.website || 'N/A'}
  PHONE: ${c.phone || 'N/A'}
  DESC: ${c.description || 'N/A'}`
        ).join('\n\n') || 'No saved companies.';

        // System prompt
        const systemPrompt = `
You are Fairplatz AI, a smart and helpful assistant.

USER CONTEXT:
User's name: "${userName || 'User'}"

YOUR ROLE:
You can use the saved data below about People and Companies, but you can also answer general questions with your full knowledge.

=== SAVED PEOPLE ===
${peopleContext}

=== SAVED COMPANIES ===
${companiesContext}

RULES:
1. If user asks about someone/company in saved data → answer using saved data.
2. If user asks general question → answer normally.
3. Be clear, helpful, and professional.
4. IMPORTANT: Keep your answers as short and concise as possible. Avoid fluff.
`;

        // Format conversation properly
        const finalConversation = [
            {
                role: "model",
                parts: [{ text: systemPrompt }]
            },
            ...(history || []).map((msg: any) => ({
                role: msg.role === "assistant" ? "model" : "user",
                parts: [{ text: msg.content }]
            })),
            {
                role: "user",
                parts: [{ text: message }]
            }
        ];

        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Get AI response
        const result = await model.generateContent({
            contents: finalConversation
        });

        const text = result.response.text();

        return NextResponse.json({ response: text });

    } catch (error) {
        console.error('Gemini API Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to generate response' },
            { status: 500 }
        );
    }
}
