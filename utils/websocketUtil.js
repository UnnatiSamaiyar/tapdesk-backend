let io;

function initializeWebSocket(serverInstance) {
    io = require('socket.io')(serverInstance);
    
    io.on('connection', (socket) => {
        console.log('A client connected');

        socket.on('disconnect', () => {
            console.log('A client disconnected');
        });
    });
}

function sendNotificationToClients(message) {
    if (io) {
        io.emit('notification', { message });
    } else {
        console.error('WebSocket is not initialized.');
    }
}

module.exports = { initializeWebSocket, sendNotificationToClients };
