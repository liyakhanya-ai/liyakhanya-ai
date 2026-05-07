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

    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Use pdfjs-dist instead of pdf-parse
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const loadingTask = pdfjs.getDocument({ data: buffer })
    const pdf = await loadingTask.promise
    
    let fullText = ''
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items.map((item: any) => item.str).join(' ')
      fullText += pageText + '\n'
    }
    
    return new Response(JSON.stringify({ text: fullText }), {
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