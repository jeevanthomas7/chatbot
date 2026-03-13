import { askAI } from "@/lib/openrouter"

export async function POST(req: Request) {

  const { message } = await req.json()

  const reply = await askAI(message)

  return Response.json({ reply })
}