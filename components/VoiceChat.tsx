'use client'
import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import mermaid from 'mermaid'
import jsPDF from 'jspdf'
import {
  FileUp, Image as ImageIcon, Mic, Square, Send, FileDown,
  PlusCircle, Trash2, Volume2, Zap, Camera, X, Phone
} from 'lucide-react'

mermaid.initialize({ startOnLoad: false, theme: 'default' })

type Message = {
  role: 'user' | 'assistant'
  content: string
  image?: string
  generatedImage?: string
  audio?: string
}

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content: 'Hi, I am **Liya** ⚡\n\n**Let’s Solve Your Problem Together**\n\nI can now talk! Click the phone button for voice chat, or type/upload anything.'
}

// Compress image to under 1MB
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        const maxSize = 1920
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize
            width = maxSize
          } else {
            width = (width / height) * maxSize
            height = maxSize
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function VoiceChat() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pdfText, setPdfText] = useState('')
  const [pdfName, setPdfName] = useState('')
  const [showCamera, setShowCamera] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [isRecording, setIsRecording] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('liyakhanya-chat')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.length > 0) setMessages(parsed)
      } catch {}
    }
  }, [])

  useEffect(() => {
    if (messages.length > 1) {
      localStorage.setItem('liyakhanya-chat', JSON.stringify(messages))
    }
    mermaid.contentLoaded()
  }, [messages])

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop())
    }
  }, [stream])

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      setStream(mediaStream)
      setShowCamera(true)
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = mediaStream
      }, 100)
    } catch (err) {
      alert('❌ Camera access denied. Check browser permissions.')
    }
  }

  const stopCamera = () => {
    if (stream) stream.getTracks().forEach(track => track.stop())
    setStream(null)
    setShowCamera(false)
  }

  const capturePhoto = async () => {
    if (!videoRef.current ||!canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx?.drawImage(video, 0, 0)
    const base64 = canvas.toDataURL('image/jpeg', 0.8)
    stopCamera()

    const userMsg: Message = { role: 'user', content: input || 'What is in this photo?', image: base64 }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    await sendMessage(input || 'Analyze this photo', base64)
  }

  const startVoiceChat = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setIsVoiceMode(true)
      setIsRecording(true)

      const mediaRecorder = new MediaRecorder(mediaStream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mediaRecorder
      const audioChunks: Blob[] = []

      mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data)

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
        await handleVoiceMessage(audioBlob)
        mediaStream.getTracks().forEach(track => track.stop())
        setIsRecording(false)
        setIsVoiceMode(false)
      }

      mediaRecorder.start()

      // Auto-stop after 10 seconds
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') mediaRecorder.stop()
      }, 10000)

    } catch (err) {
      alert('❌ Microphone access denied')
      setIsVoiceMode(false)
    }
  }

  const stopVoiceChat = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
    setIsVoiceMode(false)
  }

  const handleVoiceMessage = async (audioBlob: Blob) => {
    setLoading(true)
    setMessages(prev => [...prev, { role: 'user', content: '🎤 Voice message...' }])
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const formData = new FormData()
      formData.append('audio', audioBlob)

      const res = await fetch('/api/voice', { method: 'POST', body: formData })
      const data = await res.json()

      if (data.error) throw new Error(data.error)

      // Update messages
      setMessages(prev => {
        const newMessages = [...prev]
        newMessages[newMessages.length - 2] = { role: 'user', content: data.text }
        newMessages[newMessages.length - 1] = { role: 'assistant', content: data.text, audio: data.audio }
        return newMessages
      })

      // Play Liya's voice response
      if (audioRef.current && data.audio) {
        audioRef.current.src = data.audio
        audioRef.current.play()
      }

    } catch (err: any) {
      setMessages(prev => {
        const newMessages = [...prev]
        newMessages[newMessages.length - 1] = { role: 'assistant', content: `❌ ${err.message}` }
        return newMessages
      })
    }
    setLoading(false)
  }

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

    if (file.size > 4.5 * 1024 * 1024) {
      alert('❌ PDF too large for Vercel Free. Max 4.5MB. Compress at ilovepdf.com')
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
      alert(`✅ Loaded: ${file.name} - ${data.pages} pages. Now ask me about it.`)
    } catch (err: any) {
      alert(`❌ ${err.message}`)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
    setLoading(false)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    try {
      const base64 = await compressImage(file)
      const userMsg: Message = { role: 'user', content: input || 'Explain this image', image: base64 }
      setMessages(prev => [...prev, userMsg])
      setInput('')
      await sendMessage(input || 'Analyze this image', base64)
      if (imageInputRef.current) imageInputRef.current.value = ''
    } catch (err: any) {
      alert(`❌ Image failed: ${err.message}`)
    }
    setLoading(false)
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
      if (y > 270) { doc.addPage(); y = 20 }
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text(msg.role === 'user'? 'You:' : 'Liya:', 20, y)
      y += 7
      doc.setFont('helvetica', 'normal')
      const lines = doc.splitTextToSize(msg.content.replace(/[#*`_]/g, ''), 170)
      lines.forEach((line: string) => {
        if (y > 280) { doc.addPage(); y = 20 }
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
      const cleanText = text.replace(/```[\s\S]*?```/g, ' code block ').replace(/\$.*?\$|\\\[.*?\\\]/g, '').replace(/\|.*\|/g, ' table ').replace(/[#*`_]/g, '')
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
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, pdfContext: pdfText, image: imageBase64, history })
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
          newMessages[newMessages.length - 1] = { role: 'assistant', content: aiResponse }
          return newMessages
        })
      }

      if (shouldSpeak) speakText(aiResponse)

    } catch (err) {
      setMessages(prev => {
        const newMessages = [...prev]
        newMessages[newMessages.length - 1] = { role: 'assistant', content: '❌ Error: Could not get response' }
        return newMessages
      })
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4 font-sans bg-white">
      {showCamera && (
        <div className="fixed inset-0 bg-black z-50 flex-col">
          <div className="flex justify-between items-center p-4 bg-gray-900">
            <h2 className="text-white font-bold">Take Photo</h2>
            <button onClick={stopCamera} className="text-white"><X size={24} /></button>
          </div>
          <video ref={videoRef} autoPlay playsInline className="flex-1 object-cover" />
          <canvas ref={canvasRef} className="hidden" />
          <div className="p-6 bg-gray-900 flex justify-center">
            <button onClick={capturePhoto} className="w-16 h-16 rounded-full bg-white border-4 border-gray-400 active:scale-95 transition" />
          </div>
        </div>
      )}

      <audio ref={audioRef} className="hidden" />

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Zap className="text-yellow-500" size={32} />
          Liyakhanya AI
        </h1>
        <div className="flex gap-2">
          <button onClick={startNewChat} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition">
            <PlusCircle size={16} /> New Chat
          </button>
          <button onClick={exportToPDF} className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition">
            <FileDown size={16} /> Export PDF
          </button>
        </div>
      </div>

      <div className="mb-4 p-4 bg-gray-50 rounded-lg flex gap-2 flex-wrap">
        <input type="file" accept=".pdf" ref={fileInputRef} onChange={handlePdfUpload} className="hidden" />
        <input type="file" accept="image/*" ref={imageInputRef} onChange={handleImageUpload} className="hidden" />

        <button onClick={() => fileInputRef.current?.click()} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm disabled:bg-gray-400 transition flex items-center gap-2">
          <FileUp size={16} />{pdfName? `📄 ${pdfName.slice(0,15)}...` : 'Upload PDF'}
        </button>

        <button onClick={startCamera} disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm disabled:bg-gray-400 transition flex items-center gap-2">
          <Camera size={16} /> Camera
        </button>

        <button onClick={() => imageInputRef.current?.click()} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm disabled:bg-gray-400 transition flex items-center gap-2">
          <ImageIcon size={16} /> Gallery
        </button>

        {pdfName && (
          <button onClick={() => { setPdfText(''); setPdfName(''); }} className="text-red-600 text-sm hover:underline flex items-center gap-1">
            <Trash2 size={14} /> Clear PDF
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2">
        {messages.map((msg, i) => (
          <div key={i} className={`p-4 rounded-xl leading-relaxed ${msg.role === 'user'? 'bg-blue-600 text-white ml-auto max-w-[85%]' : 'bg-white border border-gray-300 mr-auto max-w-[85%] shadow-md text-gray-900'}`}>
            {msg.image && <img src={msg.image} alt="uploaded" className="mb-3 rounded-lg max-w-full" />}
            {msg.generatedImage && <img src={msg.generatedImage} alt="generated" className="mb-3 rounded-lg max-w-full" />}
            {msg.audio && <audio src={msg.audio} controls className="mb-2 w-full" />}
            <div className={`prose prose-sm max-w-none text-gray-900 ${msg.role === 'user'? 'prose-invert text-white' : 'prose-gray'}`}>
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                {msg.content || '...'}
              </ReactMarkdown>
            </div>
            {msg.role === 'assistant' && msg.content &&!msg.audio && (
              <button onClick={() => speakText(msg.content)} className="mt-2 text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1">
                <Volume2 size={14} /> Read it
              </button>
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
          placeholder="Ask anything, take photo, or click phone for voice chat"
          className="flex-1 border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          disabled={loading}
        />
        <button onClick={() => sendMessage(input)} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg disabled:bg-gray-400 transition flex items-center gap-2">
          <Send size={18} />
        </button>
        <button
          onClick={isVoiceMode? stopVoiceChat : startVoiceChat}
          disabled={loading &&!isVoiceMode}
          className={`${isRecording? 'bg-red-500 animate-pulse' : 'bg-pink-600 hover:bg-pink-700'} text-white px-5 py-3 rounded-lg disabled:bg-gray-400 transition flex items-center gap-2`}
        >
          <Phone size={18} />
        </button>
      </div>
    </div>
  )
}