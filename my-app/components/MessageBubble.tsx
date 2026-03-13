import { Message } from "@/types/chat"

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user"

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      {!isUser && (
        <div
          className="flex items-center justify-center shrink-0 mr-2.5 mt-0.5"
          style={{
            width: 28, height: 28, borderRadius: 9,
            background: "linear-gradient(135deg,#0EA5E9,#2563EB)",
            boxShadow: "0 4px 10px rgba(37,99,235,0.2)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 40 40" fill="none">
            <path d="M12 15C12 13.343 13.343 12 15 12H24C27.314 12 30 14.686 30 18C30 21.314 27.314 24 24 24H20" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none"/>
            <path d="M20 24L16 28" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none"/>
            <circle cx="12" cy="28" r="3" fill="white" opacity="0.85"/>
          </svg>
        </div>
      )}

      <div
        style={{
          maxWidth: "72%",
          padding: "9px 14px",
          borderRadius: isUser ? "18px 18px 4px 18px" : "4px 18px 18px 18px",
          fontSize: 14,
          lineHeight: 1.65,
          ...(isUser ? {
            background: "linear-gradient(135deg,#0EA5E9,#2563EB)",
            color: "white",
            boxShadow: "0 4px 14px rgba(37,99,235,0.22)",
          } : {
            background: "white",
            color: "#1E293B",
            border: "1px solid #EEF2F7",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }),
        }}
      >
        <p className="whitespace-pre-wrap break-words m-0">{message.content}</p>
      </div>

      {isUser && (
        <div
          className="flex items-center justify-center shrink-0 ml-2.5 mt-0.5"
          style={{ width: 28, height: 28, borderRadius: "50%", background: "#E8EDF5" }}
        >
          <svg className="w-3.5 h-3.5 text-slate-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
          </svg>
        </div>
      )}
    </div>
  )
}