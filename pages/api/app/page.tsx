'use client'
import { useState } from 'react'
import VoiceChat from '../components/VoiceChat'

export default function Page() {
  const [input, setInput] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [pdfContext, setPdfContext] = useState('')
  const [pdfName, setPdfName] = useState('')
  const [uploading, setUploading] = useState(false)

  const askLiyakhanya = async () => {
    setLoading(true)
    setResponse('')
    
    const fullPrompt = pdfContext 
      ? `Context from uploaded PDF "${pdfName}":\n${pdfContext}\n\nQuestion: ${input}`
      : input

    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: fullPrompt })
    })
    const data = await res.json()
    setResponse(data.reply || 'Sorry, I could not answer that.')
    setLoading(false)
  }

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch('/api/upload-pdf', {
      method: 'POST',
      body: formData
    })
    const data = await res.json()
    
    if (data.success) {
      setPdfContext(data.text)
      setPdfName(data.filename)
      alert(`✅ Loaded ${data.filename} - ${data.pages} pages`)
    } else {
      alert('❌ Failed to read PDF')
    }
    setUploading(false)
    e.target.value = '' // Reset input
  }

  return (
    <main style={{ maxWidth: '600px', margin: '40px auto', padding: '20px', fontFamily: 'Arial' }}>
      <h1>🇿🇦 Liyakhanya AI</h1>
      <p>Electrical Technology tutor for SA learners</p>
      
      <div style={{ marginBottom: '15px', padding: '10px', border: '1px dashed #ccc', borderRadius: '8px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          📚 Upload Textbook/Notes:
        </label>
        <input 
          type="file" 
          accept=".pdf" 
          onChange={handlePdfUpload}
          disabled={uploading}
        />
        {uploading && <p>Reading PDF...</p>}
        {pdfName && <p style={{ color: 'green', fontSize: '14px' }}>✅ Loaded: {pdfName}</p>}
      </div>

      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Ask about Electrical Technology..."
        style={{ width: '100%', padding: '12px', fontSize: '16px', marginBottom: '10px' }}
      />
      
      <button 
        onClick={askLiyakhanya} 
        disabled={loading}
        style={{ padding: '12px 24px', fontSize: '16px', marginRight: '10px' }}
      >
        {loading ? 'Thinking...' : 'Ask'}
      </button>

      <VoiceChat 
        onTranscript={setInput} 
        onSpeakText={response}
      />

      {response && (
        <div style={{ marginTop: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
          <strong>Liyakhanya:</strong>
          <p>{response}</p>
        </div>
      )}
    </main>
  )
}