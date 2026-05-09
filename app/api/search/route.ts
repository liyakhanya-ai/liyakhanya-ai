export const runtime = 'edge'

export async function POST(req: Request) {
  try {
    const { query } = await req.json()

    if (!query) {
      return Response.json({ error: 'No query provided' }, { status: 400 })
    }

    if (!process.env.BRAVE_API_KEY) {
      return Response.json({ error: 'BRAVE_API_KEY not configured' }, { status: 500 })
    }

    const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': process.env.BRAVE_API_KEY
      }
    })

    if (!res.ok) {
      throw new Error(`Brave API error: ${res.status}`)
    }

    const data = await res.json()
    const results = data.web?.results?.slice(0, 3).map((r: any) => ({
      title: r.title,
      snippet: r.description,
      url: r.url
    })) || []

    return Response.json({ results })

  } catch (error) {
    console.error('Search error:', error)
    return Response.json({
      error: 'Search failed',
      detail: error instanceof Error? error.message : String(error)
    }, { status: 500 })
  }
}