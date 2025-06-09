# Multiplayer Worm Game Protocol

This document describes all WebSocket messages exchanged between the frontend (client) and backend (server), including their meaning, fields, and types.

## General Structure

All messages are JSON objects with the following structure:

```js
{
  "type": string, // Message type identifier
  "data": any     // Message payload (type depends on message)
}
```

---

## Client → Server Messages

### player:join

Sent by the client to join a room and register a player.

```js
{
  type: "player:join",
  data: {
    username: string, // Player's display name
    color: string,    // Worm color (CSS hex or rgb)
    roomId: string    // Room identifier
  }
}
```

---

### worm:direction

Sent by the client when the player changes direction.

```js
{
  type: "worm:direction",
  data: "up" | "down" | "left" | "right" // New direction
}
```

---

## Server → Client Messages

### room:players

Sent by the server to update the list of players in the room.

```js
{
  type: "room:players",
  data: Array<{
    id: string,        // Unique player ID
    username: string,  // Player's display name
    color: string      // Worm color
  }>
}
```

---

### game:state

Sent by the server to update the full game state (sent every tick).

```js
{
  type: "game:state",
  data: {
    worms: Record<string, {
      id: string,
      color: string,
      segments: Array<{ x: number, y: number }>,
      direction: "up" | "down" | "left" | "right",
      alive: boolean,
      username: string,
      score: number // The player's current score (number of food eaten + bonuses)
    }>,
    food: Array<{ x: number, y: number }>,
    walls: Array<{ x: number, y: number }>,
    bushes: Array<{ x: number, y: number }>,
    christmasTree: { x: number, y: number },
    running: boolean
  }
}
```

---

## Notes

- All messages are sent as JSON strings over WebSocket.
- The server assigns a unique `id` to each player upon connection.
- The client should use the `id` field from `room:players` to identify itself in the game state.
- The `score` field in each worm object represents the player's current score, which increases when food or special items are eaten.
- The protocol is versionless and may be extended as needed.
