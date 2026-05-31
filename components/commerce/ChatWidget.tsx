'use client'

import { useState } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return
    const next = [...messages, { role: 'user' as const, content: text }]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      if (res.status === 429) {
        const body = (await res.json()) as { retryAfter: number }
        setMessages([
          ...next,
          { role: 'assistant', content: `Rate limited. Try again in ${body.retryAfter}s.` },
        ])
        return
      }
      const body = (await res.json()) as { text?: string; error?: string }
      setMessages([...next, { role: 'assistant', content: body.text || `Error: ${body.error}` }])
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 rounded-full bg-gray-900 text-white px-4 py-3 text-sm shadow-lg z-40"
        aria-label="Open assistant chat"
      >
        Chat
      </button>
    )
  }

  return (
    <section
      aria-label="Catalog assistant"
      className="fixed bottom-4 right-4 z-40 w-80 sm:w-96 h-[28rem] bg-white border border-gray-200 rounded-xl shadow-xl flex flex-col"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <h2 className="text-sm font-medium">Assistant</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-gray-500 hover:text-gray-900"
          aria-label="Close chat"
        >
          ×
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
        {messages.length === 0 && (
          <p className="text-xs text-gray-500">
            Ask about products, compatibility, or SKUs. Example: "Battery for iPhone 14 Pro?"
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={`${m.role}-${i}`}
            className={
              m.role === 'user'
                ? 'ml-auto max-w-[80%] rounded-lg bg-gray-900 text-white px-3 py-2'
                : 'mr-auto max-w-[85%] rounded-lg bg-gray-100 px-3 py-2 whitespace-pre-wrap'
            }
          >
            {m.content}
          </div>
        ))}
        {loading && <p className="text-xs text-gray-500">…</p>}
      </div>
      <form onSubmit={send} className="border-t border-gray-100 p-2 flex gap-2">
        <label htmlFor="chat-input" className="sr-only">
          Message
        </label>
        <input
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a question…"
          className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-gray-900 text-white px-3 py-1.5 text-sm disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </section>
  )
}
