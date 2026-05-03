import type { NextApiRequest, NextApiResponse } from 'next'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method!== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { question } = req.body
    console.log('User asked:', question)

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are Liyakhanya AI, an expert engineering tutor for South African students.
          Explain concepts clearly using simple examples. Show step-by-step calculations for math problems.
          Use metric units. If it's a South African context question, use local examples.`
        },
        { role: 'user', content: question }
      ],
      temperature: 0.3, // Lower = more accurate for math
    })

    const answer = completion.choices[0].message.content
    console.log('AI answered')

    res.status(200).json({ answer })

  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ answer: 'Something went wrong. Check your OpenAI API key.' })
  }
}