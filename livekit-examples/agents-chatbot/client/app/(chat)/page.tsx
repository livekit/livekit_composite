import { nanoid } from '@/lib/utils'
import { Chat } from '@/components/chat'
import { AI } from '@/lib/chat/actions'
import { auth } from '@/auth'
import { Session } from '@/lib/types'
import { getMissingKeys, getLiveKitToken } from '../actions'
import { Room } from '@/components/livekit/room'

export const metadata = {
  title: 'Next.js AI Chatbot'
}

export default async function IndexPage() {
  const id = nanoid()
  const session = (await auth()) as Session
  const missingKeys = await getMissingKeys()
  const token = await getLiveKitToken(id)

  return (
    <AI initialAIState={{ chatId: id, messages: [] }}>
      <Room token={token} url={process.env.LIVEKIT_URL!}>
        <Chat id={id} session={session} missingKeys={missingKeys} />
      </Room>
    </AI>
  )
}
