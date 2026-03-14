"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useSession, signIn, signOut } from "next-auth/react"
import MessageBubble from "./MessageBubble"
import { Message } from "@/types/chat"

type ChatSession = { id: string; title: string; messages: Message[]; createdAt: Date }

function storageKey(uid: string) { return `skychat_v1_${uid}` }
function loadSessions(uid: string): ChatSession[] {
  try {
    const raw = localStorage.getItem(storageKey(uid))
    if (!raw) return []
    return (JSON.parse(raw) as Array<Omit<ChatSession,"createdAt"> & { createdAt: string }>)
      .map(s => ({ ...s, createdAt: new Date(s.createdAt) }))
  } catch { return [] }
}
function persistSessions(uid: string, sessions: ChatSession[]) {
  try { localStorage.setItem(storageKey(uid), JSON.stringify(sessions)) } catch {}
}

interface ISpeechRecognitionResult { readonly transcript: string }
interface ISpeechRecognitionResultList { readonly length: number; [index: number]: ISpeechRecognitionResult[] }
interface ISpeechRecognitionEvent { readonly results: ISpeechRecognitionResultList }
interface ISpeechRecognition {
  lang: string; interimResults: boolean; continuous: boolean
  onresult: ((e: ISpeechRecognitionEvent) => void) | null
  onend: (() => void) | null; onerror: (() => void) | null
  start(): void; stop(): void
}
interface ISpeechRecognitionCtor { new(): ISpeechRecognition }
interface SpeechWindow extends Window { SpeechRecognition?: ISpeechRecognitionCtor; webkitSpeechRecognition?: ISpeechRecognitionCtor }

const SkyLogo = ({ size = 32, gradId = "slg0" }: { size?: number; gradId?: string }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#52ADF5"/>
        <stop offset="100%" stopColor="#1C6CEF"/>
      </linearGradient>
    </defs>
    <rect width="64" height="64" rx="14" fill={`url(#${gradId})`}/>
    <circle cx="32" cy="24" r="11" fill="white"/>
    <circle cx="21.5" cy="28.5" r="8.5" fill="white"/>
    <circle cx="42.5" cy="28" r="9" fill="white"/>
    <circle cx="14" cy="32" r="6" fill="white"/>
    <circle cx="50" cy="32" r="6.5" fill="white"/>
    <rect x="8" y="32" width="48" height="7" fill="white"/>
    <polygon points="22,39 17,46 30,39" fill="white"/>
    <circle cx="24" cy="36" r="2.4" fill={`url(#${gradId})`}/>
    <circle cx="32" cy="36" r="2.4" fill={`url(#${gradId})`}/>
    <circle cx="40" cy="36" r="2.4" fill={`url(#${gradId})`}/>
  </svg>
)

const LogoutModal = ({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(10px)" }} onClick={onCancel}>
    <div className="w-full sm:max-w-xs rounded-t-3xl sm:rounded-2xl p-6 flex flex-col gap-4" style={{ background: "white", boxShadow: "0 -4px 40px rgba(15,23,42,0.2)" }} onClick={e => e.stopPropagation()}>
      <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto sm:hidden"/>
      <div className="flex flex-col items-center text-center gap-3">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#FEF2F2" }}>
          <svg className="w-6 h-6" fill="none" stroke="#EF4444" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
        </div>
        <div>
          <p className="font-bold text-slate-800" style={{ fontSize: 15 }}>Sign out of SkyChat?</p>
          <p className="text-sm text-slate-500 mt-1 leading-relaxed">Your chat history is saved and restored on sign-in.</p>
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-600 active:scale-[0.97] transition-all" style={{ border: "1px solid #E2E8F0" }}>Cancel</button>
        <button onClick={onConfirm} className="flex-1 py-3 rounded-xl text-sm font-semibold text-white active:scale-[0.97] transition-all" style={{ background: "linear-gradient(135deg,#EF4444,#DC2626)" }}>Sign out</button>
      </div>
    </div>
  </div>
)

const LoginPromptModal = ({ onSignIn, onDismiss }: { onSignIn: () => void; onDismiss: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(15,23,42,0.5)", backdropFilter: "blur(10px)" }} onClick={onDismiss}>
    <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl p-6 flex flex-col gap-4" style={{ background: "white", boxShadow: "0 -4px 40px rgba(15,23,42,0.2)" }} onClick={e => e.stopPropagation()}>
      <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto sm:hidden"/>
      <div className="flex flex-col items-center text-center gap-3">
        <SkyLogo size={52} gradId="slg1"/>
        <div>
          <p className="font-bold text-slate-800" style={{ fontSize: 16 }}>Save your conversation</p>
          <p className="text-sm text-slate-500 mt-1 leading-relaxed">Sign in to keep history across sessions, or continue as guest.</p>
        </div>
      </div>
      <button onClick={onSignIn} className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-bold text-white active:scale-[0.98] transition-all" style={{ background: "linear-gradient(135deg,#1E40AF,#2563EB)" }}>
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Sign in with Google
      </button>
      <button onClick={onDismiss} className="text-sm text-slate-400 font-medium py-2 text-center active:opacity-70">Continue as guest</button>
    </div>
  </div>
)

const TypingDots = () => (
  <div className="flex items-center gap-1 px-4 py-3" style={{ background: "white", border: "1px solid #EEF2F7", borderRadius: "6px 18px 18px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", display: "inline-flex" }}>
    {[0, 160, 320].map(d => (
      <span key={d} className="rounded-full bg-sky-400 animate-bounce" style={{ width: 7, height: 7, animationDelay: `${d}ms`, animationDuration: "1s" }}/>
    ))}
  </div>
)

export default function ChatUI() {
  const { data: session } = useSession()
  const userId = session?.user?.email ?? null

  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [hasShownLoginPrompt, setHasShownLoginPrompt] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<ISpeechRecognition | null>(null)

  useEffect(() => {
    const w = window as SpeechWindow
    setVoiceSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition))
  }, [])

  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    const lock = () => document.querySelector('meta[name="viewport"]')?.setAttribute("content","width=device-width,initial-scale=1,maximum-scale=1")
    const unlock = () => document.querySelector('meta[name="viewport"]')?.setAttribute("content","width=device-width,initial-scale=1")
    el.addEventListener("focus", lock)
    el.addEventListener("blur", unlock)
    return () => { el.removeEventListener("focus", lock); el.removeEventListener("blur", unlock) }
  }, [])

  useEffect(() => {
    if (userId) { setChatSessions(loadSessions(userId)) }
    else { setChatSessions([]); setMessages([]); setActiveChatId(null); setHasShownLoginPrompt(false) }
  }, [userId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 100) + "px"
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    autoResize(e.target)
    if (!session && !hasShownLoginPrompt && e.target.value.length === 1) {
      setShowLoginPrompt(true)
      setHasShownLoginPrompt(true)
    }
  }

  const startVoice = () => {
    const w = window as SpeechWindow
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SR) return
    if (isListening) { recognitionRef.current?.stop(); return }
    const rec = new SR()
    rec.lang = "en-US"; rec.interimResults = true; rec.continuous = false
    recognitionRef.current = rec
    setIsListening(true)
    rec.onresult = (e: ISpeechRecognitionEvent) => {
      const t = Array.from({ length: e.results.length }, (_, i) => e.results[i][0].transcript).join("")
      setInput(t)
      if (inputRef.current) autoResize(inputRef.current)
    }
    rec.onend = () => setIsListening(false)
    rec.onerror = () => setIsListening(false)
    rec.start()
  }

  const commitSessions = useCallback((updated: ChatSession[]) => {
    setChatSessions(updated)
    if (userId) persistSessions(userId, updated)
  }, [userId])

  const createNewChat = () => {
    setMessages([]); setActiveChatId(null); setInput(""); setSidebarOpen(false)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const loadChat = (chatId: string) => {
    const chat = chatSessions.find(c => c.id === chatId)
    if (chat) { setMessages(chat.messages); setActiveChatId(chatId); setSidebarOpen(false) }
  }

  const saveOrUpdateChat = (msgs: Message[]) => {
    if (!userId) return
    if (activeChatId) {
      commitSessions(chatSessions.map(c => c.id === activeChatId ? { ...c, messages: msgs } : c))
    } else {
      const first = msgs.find(m => m.role === "user")
      const title = first ? first.content.slice(0, 44) + (first.content.length > 44 ? "…" : "") : "New Chat"
      const newId = Date.now().toString()
      commitSessions([{ id: newId, title, messages: msgs, createdAt: new Date() }, ...chatSessions])
      setActiveChatId(newId)
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return
    recognitionRef.current?.stop()
    const userMsg: Message = { role: "user", content: input.trim() }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput("")
    if (inputRef.current) inputRef.current.style.height = "auto"
    setIsLoading(true)
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: input }) })
      const data = await res.json()
      const final = [...updated, { role: "assistant", content: data.reply } as Message]
      setMessages(final)
      saveOrUpdateChat(final)
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong. Please try again." }])
    } finally { setIsLoading(false) }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const grouped = chatSessions.reduce<Record<string, ChatSession[]>>((acc, chat) => {
    const d = new Date(chat.createdAt), today = new Date(), yday = new Date()
    yday.setDate(today.getDate() - 1)
    const label = d.toDateString() === today.toDateString() ? "Today" : d.toDateString() === yday.toDateString() ? "Yesterday" : "Older"
    if (!acc[label]) acc[label] = []
    acc[label].push(chat)
    return acc
  }, {})

  const handleLogout = () => { setShowLogoutModal(false); signOut() }

  const SidebarContent = () => (
    <div className="flex flex-col h-full select-none">
      <div className="px-4 pt-5 pb-4 shrink-0">
        <div className="flex items-center gap-2.5 mb-5">
          <SkyLogo size={32} gradId="slg2"/>
          <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.5px", background: "linear-gradient(120deg,#52ADF5,#1C6CEF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>SkyChat</span>
        </div>
        <button onClick={createNewChat} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all group hover:-translate-y-px active:translate-y-0" style={{ background: "linear-gradient(135deg,#EFF6FF,#F0F9FF)", border: "1px solid #BFDBFE", color: "#1D4ED8" }}>
          <svg className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>
          New conversation
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-3 min-h-0">
        {session && chatSessions.length > 0 ? (
          ["Today","Yesterday","Older"].filter(l => grouped[l]?.length).map(label => (
            <div key={label} className="mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] px-3 mb-1.5" style={{ color: "#94A3B8" }}>{label}</p>
              <div className="space-y-0.5">
                {grouped[label].map(chat => {
                  const active = activeChatId === chat.id
                  return (
                    <button key={chat.id} onClick={() => loadChat(chat.id)} className="w-full text-left px-3 py-2.5 rounded-xl text-[13px] transition-all flex items-start gap-2.5 group" style={active ? { background: "linear-gradient(135deg,#EFF6FF,#F0F9FF)", color: "#1D4ED8", fontWeight: 600, border: "1px solid #BFDBFE" } : { color: "#475569" }}>
                      <svg className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${active ? "text-blue-500" : "text-slate-300 group-hover:text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                      <span className="truncate leading-snug">{chat.title}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))
        ) : session ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "#F1F5F9" }}>
              <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
            </div>
            <div><p className="text-[13px] font-semibold text-slate-400">No conversations yet</p><p className="text-xs text-slate-300 mt-0.5">Start a new chat to begin</p></div>
          </div>
        ) : (
          <div className="mx-2 mt-1 p-4 rounded-xl" style={{ background: "#F8FAFC", border: "1px solid #E8EDF5" }}>
            <p className="text-[12px] text-slate-500 leading-relaxed text-center">Sign in to save and revisit your conversations</p>
          </div>
        )}
      </div>
      <div className="shrink-0 p-3" style={{ borderTop: "1px solid #EEF2F7" }}>
        {session ? (
          <div className="flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-slate-50 transition-colors">
            <div className="relative shrink-0">
              <img src={session.user?.image ?? ""} alt="" className="w-8 h-8 rounded-full" style={{ boxShadow: "0 0 0 2px #BFDBFE" }}/>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400" style={{ border: "2px solid white" }}/>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-slate-700 truncate leading-none">{session.user?.name}</p>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">{session.user?.email}</p>
            </div>
            <button onClick={() => setShowLogoutModal(true)} className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            </button>
          </div>
        ) : (
          <button onClick={() => signIn("google")} className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]" style={{ background: "linear-gradient(135deg,#1E40AF,#2563EB)" }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        )}
      </div>
    </div>
  )

  const suggestions = [
    { emoji: "✍️", label: "Draft an email", prompt: "Help me write a professional email" },
    { emoji: "💡", label: "Brainstorm ideas", prompt: "Give me creative ideas for my project" },
    { emoji: "🔍", label: "Research a topic", prompt: "Explain a concept I want to understand" },
    { emoji: "⚡", label: "Debug my code", prompt: "Help me fix a bug in my code" },
  ]

  return (
    <>
      <style>{`
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pulse-ring { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); } 50% { box-shadow: 0 0 0 6px rgba(239,68,68,0); } }
        .msg-anim { animation: fadeSlideUp 0.28s cubic-bezier(0.2,0,0,1) both; }
        .hero-anim { animation: fadeIn 0.4s ease both; }
        .voice-pulse { animation: pulse-ring 1.4s ease infinite; }
      `}</style>

      <div className="flex overflow-hidden" style={{ fontFamily: "'DM Sans','Inter',system-ui,sans-serif", background: "#F7F9FC", height: "100dvh" }}>

        {showLogoutModal && <LogoutModal onConfirm={handleLogout} onCancel={() => setShowLogoutModal(false)}/>}
        {showLoginPrompt && <LoginPromptModal onSignIn={() => { setShowLoginPrompt(false); signIn("google") }} onDismiss={() => setShowLoginPrompt(false)}/>}

        {sidebarOpen && <div className="fixed inset-0 z-20 md:hidden" style={{ background: "rgba(15,23,42,0.4)", backdropFilter: "blur(6px)" }} onClick={() => setSidebarOpen(false)}/>}

        <aside className="hidden md:flex w-64 flex-col shrink-0" style={{ background: "white", borderRight: "1px solid #EEF2F7" }}>
          <SidebarContent/>
        </aside>
        <aside className="fixed top-0 left-0 h-full w-[80vw] max-w-[280px] z-30 flex flex-col md:hidden" style={{ background: "white", borderRight: "1px solid #EEF2F7", transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.26s cubic-bezier(0.4,0,0.2,1)", boxShadow: sidebarOpen ? "4px 0 32px rgba(15,23,42,0.18)" : "none" }}>
          <SidebarContent/>
        </aside>

        <div className="flex flex-col flex-1 min-w-0 min-h-0">

          <header className="flex items-center shrink-0 px-3 sm:px-5" style={{ height: 52, background: "white", borderBottom: "1px solid #EEF2F7", gap: 8 }}>
            <button onClick={() => setSidebarOpen(true)} className="md:hidden flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 transition-colors shrink-0 active:scale-95" style={{ width: 36, height: 36 }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
            <div className="flex items-center gap-2 md:hidden flex-1 min-w-0">
              <SkyLogo size={28} gradId="slg3"/>
              <span className="font-extrabold truncate" style={{ fontSize: 16, letterSpacing: "-0.4px", background: "linear-gradient(120deg,#52ADF5,#1C6CEF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>SkyChat</span>
            </div>
            <div className="hidden md:flex items-center gap-2 flex-1 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"/>
              <span className="text-[13px] font-medium text-slate-500 truncate">{activeChatId ? chatSessions.find(c => c.id === activeChatId)?.title ?? "Chat" : "New conversation"}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={createNewChat} className="flex items-center gap-1.5 font-bold px-3 py-1.5 rounded-xl transition-all hover:bg-blue-50 active:scale-[0.97]" style={{ fontSize: 12, color: "#1C6CEF", border: "1px solid #BFDBFE" }}>
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>
                <span className="hidden sm:inline">New chat</span>
              </button>
              {!session && (
                <button onClick={() => signIn("google")} className="font-bold text-white px-3 py-1.5 rounded-xl transition-all hover:opacity-90 active:scale-[0.97]" style={{ fontSize: 12, background: "linear-gradient(135deg,#52ADF5,#1C6CEF)" }}>Sign in</button>
              )}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto overscroll-contain min-h-0" style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
            {messages.length === 0 ? (
              <div className="hero-anim flex flex-col items-center justify-center h-full px-5 text-center" style={{ paddingBottom: "env(safe-area-inset-bottom,0px)" }}>
                <div style={{ marginBottom: 18, filter: "drop-shadow(0 8px 24px rgba(28,108,239,0.25))" }}>
                  <SkyLogo size={72} gradId="slg4"/>
                </div>
                <h1 className="font-extrabold tracking-tight" style={{ fontSize: "clamp(20px,5vw,28px)", lineHeight: 1.2, marginBottom: 10, background: "linear-gradient(135deg,#0F172A,#1E40AF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  What can I help with?
                </h1>
                <p className="text-slate-400 leading-relaxed" style={{ fontSize: 14, maxWidth: 260, marginBottom: 28 }}>
                  Your intelligent assistant for writing, code, research, and more.
                </p>
                <div className="grid grid-cols-2 w-full" style={{ maxWidth: 360, gap: 10 }}>
                  {suggestions.map((s, i) => (
                    <button
                      key={s.label}
                      onClick={() => { setInput(s.prompt); setTimeout(() => inputRef.current?.focus(), 10) }}
                      className="flex items-center text-left active:scale-[0.95] transition-all"
                      style={{ gap: 9, padding: "12px 14px", borderRadius: 16, background: "white", border: "1px solid #E8EDF5", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", fontSize: 13, fontWeight: 600, color: "#374151", animationDelay: `${i * 60}ms`, animation: "fadeSlideUp 0.35s cubic-bezier(0.2,0,0,1) both" }}
                      onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = "#93C5FD"; el.style.boxShadow = "0 4px 16px rgba(28,108,239,0.12)" }}
                      onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = "#E8EDF5"; el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)" }}
                    >
                      <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{s.emoji}</span>
                      <span className="truncate">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-4 px-3 sm:px-6 max-w-3xl mx-auto w-full">
                {messages.map((m, i) => (
                  <div key={i} className="msg-anim" style={{ animationDelay: `${Math.min(i * 20, 60)}ms` }}>
                    <MessageBubble message={m}/>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start pt-1 msg-anim">
                    <TypingDots/>
                  </div>
                )}
                <div ref={messagesEndRef}/>
              </div>
            )}
          </div>

          <div className="shrink-0" style={{ background: "white", borderTop: "1px solid #EEF2F7", paddingBottom: "env(safe-area-inset-bottom,0px)" }}>
            <div className="px-3 sm:px-6 py-2.5 sm:py-3 max-w-3xl mx-auto">
              <div
                className="flex items-end transition-all duration-200"
                style={{ background: "#F7F9FC", border: "1.5px solid #E2E8F0", borderRadius: 22, padding: "8px 8px 8px 14px", gap: 6 }}
                onFocusCapture={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor="#93C5FD"; el.style.boxShadow="0 0 0 3px rgba(147,197,253,0.2)"; el.style.background="white" }}
                onBlurCapture={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor="#E2E8F0"; el.style.boxShadow="none"; el.style.background="#F7F9FC" }}
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  rows={1}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Message SkyChat…"
                  disabled={isLoading}
                  className="flex-1 bg-transparent text-slate-800 placeholder-slate-400 focus:outline-none resize-none leading-relaxed disabled:opacity-50"
                  style={{ fontSize: 14, maxHeight: 100, minHeight: 22, paddingTop: 3, paddingBottom: 3 }}
                />
                <div className="flex items-center gap-1.5 shrink-0">
                  {voiceSupported && (
                    <button
                      onClick={startVoice}
                      className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200 active:scale-90 ${isListening ? "voice-pulse" : ""}`}
                      style={{ background: isListening ? "linear-gradient(135deg,#EF4444,#DC2626)" : "#EEF2F7" }}
                      title={isListening ? "Stop listening" : "Voice input"}
                    >
                      {isListening ? (
                        <svg className="w-3.5 h-3.5" fill="white" viewBox="0 0 24 24">
                          <rect x="6" y="4" width="4" height="16" rx="2"/>
                          <rect x="14" y="4" width="4" height="16" rx="2"/>
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="#64748B" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
                        </svg>
                      )}
                    </button>
                  )}
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || isLoading}
                    className="flex items-center justify-center w-8 h-8 rounded-xl text-white transition-all duration-150 active:scale-90 disabled:cursor-not-allowed"
                    style={{
                      background: !input.trim() || isLoading ? "#CBD5E1" : "linear-gradient(135deg,#52ADF5,#1C6CEF)",
                      boxShadow: !input.trim() || isLoading ? "none" : "0 4px 12px rgba(28,108,239,0.32)",
                    }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </button>
                </div>
              </div>
              <p className="text-center text-[11px] mt-1.5" style={{ color: "#C0CADB", letterSpacing: "0.01em" }}>
                SkyChat may make mistakes — verify important information.
              </p>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}