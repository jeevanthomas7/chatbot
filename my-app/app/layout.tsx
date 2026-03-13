import "./globals.css"
import Providers from "@/components/Providers"

export const metadata = {
  title: "SkyChat",
  description: "AI Chatbot",
  icons: {
    icon: "/skychat-favicon-64.png",
  },
}


export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}