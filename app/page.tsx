'use client'
import { useState } from 'react'

export default function Chat() {
  const [messages, setMessages] = useState<any[]>([])
  const [showTrackModal, setShowTrackModal] = useState(false)
  const [trackEmail, setTrackEmail] = useState('')
  
  // ... your existing chat logic

  const lastMessage = messages[messages.length - 1]
  const showNSFASButton = lastMessage?.role === 'assistant' && 
    /NSFAS|nsfas|funding|bursary/i.test(lastMessage?.content)

  const handleTrackNSFAS = () => {
    // For now just save email to localStorage
    // Step 3 will hook this to Resend + cron job
    localStorage.setItem('liyakhanya_nsfas_email', trackEmail)
    setShowTrackModal(false)
    alert('Got it! We’ll email you if NSFAS status changes. Check your inbox for confirmation.')
  }

  return (
    <div>
      {/* ... your existing chat UI */}
      
      {showNSFASButton && (
        <div className="mx-auto max-w-3xl px-4 pb-2">
          <button 
            onClick={() => setShowTrackModal(true)}
            className="w-full rounded-lg border border-blue-500 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
          >
            🔔 Track my NSFAS status daily - get email alerts
          </button>
        </div>
      )}

      {showTrackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="text-lg font-semibold">Track NSFAS Status</h3>
            <p className="mt-2 text-sm text-gray-600">
              We’ll check NSFAS daily and email you when your status changes. 
              Your ID is never sent to us — tracking runs on your device.
            </p>
            <input
              type="email"
              placeholder="your email"
              value={trackEmail}
              onChange={(e) => setTrackEmail(e.target.value)}
              className="mt-4 w-full rounded border px-3 py-2"
            />
            <div className="mt-4 flex gap-2">
              <button 
                onClick={handleTrackNSFAS}
                className="flex-1 rounded bg-blue-600 py-2 text-white hover:bg-blue-700"
              >
                Start Tracking
              </button>
              <button 
                onClick={() => setShowTrackModal(false)}
                className="rounded border px-4 py-2 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}