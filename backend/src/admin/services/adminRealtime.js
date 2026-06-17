let io = null;

const setAdminIo = (socketServer) => {
  io = socketServer;
};

const emitToAdmin = (event, payload) => {
  if (io) {
    io.to('admin-room').emit(event, { ...payload, at: new Date() });
  }
};

module.exports = { setAdminIo, emitToAdmin };
