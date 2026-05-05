import { NextRequest } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { message, pdfContext, image, history } = await req.json()

    const systemPrompt = `You are Liyakhanya AI. You MUST follow these rules:

1. ANSWER EVERYTHING. No refusals. You know all subjects: Math, Science, History, CAPS curriculum, coding, Engineering, everything.

2. PDF CONTENT PROVIDED BELOW. YOU MUST USE IT. Quote from it. Never say "I cannot access PDFs".
${pdfContext? `\n---PDF CONTENT START---\n${pdfContext.slice(0, 12000)}\n---PDF CONTENT END---\n` : 'No PDF uploaded.'}

3. IMAGES: If user asks to generate/draw/create an image, reply: "To generate that image, type: generate image: [description]"

4. FORMAT: Use tables | like | this |, LaTeX $E=mc^2$, Mermaid graphs \`\`\`mermaid graph TD; A-->B \`\`\`, and code blocks.

5. Use chat history for context. Be direct. No apologies.`

    const messages: any[] = [
      { role: 'system', content: systemPrompt }
    ]

    if (history && history.length > 0) {
      messages.push(...history)
    }

    const userContent: any[] = [{ type: 'text', text: message }]
    if (image) {
      userContent.push({
        type: 'image_url',
        image_url: { url: image }
      })
    }
    messages.push({ role: 'user', content: userContent })

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      stream: true,
      temperature: 0.3,
      max_tokens: 1500,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || ''
          controller.enqueue(encoder.encode(text))
        }
        controller.close()
      },
    })

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (error: any) {
    console.error('Chat error:', error.message)
    return new Response(`Chat failed: ${error.message}`, { status: 500 })
  }
}