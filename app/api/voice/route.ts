import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'nodejs'
export const maxDuration = 60

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const audioFile = formData.get('audio') as File
    const textInput = formData.get('text') as string

    if (!audioFile &&!textInput) {
      return NextResponse.json({ error: 'No audio or text provided' }, { status: 400 })
    }

    let userText = textInput

    // If audio provided, transcribe with Whisper
    if (audioFile) {
      console.log('Transcribing audio...')
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'en'
      })
      userText = transcription.text
      console.log('Transcribed:', userText)
    }

    if (!userText) {
      return NextResponse.json({ error: 'No text to process' }, { status: 400 })
    }

    // Get GPT response
    const chatResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are Liyakhanya AI. Answer concisely and conversationally. Max 100 words for voice.' },
        { role: 'user', content: userText }
      ],
      max_tokens: 150,
      temperature: 0.7,
    })

    const aiText = chatResponse.choices[0].message.content || 'Sorry, I had trouble responding.'

    // Generate voice with TTS
    console.log('Generating voice...')
    const speech = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova', // options: alloy, echo, fable, onyx, nova, shimmer
      input: aiText,
      response_format: 'mp3'
    })

    const audioBuffer = Buffer.from(await speech.arrayBuffer())
    const audioBase64 = audioBuffer.toString('base64')

    return NextResponse.json({
      text: aiText,
      audio: `data:audio/mp3;base64,${audioBase64}`
    })

  } catch (error: any) {
    console.error('Voice API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}