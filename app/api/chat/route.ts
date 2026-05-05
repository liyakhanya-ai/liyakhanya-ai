import { NextRequest } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { message, pdfContext, image, history } = await req.json()

    const systemPrompt = `You are Liyakhanya AI. You know everything and help with any topic.

CAPABILITIES:
1. Answer any question accurately using chat history for context
2. Draw tables using Markdown: | Header 1 | Header 2 |
3. Plot graphs using Mermaid: \`\`\`mermaid graph TD; A-->B; \`\`\`
4. Write code in any language - use \`\`\`python blocks
5. All math in LaTeX: inline $V = IR$ or block $$P = VI$$
6. For images, tell user to type "generate image: description"
7. Reference previous messages when relevant
${pdfContext? `\n\nUse this document as context: ${pdfContext.slice(0, 8000)}` : ''}`

    const messages: any[] = [
      { role: 'system', content: systemPrompt }
    ]

    // Add chat history for context
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
      temperature: 0.7,
      max_tokens: 1000,
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