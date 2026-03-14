import { Message } from "@/types/chat"

const BOT_GRAD_ID = "bot_avatar_grad"

const BotAvatar = () => (
  <div
    className="shrink-0 flex items-center justify-center"
    style={{ width: 30, height: 30, borderRadius: 10, background: "linear-gradient(135deg,#52ADF5,#1C6CEF)", boxShadow: "0 2px 8px rgba(28,108,239,0.28)", marginRight: 8, marginTop: 2, flexShrink: 0 }}
  >
    <svg width="17" height="17" viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id={BOT_GRAD_ID} x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#52ADF5"/>
          <stop offset="100%" stopColor="#1C6CEF"/>
        </linearGradient>
      </defs>
      <circle cx="32" cy="24" r="11" fill="white"/>
      <circle cx="21.5" cy="28.5" r="8.5" fill="white"/>
      <circle cx="42.5" cy="28" r="9" fill="white"/>
      <circle cx="14" cy="32" r="6" fill="white"/>
      <circle cx="50" cy="32" r="6.5" fill="white"/>
      <rect x="8" y="32" width="48" height="7" fill="white"/>
      <polygon points="22,39 17,46 30,39" fill="white"/>
      <circle cx="24" cy="36" r="2.4" fill={`url(#${BOT_GRAD_ID})`}/>
      <circle cx="32" cy="36" r="2.4" fill={`url(#${BOT_GRAD_ID})`}/>
      <circle cx="40" cy="36" r="2.4" fill={`url(#${BOT_GRAD_ID})`}/>
    </svg>
  </div>
)

const UserAvatar = () => (
  <div
    className="shrink-0 flex items-center justify-center"
    style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#E8EDF5,#DDE4F0)", marginLeft: 8, marginTop: 2, flexShrink: 0 }}
  >
    <svg width="15" height="15" fill="#94A3B8" viewBox="0 0 24 24">
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
    </svg>
  </div>
)

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user"
  return (
    <div
      className="flex mb-3"
      style={{ justifyContent: isUser ? "flex-end" : "flex-start", alignItems: "flex-end" }}
    >
      {!isUser && <BotAvatar/>}
      <div
        style={{
          maxWidth: "min(75%, 540px)",
          padding: "10px 14px",
          borderRadius: isUser ? "18px 18px 4px 18px" : "4px 18px 18px 18px",
          fontSize: 14,
          lineHeight: 1.65,
          wordBreak: "break-word",
          overflowWrap: "break-word",
          ...(isUser ? {
            background: "linear-gradient(135deg,#52ADF5,#1C6CEF)",
            color: "white",
            boxShadow: "0 4px 14px rgba(28,108,239,0.22)",
          } : {
            background: "white",
            color: "#1E293B",
            border: "1px solid #EEF2F7",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }),
        }}
      >
        <p style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", overflowWrap: "break-word" }}>
          {message.content}
        </p>
      </div>
      {isUser && <UserAvatar/>}
    </div>
  )
}