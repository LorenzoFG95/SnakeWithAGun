# Snake With A Gun

A 3D Snake game with a twist - your snake has a gun! Navigate through the grid, collect apples, battle enemies, and face off against mini-bosses in this action-packed snake game.

## Game Features

- **3D Snake Movement**: Control a snake in a 3D environment using WASD or arrow keys
- **Apple Collection**: Grow your snake by collecting apples
- **Shooting Mechanism**: Shoot bullets to destroy apples and enemies for points
- **Weapon Power-ups**: Collect power-ups to enhance your shooting capabilities
  - **Rapid Fire**: Increased firing rate
  - **Spread Shot**: Multiple bullets in a spread pattern
  - **Piercing Shot**: Bullets pass through multiple targets
- **Enemy System**: Face off against various enemy types
  - **Basic Enemies**: Move in predictable patterns
  - **Aggressive Enemies**: Chase the snake
  - **Mini-Boss**: Powerful enemies with special attacks
- **Score System**: 
  - Points for collecting apples
  - Bonus points for shooting targets
  - Multiplier system for consecutive hits
- **Game Over Detection**: Collision detection for walls, enemies, and self
- **Restart Functionality**: Restart the game after game over

## Controls

- **Movement**: WASD or Arrow keys
- **Shoot**: Spacebar
- **Restart**: Press R key or click "Play Again" button after game over

## Technical Architecture

The game follows SOLID principles with a modular architecture:

### Core Components

- **Game**: Main game controller that manages the game loop and state
- **Snake**: Handles snake creation, movement, and collision detection
- **Apple**: Manages apple creation and placement
- **Bullet**: Controls bullet creation, movement, and collision detection
- **PowerUp**: Manages power-up spawning and effects
- **Enemy**: Handles enemy behavior and interactions
- **MiniBoss**: Controls mini-boss mechanics and patterns
- **Renderer**: Handles the 3D rendering using Three.js
- **Input**: Manages user input for game controls
- **Score**: Tracks and manages scoring system

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
│   ├── powerup.js      # Power-up system
│   ├── enemy.js        # Enemy classes
│   ├── miniboss.js     # Mini-boss mechanics
│   ├── renderer.js     # 3D rendering setup
│   ├── input.js        # Input handling
│   └── score.js        # Scoring system
└── README.md           # This documentation file
```

## Future Enhancements

- Additional power-up types
- More enemy varieties
- Multiple boss battles
- Level progression system
- Online leaderboards
- Mobile support
- Sound effects and music

---

This README will be updated with each refactoring iteration to reflect changes in the game's architecture and functionality.