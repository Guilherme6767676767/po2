// api/socket.js
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
// Serve static files from the client build (for production)
app.use(express.static('dist'));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Game state (very simplified)
const gameState = {
  mode: 'Training', // 'Training' or 'Bomb'
  players: {}, // socketId -> { team: 'TR'|'CT', alive: true }
  bombPlanted: false,
  bombTimer: null,
  bombCountdown: 30,
};

function broadcastMode() {
  io.emit('modeUpdate', gameState.mode);
}

function startBombTimer() {
  let remaining = gameState.bombCountdown;
  io.emit('timerUpdate', remaining);
  gameState.bombTimer = setInterval(() => {
    remaining--;
    io.emit('timerUpdate', remaining);
    if (remaining <= 0) {
      clearInterval(gameState.bombTimer);
      io.emit('timerUpdate', 0);
      // Bomb exploded – CT loses
      io.emit('bombExploded');
      resetRound();
    }
  }, 1000);
}

function resetRound() {
  gameState.bombPlanted = false;
  clearInterval(gameState.bombTimer);
  // revive all players
  Object.values(gameState.players).forEach(p => (p.alive = true));
  io.emit('timerUpdate', -1);
  io.emit('roundReset');
}

io.on('connection', (socket) => {
  console.log('Player connected', socket.id);
  // Assign team (simple alternating)
  const team = Object.values(gameState.players).filter(p => p.team === 'TR').length <=
    Object.values(gameState.players).filter(p => p.team === 'CT').length
    ? 'TR' : 'CT';
  gameState.players[socket.id] = { team, alive: true };
  socket.emit('modeUpdate', gameState.mode);

  socket.on('playerShoot', (data) => {
    // In a real game we'd raycast and hit other players.
    // Here we just log.
    console.log(`Shot from ${socket.id}`);
    // For demo, if mode is Bomb and a CT shoots and bomb planted, defuse mock
    if (gameState.mode === 'Bomb' && gameState.bombPlanted && gameState.players[socket.id].team === 'CT') {
      // Simulate defuse after 3 seconds
      setTimeout(() => {
        clearInterval(gameState.bombTimer);
        io.emit('bombDefused');
        resetRound();
      }, 3000);
    }
  });

  socket.on('plantBomb', () => {
    if (gameState.mode !== 'Bomb') return;
    if (gameState.players[socket.id].team !== 'TR') return;
    if (!gameState.bombPlanted) {
      gameState.bombPlanted = true;
      io.emit('bombPlanted');
      startBombTimer();
    }
  });

  socket.on('switchMode', (newMode) => {
    if (newMode === 'Training' || newMode === 'Bomb') {
      gameState.mode = newMode;
      broadcastMode();
    }
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected', socket.id);
    delete gameState.players[socket.id];
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Socket.io server listening on ${PORT}`));
