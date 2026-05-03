'use client'
import { useState } from 'react'

export default function Home() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)

  async function askQuestion() {
    setLoading(true)
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    })
    const data = await res.json()
    setAnswer(data.answer)
    setLoading(false)
  }

  return (
    <main style={{padding: 40}}>
      <h1>Liyakhanya AI</h1>
      <input 
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask about 1A..."
        style={{padding: 8, width: 300}}
      />
      <button onClick={askQuestion} style={{marginLeft: 8, padding: 8}}>
        {loading ? 'Thinking...' : 'Send'}
      </button>
      <p>{answer}</p>
    </main>
  )
}