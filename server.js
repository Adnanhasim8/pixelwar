const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const GRID_SIZE = 64;
const COLORS = [
  '#FFFFFF','#000000','#FF0000','#00FF00',
  '#0000FF','#FFFF00','#FF00FF','#00FFFF',
  '#FF8800','#8800FF','#00FF88','#FF0088',
  '#888888','#FF4444','#44FF44','#4444FF'
];

// Initialize canvas
let canvas = Array(GRID_SIZE).fill(null).map(() => 
  Array(GRID_SIZE).fill('#FFFFFF')
);

// Track cooldowns
let cooldowns = {};

app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);
  
  // Send current canvas
  socket.emit('init', { canvas, colors: COLORS, gridSize: GRID_SIZE });

  socket.on('place_pixel', ({ x, y, color }) => {
    const now = Date.now();
    const lastPlace = cooldowns[socket.id] || 0;
    const cooldownMs = 5000;

    if (now - lastPlace < cooldownMs) {
      const remaining = Math.ceil((cooldownMs - (now - lastPlace)) / 1000);
      socket.emit('cooldown', { remaining });
      return;
    }

    if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE && COLORS.includes(color)) {
      canvas[y][x] = color;
      cooldowns[socket.id] = now;
      io.emit('pixel_placed', { x, y, color });
      socket.emit('cooldown', { remaining: 0 });
    }
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    delete cooldowns[socket.id];
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🎮 PixelWar running at http://localhost:${PORT}`);
});