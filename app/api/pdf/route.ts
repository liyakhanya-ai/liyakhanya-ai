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

    const buffer = Buffer.from(await file.arrayBuffer())

    // Handle PDFs
    if (file.type === 'application/pdf') {
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
      pdfjs.GlobalWorkerOptions.workerSrc = '' // disable worker for Vercel

      const loadingTask = pdfjs.getDocument({
        data: buffer,
        useSystemFonts: true,
        disableFontFace: true
      })
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
    }

    // For images, just return a message. OCR would need tesseract.js
    if (file.type.startsWith('image/')) {
      return new Response(JSON.stringify({
        text: 'Image uploaded. OCR not enabled yet. Upload a PDF for text extraction.'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Unsupported file type' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('File processing error:', error)
    return new Response(JSON.stringify({
      error: 'Failed to process file',
      detail: error instanceof Error? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}