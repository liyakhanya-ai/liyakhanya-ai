'use client'
import { useState } from 'react'
import VoiceChat from '../components/VoiceChat'

export default function Home() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastAiMessage, setLastAiMessage] = useState('')

  const askLiyakhanya = async () => {
    if (!question) return
    setLoading(true)
    setAnswer('')
    
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      })
      
      const data = await res.json()
      setAnswer(data.answer)
      setLastAiMessage(data.answer)
      setQuestion('')
    } catch (err) {
      setAnswer('Error: Could not reach Liyakhanya')
      setLastAiMessage('Error: Could not reach Liyakhanya')
    }
    
    setLoading(false)
  }

  return (
    <main style={{ padding: 40, maxWidth: 600, margin: '0 auto' }}>
      <h1>Liyakhanya AI</h1>
      <p>Your AI Study Partner</p>
      
      <VoiceChat 
        onTranscript={(text: string) => setQuestion(text)}
        lastMessage={lastAiMessage}
      />
      
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask about IA..."
        style={{ 
          padding: 8, 
          width: '100%', 
          marginBottom: 8,
          border: '1px solid #ccc',
          borderRadius: '4px'
        }}
        onKeyDown={(e) => e.key === 'Enter' && askLiyakhanya()}
      />
      
      <button 
        onClick={askLiyakhanya} 
        disabled={loading ||!question}
        style={{ 
          padding: '8px 16px', 
          background: loading ||!question? '#9ca3af' : '#000', 
          color: 'white', 
          border: 'none',
          borderRadius: '8px',
          cursor: loading ||!question? 'not-allowed' : 'pointer'
        }}
      >
        {loading? 'Thinking...' : 'Ask'}
      </button>
      
      {answer && (
        <div style={{ 
          marginTop: 20, 
          padding: 16, 
          background: '#f3f4f6', 
          borderRadius: 8,
          whiteSpace: 'pre-wrap'
        }}>
          {answer}
        </div>
      )}
    </main>
  )
}