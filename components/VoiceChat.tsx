'use client'
import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import mermaid from 'mermaid'
import jsPDF from 'jspdf'

mermaid.initialize({ startOnLoad: false, theme: 'default' })

type Message = {
  role: 'user' | 'assistant'
  content: string
  image?: string
  generatedImage?: string
}

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content: 'Hi, I am **Liya** ⚡\n\n**Let’s Solve Your Problem Together**\n\nI can answer anything, draw tables, plot graphs, write code, generate images, and export to PDF. What do you need?'
}

export default function VoiceChat() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pdfText, setPdfText] = useState('')
  const [pdfName, setPdfName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  // Load saved chat on mount
  useEffect(() => {
    const saved = localStorage.getItem('liyakhanya-chat')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.length > 0) setMessages(parsed)
      } catch {}
    }
  }, [])

  // Save chat whenever messages change
  useEffect(() => {
    if (messages.length > 1) {
      localStorage.setItem('liyakhanya-chat', JSON.stringify(messages))
    }
    mermaid.contentLoaded()
  }, [messages])

  const startNewChat = () => {
    if (confirm('Start a new chat? Current chat will be cleared.')) {
      setMessages([INITIAL_MESSAGE])
      setPdfText('')
      setPdfName('')
      localStorage.removeItem('liyakhanya-chat')
    }
  }

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 20 * 1024 * 1024) {
      alert('❌ PDF too large. Max 20MB')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/pdf', { method: 'POST', body: formData })
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
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

    if (file.size > 10 * 1024) {
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
      await sendMessage(input || 'Analyze this image', base64)
      if (imageInputRef.current) imageInputRef.current.value = ''
    }
    reader.readAsDataURL(file)
  }

  const generateImage = async (prompt: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Generated image: "${prompt}"`,
        generatedImage: data.url
      }])
    } catch (err: any) {
      alert(`❌ Image failed: ${err.message}`)
    }
    setLoading(false)
  }

  const exportToPDF = () => {
    const doc = new jsPDF()
    let y = 20

    doc.setFontSize(16)
    doc.text('Liyakhanya AI Chat Export', 20, y)
    y += 15

    messages.forEach((msg) => {
      if (y > 270) {
        doc.addPage()
        y = 20
      }

      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text(msg.role === 'user'? 'You:' : 'Liya:', 20, y)
      y += 7

      doc.setFont('helvetica', 'normal')
      const lines = doc.splitTextToSize(msg.content.replace(/[#*`_]/g, ''), 170)
      lines.forEach((line: string) => {
        if (y > 280) {
          doc.addPage()
          y = 20
        }
        doc.text(line, 20, y)
        y += 7
      })
      y += 5
    })

    doc.save('liyakhanya-chat.pdf')
  }

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel()
      const cleanText = text.replace(/```[\s\S]*?```/g, ' code block ')
   .replace(/\$.*?\$|\\\[.*?\\\]/g, '')
   .replace(/\|.*\|/g, ' table ')
   .replace(/[#*`_]/g, '')
      const utterance = new SpeechSynthesisUtterance(cleanText)
      utterance.lang = 'en-ZA'
      speechSynthesis.speak(utterance)
    }
  }

  const sendMessage = async (text: string, imageBase64?: string) => {
    if (!text.trim() &&!imageBase64 || loading) return

    if (text.toLowerCase().startsWith('generate image:') || text.toLowerCase().startsWith('draw:') || text.toLowerCase().startsWith('create image:')) {
      const prompt = text.replace(/generate image:|draw:|create image:/i, '').trim()
      const userMsg: Message = { role: 'user', content: text }
      setMessages(prev => [...prev, userMsg])
      setInput('')
      await generateImage(prompt)
      return
    }

    const shouldSpeak = text.toLowerCase().includes('read it') || text.toLowerCase().includes('speak')

    if (!imageBase64) {
      const userMsg: Message = { role: 'user', content: text }
      setMessages(prev => [...prev, userMsg])
    }
    setInput('')
    setLoading(true)
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      // Send last 10 messages for context
      const history = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          pdfContext: pdfText,
          image: imageBase64,
          history: history
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

      if (shouldSpeak) speakText(aiResponse)

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
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4 font-sans bg-white">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-gray-900">Liyakhanya AI ⚡</h1>
        <div className="flex gap-2">
          <button onClick={startNewChat} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm">
            🆕 New Chat
          </button>
          <button onClick={exportToPDF} className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm">
            📄 Export PDF
          </button>
        </div>
      </div>

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
          <div key={i} className={`p-4 rounded-xl leading-relaxed ${msg.role === 'user'? 'bg-blue-600 text-white ml-auto max-w-[85%]' : 'bg-white border border-gray-300 mr-auto max-w-[85%] shadow-md text-gray-900'}`}>
            {msg.image && <img src={msg.image} alt="uploaded" className="mb-3 rounded-lg max-w-full" />}
            {msg.generatedImage && <img src={msg.generatedImage} alt="generated" className="mb-3 rounded-lg max-w-full" />}
            <div className={`prose prose-sm max-w-none text-gray-900 ${msg.role === 'user'? 'prose-invert text-white' : 'prose-gray'}`}>
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  code({node, className, children,...props}) {
                    const match = /language-mermaid/.exec(className || '')
                    if (match) {
                      return <div className="mermaid">{String(children).replace(/\n$/, '')}</div>
                    }
                    return <code className={className} {...props}>{children}</code>
                  },
                  table({children}) {
                    return <div className="overflow-x-auto"><table className="min-w-full border border-gray-300">{children}</table></div>
                  },
                  th({children}) {
                    return <th className="border border-gray-300 px-3 py-2 bg-gray-100 text-left font-semibold">{children}</th>
                  },
                  td({children}) {
                    return <td className="border border-gray-300 px-3 py-2">{children}</td>
                  }
                }}
              >
                {msg.content || '...'}
              </ReactMarkdown>
            </div>
            {msg.role === 'assistant' && msg.content && (
              <button onClick={() => speakText(msg.content)} className="mt-2 text-xs text-gray-500 hover:text-blue-600">🔊 Read it</button>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
          placeholder="Ask anything, or say 'generate image: a robot'"
          className="flex-1 border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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