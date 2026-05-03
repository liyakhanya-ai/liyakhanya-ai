'use client'
import { useState } from 'react'

export default function VoiceChat({ 
  onTranscript, 
  lastMessage 
}: { 
  onTranscript: (text: string) => void
  lastMessage: string 
}) {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Use Chrome for voice. Safari not supported.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-ZA'
    recognition.interimResults = false
    
    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      onTranscript(transcript)
    }
    
    recognition.start()
  }

  const speak = (text: string) => {
    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      return
    }
    
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-ZA'
    utterance.rate = 2
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }

  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
      <button
        onClick={startListening}
        disabled={isListening}
        style={{
          padding: '8px 16px',
          borderRadius: '8px',
          fontWeight: '500',
          background: isListening? '#ef4444' : '#2563eb',
          color: 'white',
          border: 'none',
          cursor: 'pointer'
        }}
      >
        {isListening? '🎤 Listening...' : '🎤 Talk'}
      </button>
      
      <button
        onClick={() => speak(lastMessage)}
        disabled={!lastMessage}
        style={{
          padding: '8px 16px',
          borderRadius: '8px',
          fontWeight: '500',
          background:!lastMessage? '#9ca3af' : '#16a34a',
          color: 'white',
          border: 'none',
          cursor:!lastMessage? 'not-allowed' : 'pointer'
        }}
      >
        {isSpeaking? '⏹️ Stop' : '🔊 Speak'}
      </button>
    </div>
  )
}