'use client'

import { useState } from 'react'

declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

export default function VoiceChat() {
  const [input, setInput] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [pdfText, setPdfText] = useState('')
  const [pdfName, setPdfName] = useState('')

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const res = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (data.success) {
        setPdfText(data.text)
        setPdfName(data.filename)
        setResponse(`✅ Loaded: ${data.filename} - ${data.pages} pages`)
      }
    } catch (err) {
      setResponse('❌ Failed to read PDF')
    }
    setLoading(false)
  }

  const handleAsk = async () => {
    if (!input.trim()) return
    setLoading(true)
    
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: input,
        pdfContext: pdfText 
      }),
    })
    const data = await res.json()
    setResponse(data.response)
    setLoading(false)
  }

  const handleSpeak = () => {
    if (!response) return
    const utterance = new SpeechSynthesisUtterance(response)
    utterance.rate = 1.1
    speechSynthesis.speak(utterance)
  }

  const handleTalk = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Speech recognition not supported in this browser')
      return
    }
    
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-ZA'
    recognition.onstart = () => setListening(true)
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInput(transcript)
    }
    recognition.onend = () => setListening(false)
    recognition.start()
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-1">Liyakhanya AI</h1>
      <p className="text-sm text-gray-600 mb-4">Your AI Study Partner</p>
      
      <div className="mb-3">
        <input
          type="file"
          accept=".pdf"
          onChange={handlePdfUpload}
          className="hidden"
          id="pdf-upload"
        />
        <label htmlFor="pdf-upload" className="px-3 py-1 bg-green-600 text-white rounded cursor-pointer text-sm">
          📄 Upload PDF
        </label>
        {pdfName && <span className="ml-2 text-xs">✅ Loaded: {pdfName}</span>}
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={handleTalk}
          className={`px-4 py-2 rounded ${listening? 'bg-red-600' : 'bg-blue-600'} text-white`}
        >
          🎤 Talk
        </button>
        <button
          onClick={handleSpeak}
          className="px-4 py-2 bg-purple-600 text-white rounded"
          disabled={!response}
        >
          🔊 Speak
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
          placeholder="Ask about IA..."
          className="flex-1 px-3 py-2 border rounded"
        />
        <button
          onClick={handleAsk}
          disabled={loading}
          className="px-4 py-2 bg-gray-800 text-white rounded"
        >
          {loading? '...' : 'Ask'}
        </button>
      </div>

      {response && (
        <div className="p-4 bg-gray-100 rounded whitespace-pre-wrap">
          {response}
        </div>
      )}
    </div>
  )
}