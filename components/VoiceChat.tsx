'use client'
import { useState, useRef } from 'react'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

export default function VoiceChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pdfText, setPdfText] = useState('')
  const [pdfName, setPdfName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  // PDF Upload
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const res = await fetch('/api/pdf', { method: 'POST', body: formData })
      const data = await res.json()
      
      if (data.error) throw new Error(data.error)
      
      setPdfText(data.text)
      setPdfName(file.name)
      alert(`✅ Loaded: ${file.name} - ${data.pages} pages`)
    } catch (err: any) {
      alert(`❌ ${err.message}`)
    }
    setLoading(false)
  }

  // Send message with streaming
  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return
    
    const userMsg: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    // Add empty assistant message for streaming
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: text,
          pdfContext: pdfText 
        })
      })

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let aiResponse = ''

      while (true) {
        const { done, value } = await reader!.read()
        if (done) break
        const chunk = decoder.decode(value)
        aiResponse += chunk
        
        // Update the last message with streamed content
        setMessages((prev: Message[]) => {
          const newMessages = [...prev]
          newMessages[newMessages.length - 1] = { 
            role: 'assistant', 
            content: aiResponse 
          }
          return newMessages
        })
      }

      // TTS - speak the final answer
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(aiResponse)
        utterance.lang = 'en-ZA'
        speechSynthesis.speak(utterance)
      }

    } catch (err) {
      setMessages(prev => {
        const newMessages = [...prev]
        newMessages[newMessages.length - 1] = { 
          role: 'assistant', 
          content: '❌ Error: Could not get response' 
        }
        return newMessages
      })
    }
    setLoading(false)
  }

  // Mic input
  const toggleListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Voice input not supported in this browser')
      return
    }

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    const recognition = new (window as any).webkitSpeechRecognition()
    recognition.lang = 'en-ZA'
    recognition.interimResults = false
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript
      sendMessage(transcript)
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)
    
    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Liyakhanya AI 📚</h1>
      
      {/* PDF Upload */}
      <div className="mb-4 p-3 bg-gray-100 rounded">
        <input 
          type="file" 
          accept=".pdf" 
          ref={fileInputRef}
          onChange={handlePdfUpload}
          className="hidden" 
        />
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
        >
          {pdfName? `📄 ${pdfName}` : 'Upload Textbook PDF'}
        </button>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-3">
        {messages.map((msg, i) => (
          <div 
            key={i} 
            className={`p-3 rounded-lg ${msg.role === 'user' 
             ? 'bg-blue-500 text-white ml-auto max-w-xs' 
              : 'bg-gray-200 mr-auto max-w-xs'}`}
          >
            {msg.content || '...'}
          </div>
        ))}
        {loading && messages[messages.length - 1]?.role === 'user' && (
          <div className="bg-gray-200 mr-auto max-w-xs p-3 rounded-lg">...</div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
          placeholder="Ask about Electrical Technology..."
          className="flex-1 border p-2 rounded"
          disabled={loading}
        />
        <button 
          onClick={() => sendMessage(input)}
          disabled={loading}
          className="bg-green-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
        >
          Send
        </button>
        <button 
          onClick={toggleListening}
          className={`${isListening? 'bg-red-500' : 'bg-purple-500'} text-white px-4 py-2 rounded`}
        >
          {isListening? '🛑' : '🎤'}
        </button>
      </div>
    </div>
  )
}