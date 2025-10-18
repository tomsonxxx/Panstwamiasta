const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // W środowisku produkcyjnym zmień na konkretną domenę klienta
    methods: ["GET", "POST"]
  }
});

const rooms = {};

const getRoomList = () => {
    return Object.entries(rooms).map(([roomId, roomData]) => ({
        roomId,
        hostName: roomData.players.find(p => p.id === roomData.hostId)?.name || 'Nieznany Host',
        playerCount: roomData.players.length,
    }));
};


io.on('connection', (socket) => {
  console.log(`[Socket.IO] Użytkownik połączony: ${socket.id}`);
  
  const playerInfo = socket.handshake.query.player ? JSON.parse(socket.handshake.query.player) : { id: socket.id, name: 'Anonim' };

  socket.on('getRooms', () => {
    socket.emit('roomList', getRoomList());
  });

  socket.on('createRoom', ({ roomId, hostPlayer }) => {
    if (rooms[roomId]) {
        // Pokój już istnieje, obsłuż błąd? Na razie nadpisujemy.
    }
    rooms[roomId] = { hostId: hostPlayer.id, players: [hostPlayer], gameState: null };
    socket.join(roomId);
    console.log(`[Socket.IO] Pokój utworzony: ${roomId} przez ${hostPlayer.name}`);
    io.emit('roomList', getRoomList());
  });

  socket.on('joinRoom', ({ roomId, player }) => {
    if (rooms[roomId]) {
      if (rooms[roomId].players.length >= 7) {
          socket.emit('roomFull');
          return;
      }
      rooms[roomId].players.push(player);
      socket.join(roomId);
      console.log(`[Socket.IO] ${player.name} dołączył do pokoju: ${roomId}`);
      
      // Powiadom innych graczy w pokoju o nowym graczu
      socket.to(roomId).emit('messageRelayed', { type: 'player_join', senderId: player.id, payload: { player }});
      
      // Wyślij pełną listę graczy i stan gry do nowego gracza
      socket.emit('joinSuccess', rooms[roomId].players);
      if (rooms[roomId].gameState) {
        socket.emit('gameStateSync', rooms[roomId].gameState);
      }

      io.emit('roomList', getRoomList());
    } else {
      socket.emit('roomNotFound');
    }
  });

  socket.on('leaveRoom', ({ roomId }) => {
     if (rooms[roomId]) {
        const playerIndex = rooms[roomId].players.findIndex(p => p.id === playerInfo.id);
        if (playerIndex > -1) {
            const leavingPlayer = rooms[roomId].players.splice(playerIndex, 1)[0];
            socket.to(roomId).emit('messageRelayed', { type: 'player_leave', senderId: leavingPlayer.id, payload: { playerId: leavingPlayer.id }});
            if (rooms[roomId].players.length === 0) {
                delete rooms[roomId];
                console.log(`[Socket.IO] Pokój ${roomId} usunięty (pusty).`);
            } else {
                if(rooms[roomId].hostId === leavingPlayer.id) {
                    const newHost = rooms[roomId].players[0];
                    rooms[roomId].hostId = newHost.id;
                    newHost.isHost = true; // Make sure this is reflected
                    io.to(roomId).emit('messageRelayed', { type: 'new_host', senderId: 'server', payload: { newHostId: newHost.id, newHostName: newHost.name } });
                    console.log(`[Socket.IO] Nowy host w pokoju ${roomId}: ${newHost.name}`);
                }
            }
            io.emit('roomList', getRoomList());
        }
     }
     socket.leave(roomId);
     console.log(`[Socket.IO] ${playerInfo.name} opuścił pokój: ${roomId}`);
  });
  
  socket.on('relayMessage', ({ roomId, message }) => {
    socket.to(roomId).emit('messageRelayed', message);
  });

  socket.on('broadcastGameState', ({ roomId, gameState }) => {
    if (rooms[roomId]) {
        rooms[roomId].gameState = gameState;
    }
    socket.to(roomId).emit('gameStateSync', gameState);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Użytkownik rozłączony: ${socket.id}`);
    for (const roomId in rooms) {
        const playerIndex = rooms[roomId].players.findIndex(p => p.id === playerInfo.id);
        if (playerIndex > -1) {
            const leavingPlayer = rooms[roomId].players.splice(playerIndex, 1)[0];
            socket.to(roomId).emit('messageRelayed', { type: 'player_leave', senderId: leavingPlayer.id, payload: { playerId: leavingPlayer.id }});
            console.log(`[Socket.IO] ${leavingPlayer.name} rozłączony z pokoju ${roomId}.`);

            if (rooms[roomId].players.length === 0) {
                delete rooms[roomId];
                console.log(`[Socket.IO] Pokój ${roomId} usunięty (pusty).`);
            } else if (rooms[roomId].hostId === leavingPlayer.id) {
                const newHost = rooms[roomId].players[0];
                rooms[roomId].hostId = newHost.id;
                newHost.isHost = true;
                io.to(roomId).emit('messageRelayed', { type: 'new_host', senderId: 'server', payload: { newHostId: newHost.id, newHostName: newHost.name } });
                console.log(`[Socket.IO] Nowy host w pokoju ${roomId}: ${newHost.name}`);
            }
            io.emit('roomList', getRoomList());
            break; 
        }
    }
  });
});


// Serwowanie plików statycznych dla produkcji
const clientBuildPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientBuildPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});


const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Serwer Socket.IO nasłuchuje na porcie ${PORT}`);
});
