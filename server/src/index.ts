import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

interface Player {
  id: number;
  isMonster: boolean;
  position: { x: number; y: number; z: number };
}

let playerCounter = 0;
const players: Player[] = [];
let isThereAMonster = false;

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  /* options */
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  allowRequest: (req, callback) => {
    // const noOriginHeader = req.headers.origin === undefined;
    callback(null, true);
  },
});

io.on("connection", (socket) => {
  playerCounter++;
  console.log(
    "New Connection: " + socket.id + " isThereAMonster: " + isThereAMonster
  );

  let newPlayer: Player;
  if (isThereAMonster) {
    newPlayer = {
      id: playerCounter,
      isMonster: false,
      position: { x: 0, y: 0, z: 0 },
    };
    socket.emit("init", false, players);
  } else {
    newPlayer = {
      id: playerCounter,
      isMonster: true,
      position: { x: 0, y: 0, z: 0 },
    };
    isThereAMonster = true;
    socket.emit("init", true, players);
  }

  players.push(newPlayer);

  // Tell other players about new char
  socket.broadcast.emit("playerJoined", newPlayer);

  socket.on("playerPositionUpdate", (playerPosition) => {
    // console.log("Player Position: " + playerPosition.x);
    socket.broadcast.emit("playerPositionUpdate", playerPosition);
  });
});

httpServer.listen(3000, () => {
  console.log("Listening on 3000");
});
