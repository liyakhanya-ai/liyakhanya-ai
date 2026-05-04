'use client'
import { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

type Message = {
  role: 'user' | 'assistant'
  content: string
  image?: string
}

export default function VoiceChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hi, I am **Liya the VarsityFriendly-AI** ⚡\n\nUpload a PDF or photo of your textbook and ask me anything about Electrical Technology, Math, or Physical Sciences.'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pdfText, setPdfText] = useState('')
  const [pdfName, setPdfName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 4 * 1024) {
      alert('❌ PDF too large. Max 4MB. Compress at ilovepdf.com/compress_pdf')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/pdf', { method: 'POST', body: formData })
      if (!res.ok) {
        const errorText = await res.text()
        if (errorText.includes('Request Entity Too Large') || res.status === 413) {
          throw new Error('PDF too large. Max 4MB')
        }
        throw new Error(`Upload failed: ${res.status}`)
      }

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setPdfText(data.text)
      setPdfName(file.name)
      alert(`✅ Loaded: ${file.name} - ${data.pages} pages`)
    } catch (err: any) {
      alert(`❌ ${err.message}`)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
    setLoading(false)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      alert('❌ Image too large. Max 10MB')
      if (imageInputRef.current) imageInputRef.current.value = ''
      return
    }

    setLoading(true)
    const reader = new FileReader()
    reader.onloadend = async () => {
      const base64 = reader.result as string
      const userMsg: Message = {
        role: 'user',
        content: input || 'Explain this image',
        image: base64
      }
      setMessages(prev => [...prev, userMsg])
      setInput('')
      await sendMessage(input || 'Explain this image and any formulas shown', base64)
      if (imageInputRef.current) imageInputRef.current.value = ''
    }
    reader.readAsDataURL(file)
  }

  const sendMessage = async (text: string, imageBase64?: string) => {
    if (!text.trim() &&!imageBase64 || loading) return

    if (!imageBase64) {
      const userMsg: Message = { role: 'user', content: text }
      setMessages(prev => [...prev, userMsg])
    }
    setInput('')
    setLoading(true)
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          pdfContext: pdfText,
          image: imageBase64
        })
      })

      if (!res.ok) throw new Error('Chat request failed')

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let aiResponse = ''

      while (true) {
        const { done, value } = await reader!.read()
        if (done) break
        const chunk = decoder.decode(value)
        aiResponse += chunk

        setMessages((prev: Message[]) => {
          const newMessages = [...prev]
          newMessages[newMessages.length - 1] = {
            role: 'assistant',
            content: aiResponse
          }
          return newMessages
        })
      }

      if ('speechSynthesis' in window && aiResponse) {
        speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(aiResponse.replace(/\$.*?\$|\\\[.*?\\\]/g, ''))
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

  const toggleListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Voice input not supported. Use Chrome.')
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
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4 font-sans">
      <h1 className="text-3xl font-bold mb-4 text-center">Liyakhanya AI ⚡</h1>

      <div className="mb-4 p-4 bg-gray-50 rounded-lg flex gap-2 flex-wrap">
        <input type="file" accept=".pdf" ref={fileInputRef} onChange={handlePdfUpload} className="hidden" />
        <input type="file" accept="image/*" ref={imageInputRef} onChange={handleImageUpload} className="hidden" />

        <button onClick={() => fileInputRef.current?.click()} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm disabled:bg-gray-400 transition">
          {pdfName? `📄 ${pdfName.slice(0,20)}...` : 'Upload PDF'}
        </button>

        <button onClick={() => imageInputRef.current?.click()} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm disabled:bg-gray-400 transition">
          📸 Photo
        </button>

        {pdfName && (
          <button onClick={() => { setPdfText(''); setPdfName(''); }} className="text-red-600 text-sm hover:underline">
            Clear PDF
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2">
        {messages.map((msg, i) => (
          <div key={i} className={`p-4 rounded-xl leading-relaxed ${msg.role === 'user'? 'bg-blue-600 text-white ml-auto max-w-[80%]' : 'bg-white border border-gray-200 mr-auto max-w-[80%] shadow-sm'}`}>
            {msg.image && <img src={msg.image} alt="uploaded" className="mb-3 rounded-lg max-w-full" />}
            <div className={`prose prose-sm max-w-none ${msg.role === 'user'? 'prose-invert' : ''}`}>
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                {msg.content || '...'}
              </ReactMarkdown>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
          placeholder="Hi, I am Liya the VarsityFriendly-AI"
          className="flex-1 border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <button onClick={() => sendMessage(input)} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg disabled:bg-gray-400 transition">Send</button>
        <button onClick={toggleListening} disabled={loading} className={`${isListening? 'bg-red-500' : 'bg-purple-600 hover:bg-purple-700'} text-white px-5 py-3 rounded-lg disabled:bg-gray-400 transition`}>
          {isListening? '🛑' : '🎤'}
        </button>
      </div>
    </div>
  )
}