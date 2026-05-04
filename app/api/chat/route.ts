import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { message, pdfContext } = await req.json()

    const systemPrompt = `You are Liyakhanya AI, a South African study partner for Grade 10-12. 
Explain Electrical Technology, Math, and Physical Sciences simply.
Use SA examples and CAPS curriculum.
${pdfContext? `Base answers on this textbook: ${pdfContext.slice(0, 12000)}` : ''}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message || "Say hello" }
      ],
    })

    return NextResponse.json({ response: completion.choices[0].message.content })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 })
  }
}