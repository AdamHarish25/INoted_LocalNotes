import { Mistral } from '@mistralai/mistralai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    const apiKey = process.env.MISTRAL_API_KEY || '';

    if (!apiKey) {
        console.error("MISTRAL_API_KEY is not set in environment variables!");
        return NextResponse.json({ error: 'MISTRAL_API_KEY is not set in environment variables.' }, { status: 500 });
    }

    const client = new Mistral({ apiKey: apiKey });

    try {
        const { messages, context } = await req.json();

        let systemPrompt = "You are a helpful AI assistant for the INoted app. Answer concisely and assist the user.";
        
        // Build content array for Mistral (text + images)
        let contextContent: any[] = [];
        if (context) {
            let parsedContext;
            try {
                parsedContext = typeof context === 'string' ? JSON.parse(context) : context;
            } catch (e) {
                parsedContext = { textContent: context, images: [] };
            }
            
            if (parsedContext.documentName) {
                systemPrompt += `\n\nDocument Name: ${parsedContext.documentName}`;
            }
            
            if (parsedContext.textContent) {
                contextContent.push({ type: 'text', text: `Current document text content:\n${parsedContext.textContent}` });
            }
            
            if (parsedContext.images && Array.isArray(parsedContext.images) && parsedContext.images.length > 0) {
                parsedContext.images.forEach((imageUrl: string) => {
                    contextContent.push({ type: 'image_url', image_url: { url: imageUrl } });
                });
            }
        }

        // Build messages array for Mistral
        const mistralMessages: any[] = [];
        
        // Add system prompt as first message
        mistralMessages.push({ role: 'system', content: systemPrompt });
        
        // Add context if available
        if (contextContent.length > 0) {
            mistralMessages.push({ 
                role: 'user', 
                content: [
                    { type: 'text', text: 'Here is the current content of the document I am working on:' },
                    ...contextContent
                ]
            });
        }
        
        // Add user messages
        messages.forEach((msg: any) => {
            mistralMessages.push(msg);
        });

        console.log("Mistral Messages to send:", mistralMessages);

        const agentId = process.env.MISTRAL_AGENT_ID;

        let res = null;
        if (agentId) {
            try {
                console.log("Attempting to use Mistral Agent with ID:", agentId);
                res = await client.agents.stream({
                    agentId: agentId,
                    // Note: 'system' role is not supported in agents endpoint, so we inject context into user message
                    messages: mistralMessages,
                });
            } catch (err: any) {
                console.warn("Mistral Agent failed, falling back to standard chat model:", err.message);
                res = null;
            }
        }

        if (!res) {
            console.log("Using standard Mistral chat model");
            res = await client.chat.stream({
                model: 'mistral-medium-latest',
                messages: mistralMessages,
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
                } catch (e: any) {
                    console.error("Stream error:", e);
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
        console.error("Error details:", JSON.stringify(error, null, 2));
        return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 });
    }
}
