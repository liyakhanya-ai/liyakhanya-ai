export const runtime = 'edge'

export async function POST(req: Request) {
  const { message } = await req.json()

  // Simple check: if message needs current info, search first
  const needsSearch = /\b(time|date|weather|news|current|latest|today|now)\b/i.test(message)

  let searchContext = ''
  if (needsSearch) {
    try {
      const searchRes = await fetch(`${process.env.VERCEL_URL? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: message })
      })
      const { results } = await searchRes.json()
      
      if (results?.length) {
        searchContext = `\n\nWeb search results:\n${results.map((r: any, i: number) => 
          `${i + 1}. ${r.title}\n${r.snippet}\nSource: ${r.url}`
        ).join('\n\n')}`
      }
    } catch (e) {
      console.error('Search failed:', e)
    }
  }

  // Now call your AI with search context
  const systemPrompt = `You are Liyakhanya. Answer using the web search results if provided. Be concise. Current date: ${new Date().toDateString()}.${searchContext}`

  // Replace this with your actual AI call - OpenAI, Anthropic, etc
  const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ]
    })
  })

  const aiData = await aiRes.json()
  const reply = aiData.choices?.[0]?.message?.content || 'Sorry, I had an issue.'

  return Response.json({ reply })
}