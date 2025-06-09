# Project Requirements Document: Multiplayer Worm Web Game

## Overview

The Multiplayer Worm Game is a real-time, browser-based game where players control worms competing to grow the longest by consuming food pellets while avoiding collisions with other worms, walls, or themselves. Built using HTML5, TypeScript, and raw WebSocket for seamless multiplayer interaction, the game offers a fast-paced, competitive experience with vibrant visuals and smooth controls.

## Key Features

- **Multiplayer Mode:** Up to 8 players can join a single game session (room), each controlling a uniquely colored worm. Players compete in real-time on a shared game board.
- **Objective:** Eat food pellets to grow longer and earn points. The game ends for a player when their worm collides with another worm, itself, or the arena boundaries. Players can rejoin by entering the room again.
- **Dynamic Arena:** A rectangular game board with randomly spawning food pellets. Fixed walls are present from the start for increased challenge. Bushes and a special Christmas tree may also appear.
- **Controls:** Simple keyboard controls with arrow keys for intuitive navigation.
- **Real-Time Interaction:** The game uses only raw WebSocket (no Socket.IO) for low-latency communication and smooth worm movement and collision detection across all players.
- **Scoring & Leaderboard:** Points are awarded for eating food (+1) and special items like the Christmas tree (+10). The in-game UI displays the current score for each player in the room. (No global leaderboard, only per-room.)
- **Customization:** Players can choose worm colors and enter a username before joining a game.
- **Responsive Design:** The game adapts to different screen sizes, supporting both desktop and mobile browsers.

## Gameplay Mechanics

- **Worm Movement:** Each worm moves continuously in the direction it's facing. Players adjust the direction using input controls. Movement is grid-based and turns are instant (no smooth turning).
- **Food & Growth:** Regular food pellets spawn randomly. Eating food adds one point to the score and grows the worm by one segment. Eating the Christmas tree adds 10 points and grows the worm by one segment.
- **Collisions:** A worm dies upon hitting another worm, its own body, a wall, or a bush. The player's session ends, but they may rejoin the room. The game continues for other players.
- **Special Items:** A Christmas tree appears on the board. Eating it gives a large score bonus (+10) and plays a special sound effect.

## Technical Details

- **Frontend:** Built with HTML5 Canvas for rendering and React for UI components (e.g., menus, player list, score display). No CSS frameworks are used; all styles are custom CSS.
- **Backend:** Node.js server with Express and the `ws` package for WebSocket. Handles real-time game state updates, player connections, and collision detection.
- **Game Loop:** Runs at a fixed tick rate (4 moves per second). All game logic and validation are server-side.
- **Scalability:** The server supports multiple game rooms, allowing many players across different sessions.
- **Cross-Browser Compatibility:** Tested on Chrome, Firefox, Safari, and Edge, with mobile support for iOS and Android browsers.

## Visual & Audio Design

- **Graphics:** Minimalist 2D visuals with clear colors for each worm. Dead worms are shown at 10% transparency. The Christmas tree and other items have distinct shapes and colors.
- **Sound:** Sound effects play when eating food, colliding, or eating the Christmas tree ("hohoho"). No background music.
- **UI:** Clean interface with a join menu, color/username selection, and in-game display of players and scores.
