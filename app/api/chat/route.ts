import { NextRequest } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { message, pdfContext } = await req.json()

    const systemPrompt = `You are Liyakhanya AI, a South African study partner for Grade 10-12. 
Explain Electrical Technology, Math, and Physical Sciences simply.
Use SA examples and CAPS curriculum. Keep answers under 150 words.
${pdfContext? `Use this textbook: ${pdfContext.slice(0, 8000)}` : ''}`

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 300,
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
  } catch (error) {
    return new Response('Chat failed', { status: 500 })
  }
}