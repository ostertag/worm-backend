import express from "express";
import http from "http";
import cors from "cors";
import { WebSocketServer, WebSocket } from "ws";

const BOARD_WIDTH = 57; // grid units
const BOARD_HEIGHT = 30;
const FOOD_COUNT = 10;
const BUSH_COUNT = 10;
const TICK_RATE = 250; // 4 moves per second (double speed)

const port = process.env.PORT || 4000;

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

interface Player {
  id: string;
  username: string;
  color: string;
  roomId: string;
  ws: WebSocket;
}

interface Room {
  id: string;
  players: Record<string, Player>;
}

interface Point {
  x: number;
  y: number;
}

interface Worm {
  id: string;
  color: string;
  segments: Point[];
  direction: "up" | "down" | "left" | "right";
  alive: boolean;
  username: string;
  score: number;
  growPending: number;
}

interface GameState {
  worms: Record<string, Worm>;
  food: Point[];
  running: boolean;
  walls: Point[];
  bushes: Point[];
  christmasTree: Point;
}

const rooms: Record<string, Room> = {};
const gameStates: Record<string, GameState> = {};
const gameIntervals: Record<string, NodeJS.Timeout> = {};

function broadcastToRoom(roomId: string, type: string, data: unknown) {
  const room = rooms[roomId];
  if (!room) return;

  Object.values(room.players).forEach((player) => {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify({ type, data }));
    }
  });
}

function getOrCreateRoom(roomId: string): Room {
  if (!rooms[roomId]) {
    rooms[roomId] = { id: roomId, players: {} };
  }
  return rooms[roomId];
}

function isWall(x: number, y: number, state: GameState): boolean {
  return state.walls.some((wall) => wall.x === x && wall.y === y);
}

function isBush(x: number, y: number, state: GameState): boolean {
  return state.bushes.some((bush) => bush.x === x && bush.y === y);
}

function isCellOccupied(x: number, y: number, state: GameState): boolean {
  Object.values(state.worms).some((worm) =>
    worm.segments.some((seg) => seg.x === x && seg.y === y)
  );

  if (state.food.some((food) => food.x === x && food.y === y)) return true;

  if (isWall(x, y, state)) return true;

  if (isBush(x, y, state)) return true;

  return false;
}

function randomFreeCell(state: GameState): Point {
  let x, y;
  do {
    x = Math.floor(Math.random() * (BOARD_WIDTH - 2)) + 1;
    y = Math.floor(Math.random() * (BOARD_HEIGHT - 2)) + 1;
  } while (isCellOccupied(x, y, state));
  return { x, y };
}

function generateWalls(state: GameState) {
  state.walls = [];
  for (let x = 0; x < BOARD_WIDTH; x++) {
    state.walls.push({ x, y: 0 });
    state.walls.push({ x, y: BOARD_HEIGHT - 1 });
  }
  for (let y = 1; y < BOARD_HEIGHT - 1; y++) {
    state.walls.push({ x: 0, y });
    state.walls.push({ x: BOARD_WIDTH - 1, y });
  }
}

function generateFood(state: GameState) {
  state.food = [];
  for (let i = 0; i < FOOD_COUNT; i++) {
    state.food.push(randomFreeCell(state));
  }
}

function generateBushes(state: GameState) {
  state.bushes = [];
  for (let i = 0; i < BUSH_COUNT; i++) {
    state.bushes.push(randomFreeCell(state));
  }
}

function moveWorm(worm: Worm) {
  if (!worm.alive) return;

  const head = { ...worm.segments[0] };
  if (worm.direction === "up") head.y -= 1;
  if (worm.direction === "down") head.y += 1;
  if (worm.direction === "left") head.x -= 1;
  if (worm.direction === "right") head.x += 1;
  worm.segments.unshift(head);

  if (worm.growPending > 0) {
    worm.growPending--;
  } else {
    worm.segments.pop();
  }
}

function checkFoodEating(state: GameState, worm: Worm) {
  const head = worm.segments[0];
  for (let i = 0; i < state.food.length; i++) {
    const food = state.food[i];
    if (food.x === head.x && food.y === head.y) {
      worm.score++;
      worm.growPending++;

      state.food[i] = randomFreeCell(state);
    }
  }
}

function checkChristmasTreeEating(state: GameState, worm: Worm) {
  const head = worm.segments[0];
  const tree = state.christmasTree;
  if (head.x === tree.x && head.y === tree.y) {
    worm.score += 10;
    worm.growPending++;

    state.christmasTree = randomFreeCell(state);
  }
}

function checkCollisions(state: GameState, worm: Worm) {
  if (!worm.alive) return;

  const head = worm.segments[0];

  if (isWall(head.x, head.y, state)) {
    worm.alive = false;
    return;
  }

  if (isBush(head.x, head.y, state)) {
    worm.alive = false;
    return;
  }

  for (let i = 1; i < worm.segments.length; i++) {
    if (worm.segments[i].x === head.x && worm.segments[i].y === head.y) {
      worm.alive = false;
      return;
    }
  }

  for (const other of Object.values(state.worms)) {
    if (other.id !== worm.id && other.alive) {
      for (const seg of other.segments) {
        if (seg.x === head.x && seg.y === head.y) {
          worm.alive = false;
          return;
        }
      }
    }
  }
}

function startGameLoop(roomId: string) {
  if (gameIntervals[roomId]) return;

  gameIntervals[roomId] = setInterval(() => {
    const state = gameStates[roomId];
    if (!state) return;

    Object.values(state.worms).forEach((worm) => {
      moveWorm(worm);
      checkFoodEating(state, worm);
      checkChristmasTreeEating(state, worm);
      checkCollisions(state, worm);
    });
    broadcastToRoom(roomId, "game:state", state);
  }, TICK_RATE);
}

wss.on("connection", (ws) => {
  const id = Math.random().toString(36).slice(2) + Date.now();
  let playerRoomId: string | null = null;

  ws.on("message", (msg) => {
    let parsed: any;
    try {
      parsed = JSON.parse(msg.toString());
    } catch {
      return;
    }

    if (parsed.type === "player:join") {
      const { username, color, roomId } = parsed.data;
      playerRoomId = roomId;
      const room = getOrCreateRoom(roomId);
      const player: Player = { id, username, color, roomId, ws };
      room.players[id] = player;
      ws.send(
        JSON.stringify({
          type: "room:players",
          data: Object.values(room.players).map((p) => ({
            id: p.id,
            username: p.username,
            color: p.color,
          })),
        })
      );
      broadcastToRoom(
        roomId,
        "room:players",
        Object.values(room.players).map((p) => ({
          id: p.id,
          username: p.username,
          color: p.color,
        }))
      );
      if (!gameStates[roomId]) {
        const tempState = {
          worms: {},
          food: [],
          running: true,
          walls: [],
          bushes: [],
          christmasTree: { x: 0, y: 0 },
        };
        generateFood(tempState);
        generateWalls(tempState);
        generateBushes(tempState);
        tempState.christmasTree = randomFreeCell(tempState);
        gameStates[roomId] = tempState;
        startGameLoop(roomId);
      }
      gameStates[roomId].worms[id] = {
        id,
        color,
        segments: [
          { x: Math.floor(BOARD_WIDTH / 2), y: Math.floor(BOARD_HEIGHT / 2) },
          {
            x: Math.floor(BOARD_WIDTH / 2) - 1,
            y: Math.floor(BOARD_HEIGHT / 2),
          },
          {
            x: Math.floor(BOARD_WIDTH / 2) - 2,
            y: Math.floor(BOARD_HEIGHT / 2),
          },
        ],
        direction: "right",
        alive: true,
        username,
        score: 0,
        growPending: 0,
      };
    } else if (parsed.type === "worm:direction") {
      if (!playerRoomId) return;
      const worm = gameStates[playerRoomId]?.worms[id];
      if (!worm || !worm.alive) return;
      const dir = parsed.data;
      const opposites: Record<string, string> = {
        up: "down",
        down: "up",
        left: "right",
        right: "left",
      };
      if (dir !== opposites[worm.direction]) {
        worm.direction = dir;
      }
    }
  });
  ws.on("close", () => {
    if (!playerRoomId) return;
    const room = rooms[playerRoomId];
    if (room && room.players[id]) {
      delete room.players[id];
      broadcastToRoom(
        playerRoomId,
        "room:players",
        Object.values(room.players).map((p) => ({
          id: p.id,
          username: p.username,
          color: p.color,
        }))
      );
      if (Object.keys(room.players).length === 0) {
        delete rooms[playerRoomId];
      }
    }
    if (gameStates[playerRoomId] && gameStates[playerRoomId].worms[id]) {
      delete gameStates[playerRoomId].worms[id];
    }
  });
});

app.get("/", (_req, res) => {
  res.send("Multiplayer Worm Game Server Running");
});

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
