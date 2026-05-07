export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (file.size > 20 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'File too large. Max 20MB.' }), { 
        status: 413,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Use require() for pdf-parse - avoids ESM issues with TS
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdf = require('pdf-parse')
    
    const buffer = Buffer.from(await file.arrayBuffer())
    const data = await pdf(buffer)
    
    return new Response(JSON.stringify({ text: data.text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    console.error('PDF parsing error:', error)
    return new Response(JSON.stringify({ error: 'Failed to parse PDF' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}