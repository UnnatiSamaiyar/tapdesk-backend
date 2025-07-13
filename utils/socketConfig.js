const socketIo = require('socket.io');

let io;
const userSockets = new Map(); // Map to store user sockets

const setupSocket = (server) => {
  const frontendURLs = process.env.SOCKET_ALLOWED_ORIGIN.split(',');
  io = socketIo(server, {
    pingTimeout: 60000,
    cors: {
      origin: frontendURLs
    },        
  });
// console.log([process.env.FRONTEND_URL])
  io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId;
    socket.userId = userId; // Store userId on the socket

    // Add the socket to the userSockets map
    userSockets.set(userId, socket);
    console.log(`User connected: ${userId}`);

    socket.on('disconnect', () => {
      // Remove the socket from the userSockets map
      userSockets.delete(userId);
      console.log(`User disconnected: ${userId}`);
    });
  });
};

const getIo = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

const getUserSocket = (userId) => {
    // console.log(userSockets);
  return userSockets.get(userId);
};

module.exports = { setupSocket, getIo, getUserSocket };
