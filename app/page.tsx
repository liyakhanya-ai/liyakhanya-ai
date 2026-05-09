'use client'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    
    const userMessage: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      })

      const data = await res.json()
      // Fixes the brackets - only use data.reply
      const assistantMessage: Message = { role: 'assistant', content: data.reply }
      setMessages(prev => [...prev, assistantMessage])
      
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Error: Failed to get response' 
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4 bg-white">
      <h1 className="text-2xl font-bold mb-4 text-center">Liyakhanya AI</h1>
      
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 border rounded-lg p-4">
        {messages.length === 0 && (
          <p className="text-gray-400 text-center mt-8">Ask me anything. Try: "what time is it in Cape Town" or "calculate line impedance"</p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-4 rounded-lg ${
              msg.role === 'user' 
              ? 'bg-blue-600 text-white ml-auto max-w-[85%]' 
                : 'bg-gray-100 text-gray-900 mr-auto max-w-[85%]'
            }`}
          >
            {msg.role === 'assistant'? (
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                className="prose prose-sm max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-p:my-2 prose-strong:text-gray-900"
              >
                {msg.content}
              </ReactMarkdown>
            ) : (
              <p>{msg.content}</p>
            )}
          </div>
        ))}
        {loading && (
          <div className="bg-gray-100 p-4 rounded-lg mr-auto max-w-[85%]">
            <p className="text-gray-500">Liyakhanya is thinking...</p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' &&!e.shiftKey && sendMessage()}
          placeholder="Ask anything..."
          disabled={loading}
          className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          Send
        </button>
      </div>
    </div>
  )
}