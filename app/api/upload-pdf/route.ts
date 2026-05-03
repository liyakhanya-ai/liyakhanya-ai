import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const data = await req.formData()
    const file: File | null = data.get('file') as unknown as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Fixed: Cast to any to bypass broken pdf-parse types
    const pdfParseModule = await import('pdf-parse')
    const pdfData = await (pdfParseModule as any).default(buffer)
    const text = pdfData.text

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