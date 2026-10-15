import { io } from 'socket.io-client'

export const socket = io(
  process.env.NEXT_PUBLIC_API_BASE_URL!,
  {
    transports: ['websocket'],
  },
)
