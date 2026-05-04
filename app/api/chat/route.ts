import { NextRequest } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { message, pdfContext, image } = await req.json()

    const systemPrompt = `You are Liyakhanya AI, a South African VarsityFriendly study partner for Grade 10-12 and first year university.

CAPABILITIES:
1. Draw tables using Markdown: | Header 1 | Header 2 |
2. Plot graphs using Mermaid: \`\`\`mermaid graph TD; A-->B; \`\`\` or \`\`\`mermaid xychart-beta... \`\`\`
3. Write code in Python, C++, Arduino - use \`\`\`python blocks
4. All math in LaTeX: inline $V = IR$ or block $$P = VI$$
5. Use SA examples: Eskom, load shedding, SABS
6. Keep answers under 200 words unless asked for detail
7. Be 100% accurate. If unsure, say so.

FORMATTING RULES:
- Tables for comparisons
- Mermaid graphs for circuits, flowcharts, xy plots
- Code blocks for Arduino/C++
- LaTeX for all formulas: $V_{RMS}$, $X_L = 2\\pi f L$
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
      temperature: 0.3,
      max_tokens: 600,
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