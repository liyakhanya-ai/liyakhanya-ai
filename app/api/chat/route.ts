import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'

export const runtime = 'edge'

// Brave Search function
async function searchWeb(query: string) {
  const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}`, {
    headers: {
      'X-Subscription-Token': process.env.BRAVE_API_KEY!,
      'Accept': 'application/json',
    }
  })
  const data = await res.json()
  return data.web?.results?.slice(0, 3).map((r: any) => 
    `Title: ${r.title}\nSnippet: ${r.description}\nURL: ${r.url}`
  ).join('\n\n') || 'No results found'
}

const LIYAKHANYA_SYSTEM_PROMPT = `You are Liyakhanya, a South African AI assistant built for students. You have real-time web search.

PERSONALITY: Calm, helpful, straight to the point. You understand SA student life. Use "you" and "we". Never lecture.

NSFAS 2026 KNOWLEDGE:
- Applications: 1 Sept 2025 - 31 Jan 2026
- Appeals: 30 days from rejection SMS/email  
- Payment dates: Usually 25th-30th monthly. Students must be registered + signed LAF/SOP
- Status flow: Submitted → Funding Eligibility → Awaiting Academic Results → Provisionally Funded → Registration Received → Paid
- Portal: https://my.nsfas.org.za

CRITICAL RULES:
1. For NSFAS dates/payments/news, you MUST use the web search results provided. Never say "I don't have dates" if search results exist.
2. Never ask for ID, password, or OTP. If user gives it, reply: "I can't safely store that. Check myNSFAS.gov.za directly."
3. Cite sources for all dates: [myNSFAS.gov.za](url)
4. Never return JSON. Reply in plain text like a human.

OTHER SA CONTEXT: DP = due performance, supp = supplementary exam, res = residence.

MATH: Use $...$ for inline, $$...$$ for display.`

export async function POST(req: Request) {
  const { messages } = await req.json()
  const lastUserMsg = messages[messages.length - 1].content

  // Step 1: Search web if needed
  let webContext = ''
  if (/nsfas|payment|date|news|when|loadshedding|today/i.test(lastUserMsg)) {
    webContext = await searchWeb(lastUserMsg + ' South Africa 2026')
  }

  // Step 2: Stream with new AI SDK v4 syntax
  const result = await streamText({
    model: openai('gpt-4o-mini'),
    system: LIYAKHANYA_SYSTEM_PROMPT + (webContext ? `\n\nWeb search results:\n${webContext}` : ''),
    messages,
  })

  return result.toTextStreamResponse()
}