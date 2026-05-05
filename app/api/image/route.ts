import { NextRequest } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()
    console.log('Generating image:', prompt)

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    })

    const imageUrl = response.data?.[0]?.url
    if (!imageUrl) {
      throw new Error('No image URL returned from OpenAI')
    }

    return Response.json({ url: imageUrl })
  } catch (error: any) {
    console.error('DALL-E Error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}