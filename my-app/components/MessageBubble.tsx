import { Message } from "@/types/chat"

export default function MessageBubble({message}:{message:Message}){

const user = message.role==="user"

return(

<div className={`flex ${user?"justify-end":"justify-start"}`}>

<div className={`
px-4 py-2 rounded-xl max-w-[70%] text-sm
${user?"bg-blue-600 text-white":"bg-gray-200 text-gray-900"}
`}>

{message.content}

</div>

</div>

)

}