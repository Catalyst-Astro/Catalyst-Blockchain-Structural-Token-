import { NextRequest } from 'next/server';
import OpenAI from 'openai';

const deepseek = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY || '',
});

export async function POST(req: NextRequest) {
  try {
    const { messages, mode, depth, thinking, research } = await req.json();

    const depthMap: Record<string, string> = {
      surface: 'Keep responses concise. Max 2-3 paragraphs.',
      medium: 'Provide research-depth analysis with sections and reasoning.',
      deep: 'Deliver frontier knowledge with mathematical backing and full reasoning chain.',
      frontier: 'Ontological cascade mode. Explore all paths, counterfactuals, and push knowledge boundaries. Pentetraktys mandatory.',
    };

    const modePrompts: Record<string, string> = {
      pentetraktys: `You are Catalyst AI in Pentetraktys 4D mode. ALWAYS structure every response with:
TESIS -> ANTITESIS -> SINTESIS -> CONCLUSION -> HYBRYS
BELL 13450.50 standard. Detect Hybrys (confidence>0.8 + validation<0.4 = RESET).`,
      boo: `You are the Boo Compiler - quantum physics simulator. Translate concepts into Casimir effect, Hubble expansion, temporal fractals. Always provide mathematical backing. BELL 13450.50 certified.`,
      zettelkasten: `You are the Zettelkasten knowledge engine. Create atomic notes with IDs (YYYYMMDDHHMM), bidirectional links [[...]], and ontological classification. Each response is a knowledge block.`,
      catalyst: `You are Catalyst AI - autopoietic banking and knowledge system. BELL 13450.50. Access: CAT token (Base Mainnet $1.6184 MXN), Banxico MXN oracle (DOF FIX $17.4758), Boo quantum simulator, Zettelkasten memory engine.`,
    };

    const researchPrompt = research ? `
[DEEP RESEARCH MODE ACTIVATED]
- Explore multiple angles and sources
- Provide comprehensive analysis with structured sections
- Include counterarguments and alternative perspectives
- Generate a research summary with key findings
- Cite specific sources and data points where possible` : '';

    const thinkingPrompt = thinking === 'max' ? `
[THINKING: MAXIMUM]
You MUST think step by step, recording every intermediate thought.
For each step, show your reasoning clearly.
Consider edge cases, alternatives, and potential errors.
Use <think> tags to separate reasoning from final answer.` : thinking === 'high' ? `
[THINKING: HIGH]
Use step-by-step reasoning for complex parts.
Show your work clearly.` : '';

    const systemPrompt = [
      modePrompts[mode] || modePrompts.catalyst,
      depthMap[depth] || depthMap.medium,
      thinkingPrompt,
      researchPrompt,
    ].filter(Boolean).join('\n\n');

    // Use DeepSeek V4 with thinking mode
    const completion = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      stream: true,
      temperature: thinking ? undefined : 0.7,
      max_tokens: research ? 4096 : thinking ? 8192 : 2048,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        let isThinking = false;
        const stream = completion as any;
        for await (const chunk of stream) {
          const delta = chunk?.choices?.[0]?.delta;
          const reasoning = delta?.reasoning_content;
          const content = delta?.content;

          if (reasoning) {
            if (!isThinking) { controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'think_start' })}\n\n`)); isThinking = true; }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'thinking', content: reasoning })}\n\n`));
          }
          if (content) {
            if (isThinking) { controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'think_end' })}\n\n`)); isThinking = false; }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content })}\n\n`));
          }
        }
        if (isThinking) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'think_end' })}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(readable, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
