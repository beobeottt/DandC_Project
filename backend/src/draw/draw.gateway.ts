import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true })
export class DrawGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('joinTournamentRoom')
  handleJoinRoom(
    @MessageBody() data: { tournamentId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`tournament_${data.tournamentId}`);
  }

  emitDrawStarted(tournamentId: string) {
    this.server.to(`tournament_${tournamentId}`).emit('draw_started', {
      message: 'Animation is starting',
      duration: 45000,
    });
  }
}
