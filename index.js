// Setup basic express server
const { SocketEvents } = require('./constants/socket_event');
const express = require('express');
const app = express();
const path = require('path');
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(path.join(__dirname, 'public')));

// Chatroom

let numUsers = 0;

io.on(SocketEvents.connection, async (socket) => {
  let addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on(SocketEvents.send_new_message_broadcast, (messagePayload) => {
    try {
      var messagePayloadObj = JSON.parse(messagePayload);
      socket.to(messagePayloadObj.to).emit(SocketEvents.send_new_message_broadcast, messagePayloadObj);
      io.in(messagePayloadObj.from).emit(SocketEvents.send_new_message_broadcast, messagePayloadObj);
    }
    catch (e) {
      console.log(e);
    }
  });


  socket.on(SocketEvents.send_message_to, (messagePayload) => {
    try {
      var messagePayloadObj = JSON.parse(messagePayload);
      socket.to(messagePayloadObj.to).emit(SocketEvents.send_message_to, messagePayloadObj);
      io.in(messagePayloadObj.from).emit(SocketEvents.send_message_to, messagePayloadObj);
    } catch (e) {
      console.log(e);
    }
  });


  // when the client emits 'add user', this listens and executes
  socket.on(SocketEvents.join_own_room, (username) => {
    if (addedUser) return;

    // we store the username in the socket session for this client
    socket.username = username;
    ++numUsers;
    addedUser = true;

    socket.emit(SocketEvents.login, {
      numUsers: numUsers
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit(SocketEvents.user_joined, {
      username: socket.username,
      numUsers: numUsers
    });

    socket.join(username);

  });

  socket.on(SocketEvents.join_own_room_phone, (joinOwnRoomPayload) => {
    if (addedUser) return;

    var joinOwnRoomPayloadObj = JSON.parse(joinOwnRoomPayload);
    socket.phoneNumber = joinOwnRoomPayloadObj.phoneNumber;
    socket.userID = joinOwnRoomPayloadObj.userID;
    socket.userDisplayName = joinOwnRoomPayloadObj.userDisplayName;
    socket.username = joinOwnRoomPayloadObj.userID;

    ++numUsers;
    addedUser = true;

    socket.emit(SocketEvents.login, {
      numUsers: numUsers
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit(SocketEvents.user_joined, {
      username: socket.username,
      numUsers: numUsers
    });

    socket.join(joinOwnRoomPayloadObj.userID);

  });

  // when the client emits 'typing', we broadcast it to others
  socket.on(SocketEvents.typing, () => {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on(SocketEvents.stop_typing, () => {
    socket.broadcast.emit(SocketEvents.stop_typing, {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on(SocketEvents.disconnect, () => {
    if (addedUser) {
      --numUsers;

      // echo globally that this client has left
      socket.broadcast.emit(SocketEvents.user_left, {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });

  socket.onAny((event, ...args) => {
    console.log(event, args);
  });
});
