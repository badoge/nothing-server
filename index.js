import { App } from "uWebSockets.js";

const port = 9001; //ws.alienpls.com
const users = new Set();

const app = App();

function broadcastUserCount() {
  const userCount = users.size.toString();
  let sentMessages = 0;

  users.forEach((ws) => {
    try {
      const status = ws.send(userCount);
      if (status === 1 || status === 2) {
        // 1 = sent, 2 = sent (backpressure)
        sentMessages++;
      } else if (status === 0) {
        // 0 = message dropped (connection likely closed or closing)
        console.log("Message dropped for a client during broadcast (send status 0). Client might be disconnecting.");
      } else {
        console.log(`Unknown return status from ws.send(): ${status}`);
      }
    } catch (error) {
      console.log("Error sending message during broadcast:", error);
    }
  });
  if (users.size > 0) {
    console.log(`Broadcast user count: ${userCount}. Messages sent/backpressured: ${sentMessages}/${users.size}`);
  }
}

app.ws("/connect", {
  //options
  idleTimeout: 30,
  maxPayloadLength: 1 * 1024,
  maxBackpressure: 5 * 1024,

  /* Handlers */
  open: (ws) => {
    users.add(ws);
    console.log(`user connected - total: ${users.size}`);
    broadcastUserCount();
  },
  message: (ws, message, isBinary) => {
    ws.close();
  },
  drain: (ws) => {
    // This is called when backpressure eases and you can send more data.
    ws.send(users.size.toString());
  },
  close: (ws, code, message) => {
    const wasConnected = users.delete(ws);
    if (wasConnected) {
      console.log(`user disconnected. Code: ${code}, total: ${users.size}`);
      broadcastUserCount();
    } else {
      console.log(`untracked user disconnected`);
    }
  },
});

app.listen(port, (listenSocket) => {
  if (listenSocket) {
    console.log(`WebSocket server listening on port ${port}`);
  } else {
    console.error(`Failed to listen on port ${port}`);
  }
});
