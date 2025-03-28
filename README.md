# Snake With A Gun

A 3D Snake game with a twist - your snake has a gun! Navigate through the grid, collect apples, and shoot for bonus points.

## Game Features

- **3D Snake Movement**: Control a snake in a 3D environment using WASD or arrow keys
- **Apple Collection**: Grow your snake by collecting apples
- **Shooting Mechanism**: Shoot bullets to destroy apples for bonus points
- **Score Tracking**: Keep track of your score as you play
- **Game Over Detection**: Collision detection for walls and self
- **Restart Functionality**: Restart the game after game over

## Controls

- **Movement**: WASD or Arrow keys
- **Shoot**: Spacebar
- **Restart**: Click "Play Again" button after game over

## Technical Architecture

The game follows SOLID principles with a modular architecture:

### Core Components

- **Game**: Main game controller that manages the game loop and state
- **Snake**: Handles snake creation, movement, and collision detection
- **Apple**: Manages apple creation and placement
- **Bullet**: Controls bullet creation, movement, and collision detection
- **Renderer**: Handles the 3D rendering using Three.js
- **Input**: Manages user input for game controls

### File Structure

```
/
├── index.html          # Main HTML file with game UI
├── src/
│   ├── main.js         # Entry point that initializes the game
│   ├── constants.js    # Game constants and configuration
│   ├── game.js         # Game controller
│   ├── snake.js        # Snake class
│   ├── apple.js        # Apple class
│   ├── bullet.js       # Bullet class
│   ├── renderer.js     # 3D rendering setup
│   └── input.js        # Input handling
└── README.md           # This documentation file
```

## Future Enhancements

- Power-ups
- Multiple levels
- High score tracking
- Mobile support
- Sound effects

---

This README will be updated with each refactoring iteration to reflect changes in the game's architecture and functionality.