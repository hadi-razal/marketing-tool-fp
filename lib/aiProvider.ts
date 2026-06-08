import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

export type ChatMessage = { role: string; content: string };

const CLAUDE_MODELS = [
    'claude-sonnet-4-6',
    'claude-sonnet-4-5-20250929',
    'claude-haiku-4-5-20251001',
];

const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.5-flash'];

function getClaudeApiKey(): string | undefined {
    return process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
}

function getGeminiApiKey(): string | undefined {
    return process.env.GOOGLE_GEMINI_API_KEY;
}

function errorText(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
}

export function formatAiError(error: unknown): string {
    const message = errorText(error);

    if (/401|authentication|invalid.*api key|invalid x-api-key/i.test(message)) {
        return 'Claude API key is invalid. Check CLAUDE_API_KEY in .env.local.';
    }
    if (/credit balance|billing|purchase credits|insufficient/i.test(message)) {
        return 'Claude credits are exhausted. Add billing at console.anthropic.com.';
    }
    if (/429|rate limit/i.test(message)) {
        return 'Fairplatz AI is receiving too many requests. Please try again in a moment.';
    }
    if (/503|529|overloaded|unavailable/i.test(message)) {
        return 'Fairplatz AI is busy right now. Please try again in a moment.';
    }
    if (/404|not_found_error|model:/i.test(message)) {
        return 'Claude model unavailable. Please try again — the server will use the next available model.';
    }
    return message || 'Failed to generate response';
}

function toClaudeMessages(history: ChatMessage[], message: string): Anthropic.MessageParam[] {
    const messages: Anthropic.MessageParam[] = history
        .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
        .map((msg) => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
        }));

    messages.push({ role: 'user', content: message });
    return messages;
}

async function generateWithClaude(
    apiKey: string,
    systemPrompt: string,
    history: ChatMessage[],
    message: string,
): Promise<string> {
    const anthropic = new Anthropic({ apiKey });
    const messages = toClaudeMessages(history, message);

    let lastError: unknown;

    for (const model of CLAUDE_MODELS) {
        try {
            const response = await anthropic.messages.create({
                model,
                max_tokens: 2048,
                system: systemPrompt,
                messages,
                temperature: 0.4,
            });

            const text = response.content
                .filter((block): block is Anthropic.TextBlock => block.type === 'text')
                .map((block) => block.text)
                .join('\n')
                .trim();

            if (text) return text;
            throw new Error('Empty response from Claude');
        } catch (error) {
            lastError = error;
            console.error(`[fairplatz-ai] Claude ${model} failed:`, error);
            if (/401|invalid.*api key|authentication/i.test(errorText(error))) break;
            const retryable =
                /404|not_found|429|500|502|503|529|overloaded|rate limit/i.test(errorText(error));
            if (!retryable) break;
        }
    }

    throw lastError instanceof Error ? lastError : new Error('Claude request failed');
}

async function generateWithGemini(
    apiKey: string,
    systemPrompt: string,
    history: ChatMessage[],
    message: string,
): Promise<string> {
    const genAI = new GoogleGenerativeAI(apiKey);

    const contents = [
        ...history.map((msg) => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
        })),
        { role: 'user' as const, parts: [{ text: message }] },
    ];

    let lastError: unknown;

    for (const modelName of GEMINI_MODELS) {
        try {
            const model = genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: systemPrompt,
            });
            const result = await model.generateContent({ contents });
            const text = result.response.text()?.trim();
            if (text) return text;
            throw new Error('Empty response from Gemini');
        } catch (error) {
            lastError = error;
            console.error(`[fairplatz-ai] Gemini ${modelName} failed:`, error);
            if (!/503|429|high demand|unavailable|overloaded/i.test(errorText(error))) break;
        }
    }

    throw lastError instanceof Error ? lastError : new Error('Gemini request failed');
}

/** Claude first, then Gemini if Claude is unavailable. */
export async function generateFairplatzAiResponse(
    systemPrompt: string,
    history: ChatMessage[],
    message: string,
): Promise<{ text: string; provider: 'claude' | 'gemini' }> {
    const claudeKey = getClaudeApiKey();
    const geminiKey = getGeminiApiKey();

    if (!claudeKey && !geminiKey) {
        throw new Error('No AI provider configured. Set CLAUDE_API_KEY in .env.local.');
    }

    if (claudeKey) {
        try {
            const text = await generateWithClaude(claudeKey, systemPrompt, history, message);
            return { text, provider: 'claude' };
        } catch (error) {
            const shouldFallback =
                geminiKey &&
                /401|credit balance|billing|invalid.*api key|authentication|429|overloaded/i.test(
                    errorText(error),
                );

            if (shouldFallback) {
                console.warn('[fairplatz-ai] Claude unavailable, falling back to Gemini');
                const text = await generateWithGemini(geminiKey, systemPrompt, history, message);
                return { text, provider: 'gemini' };
            }
            throw error;
        }
    }

    const text = await generateWithGemini(geminiKey!, systemPrompt, history, message);
    return { text, provider: 'gemini' };
}
