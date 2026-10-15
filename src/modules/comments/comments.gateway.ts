import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'

@WebSocketGateway({
  cors: { origin: '*' },
})
export class CommentsGateway {
  @WebSocketServer()
  server: Server

  @SubscribeMessage('join')
  handleJoin(
    @MessageBody() room: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(room)
  }

  emitNewComment(room: string, comment: any) {
    this.server.to(room).emit('comment:new', comment)
  }
}
