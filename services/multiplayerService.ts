import { io, Socket } from 'socket.io-client';
import { HostedGameInfo, Player, GameState, MultiplayerMessage } from '../types';
import toast from 'react-hot-toast';

// WAŻNE: Ten URL wskazuje na lokalny serwer Node.js.
// W środowisku produkcyjnym należy go zmienić na adres wdrożonego serwera.
const SERVER_URL = 'http://localhost:3001';
let socket: Socket;

// Zarządzanie Połączeniem
export const connectToServer = (player: Player) => {
  if (socket?.connected) {
      // @google/genai-codex-fix: Poprawiono dostęp do parametrów zapytania z `socket.io.opts.query`. Właściwość `socket.query` jest przestarzała.
      if((socket.io.opts.query as { player: string }).player !== JSON.stringify(player)) {
          socket.io.opts.query = { player: JSON.stringify(player) };
      }
      return;
  }
  
  socket = io(SERVER_URL, {
    query: {
      player: JSON.stringify(player)
    }
  });

  socket.on('connect', () => {
    console.log(`[SocketService] Połączono z serwerem, ID: ${socket.id}`);
    toast.success('Połączono z serwerem multiplayer!', { duration: 2000, id: 'socket-conn-success' });
  });

  socket.on('connect_error', (err) => {
    console.error('[SocketService] Błąd połączenia:', err.message);
    toast.error('Nie można połączyć się z serwerem multiplayer. Upewnij się, że jest uruchomiony.', { duration: 5000, id: 'socket-conn-error' });
  });

  socket.on('disconnect', (reason) => {
    console.log(`[SocketService] Rozłączono: ${reason}`);
    toast.error('Rozłączono z serwerem multiplayer.', { id: 'socket-disconnect' });
  });
};

export const disconnectFromServer = () => {
  if (socket) {
    socket.disconnect();
  }
};

// Nasłuchiwacze (do użycia w kontekście)
export const onRoomListUpdate = (callback: (rooms: HostedGameInfo[]) => void) => {
  socket?.on('roomList', callback);
};
export const onGameStateSync = (callback: (gameState: GameState) => void) => {
  socket?.on('gameStateSync', callback);
};
export const onMessageRelayed = (callback: (message: MultiplayerMessage) => void) => {
    socket?.on('messageRelayed', callback);
};
export const onJoinSuccess = (callback: (fullPlayerList: Player[]) => void) => {
    socket?.on('joinSuccess', callback);
};
export const onRoomNotFound = (callback: () => void) => {
    socket?.on('roomNotFound', callback);
};
export const onRoomFull = (callback: () => void) => {
    socket?.on('roomFull', callback);
}

// Emitery
export const getRooms = () => {
  socket?.emit('getRooms');
};
export const createRoom = (roomId: string, hostPlayer: Player) => {
  socket?.emit('createRoom', { roomId, hostPlayer });
};
export const joinRoom = (roomId: string, player: Player) => {
  socket?.emit('joinRoom', { roomId, player });
};
export const leaveRoom = (roomId: string) => {
  socket?.emit('leaveRoom', { roomId });
};
export const relayMessage = (roomId: string, message: MultiplayerMessage) => {
  socket?.emit('relayMessage', { roomId, message });
};
export const broadcastGameState = (roomId: string, gameState: GameState) => {
  socket?.emit('broadcastGameState', { roomId, gameState });
};

// Czyszczenie nasłuchiwaczy
export const cleanupListeners = () => {
    if(!socket) return;
    socket.off('roomList');
    socket.off('gameStateSync');
    socket.off('messageRelayed');
    socket.off('joinSuccess');
    socket.off('roomNotFound');
    socket.off('roomFull');
}
