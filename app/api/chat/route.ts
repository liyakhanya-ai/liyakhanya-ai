import { NextRequest } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { message, pdfContext, image } = await req.json()

    const systemPrompt = `You are Liyakhanya AI, a South African VarsityFriendly study partner for Grade 10-12 and first year university.

RULES FOR ANSWERS:
1. Use CAPS curriculum and SA examples.
2. Format math/engineering formulas in LaTeX: inline $V = IR$ or block $$P = VI$$
3. Use proper engineering notation: $V_{RMS}$, $X_L = 2\\pi f L$, etc.
4. Keep answers under 180 words. Use bullet points and spacing for readability.
5. Be 100% accurate. If unsure, say so. Never guess formulas.
6. Explain steps clearly for calculations.
${pdfContext? `\n\nBase answers on this textbook: ${pdfContext.slice(0, 8000)}` : ''}`

    const userContent: any[] = [{ type: 'text', text: message }]
    if (image) {
      userContent.push({
        type: 'image_url',
        image_url: { url: image }
      })
    }

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      stream: true,
      temperature: 0.3, // Lower = more accurate for math
      max_tokens: 500,
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
    return new Response('Chat failed', { status: 500 })
  }
}