import { NextRequest } from 'next/server'
// @ts-ignore - pdf-parse has no types
import pdf from 'pdf-parse/lib/pdf-parse.js'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return Response.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const data = await pdf(buffer)

    return Response.json({
      text: data.text,
      pages: data.numpages,
    })
  } catch (error: any) {
    console.error('PDF Error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}