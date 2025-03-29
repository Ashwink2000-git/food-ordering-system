const socketIO = (io) => {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    
    // Join user to room based on role
    socket.on('joinRoom', ({ userId, role }) => {
      socket.join(role);
      if (role === 'user') {
        socket.join(`user:${userId}`);
      }
      console.log(`User ${userId} joined ${role} room`);
    });
    
    // Listen for user disconnection
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
  
  // Return middleware to attach io to req object
  return (req, res, next) => {
    req.io = io;
    next();
  };
};

module.exports = socketIO;
