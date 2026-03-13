"use client"

import { useState } from "react"
import { useSession, signIn, signOut } from "next-auth/react"
import MessageBubble from "./MessageBubble"
import { Message } from "@/types/chat"

export default function ChatUI(){

const { data:session } = useSession()

const [messages,setMessages] = useState<Message[]>([])
const [input,setInput] = useState("")
const [history,setHistory] = useState<string[]>([])

const sendMessage = async ()=>{

if(!input) return

const userMsg:Message={
role:"user",
content:input
}

setMessages(prev=>[...prev,userMsg])
setInput("")

const res = await fetch("/api/chat",{
method:"POST",
body:JSON.stringify({message:input})
})

const data = await res.json()

const aiMsg:Message={
role:"assistant",
content:data.reply
}

setMessages(prev=>[...prev,aiMsg])

if(session){
setHistory(prev=>[input,...prev])
}

}

return(

<div className="flex h-screen bg-gray-50">

<div className="w-72 border-r bg-white hidden md:flex flex-col">

<div className="p-4 border-b flex items-center justify-between">

<h2 className="font-semibold text-lg">
SkyChat
</h2>

{session ? (
<button onClick={()=>signOut()} className="text-sm text-gray-600">
Logout
</button>
) : (
<button onClick={()=>signIn("google")} className="text-sm text-blue-600">
Login
</button>
)}

</div>

{session && (

<div className="p-4 border-b flex items-center gap-3">

<img
src={session.user?.image || ""}
className="w-8 h-8 rounded-full"
/>

<div className="text-sm">
{session.user?.name}
</div>

</div>

)}

{session && (

<div className="flex-1 overflow-y-auto p-4 space-y-2">

{history.map((h,i)=>(
<div key={i} className="text-sm p-2 rounded bg-gray-100">
{h}
</div>
))}

</div>

)}

</div>

<div className="flex flex-col flex-1">

<div className="border-b bg-white px-6 py-4 font-semibold">
SkyChat
</div>

<div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-3xl w-full mx-auto">

{messages.map((m,i)=>(
<MessageBubble key={i} message={m}/>
))}

</div>

<div className="border-t bg-white p-4">

<div className="flex gap-3 max-w-3xl mx-auto">

<input
value={input}
onChange={(e)=>setInput(e.target.value)}
placeholder="Ask SkyChat..."
className="flex-1 border px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
/>

<button
onClick={sendMessage}
className="bg-blue-600 text-white px-5 py-2 rounded-lg"
>
Send
</button>

</div>

</div>

</div>

</div>

)

}