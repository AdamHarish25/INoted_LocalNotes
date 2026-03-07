import { Mistral } from '@mistralai/mistralai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    const apiKey = process.env.MISTRAL_API_KEY || '';

    if (!apiKey) {
        return NextResponse.json({ error: 'MISTRAL_API_KEY is not set in environment variables.' }, { status: 500 });
    }

    const client = new Mistral({ apiKey: apiKey });

    try {
        const { messages, context } = await req.json();

        let systemPrompt = "You are a helpful AI assistant for the INoted app. Answer concisely and assist the user.";
        if (context) {
            systemPrompt += `\n\nHere is the current context of the document the user is working on:\n${context}`;
        }

        const agentId = process.env.MISTRAL_AGENT_ID;

        let res = null;
        if (agentId) {
            try {
                res = await client.agents.stream({
                    agentId: agentId,
                    // Note: 'system' role is not supported in agents endpoint, so we inject context into user message
                    messages: [
                        ...messages
                    ],
                });
            } catch (err: any) {
                console.warn("Mistral Agent failed, falling back to standard chat model:", err.message);
                res = null;
            }
        }

        if (!res) {
            res = await client.chat.stream({
                model: 'mistral-large-latest',
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages
                ],
            });
        }

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of res) {
                        const content = chunk.data.choices[0].delta.content;
                        if (typeof content === 'string') {
                            controller.enqueue(new TextEncoder().encode(content));
                        }
                    }
                    controller.close();
                } catch (e) {
                    controller.error(e);
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error: any) {
        console.error("Mistral API Error:", error);
        return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 });
    }
}
