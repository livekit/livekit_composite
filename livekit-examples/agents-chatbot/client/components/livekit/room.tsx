'use client'

import { LiveKitRoom } from '@livekit/components-react'

export interface Room {
  token: string
  url: string
  children: React.ReactNode
}

export function Room({ token, url, children }: Room) {
  return (
    <LiveKitRoom serverUrl={url} token={token} connect={true}>
      {children}
    </LiveKitRoom>
  )
}
