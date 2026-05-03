import { NextRequest, NextResponse } from 'next/server'
import * as pdfParse from 'pdf-parse'

export async function POST(req: NextRequest) {
  try {
    const data = await req.formData()
    const file: File | null = data.get('file') as unknown as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    const pdfData = await pdfParse.default(buffer)
    const text = pdfData.text

    // Limit to 8000 chars for OpenAI context
    const trimmedText = text.slice(0, 8000)

    return NextResponse.json({ 
      success: true, 
      text: trimmedText,
      pages: pdfData.numpages,
      filename: file.name
    })
  } catch (error) {
    console.error('PDF parse error:', error)
    return NextResponse.json({ error: 'Failed to parse PDF' }, { status: 500 })
  }
}