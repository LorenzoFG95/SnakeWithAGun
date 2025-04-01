import * as THREE from 'three';

// Game constants
let GRID_SIZE = 20;
const CELL_SIZE = 1;
const INITIAL_MOVE_INTERVAL = 150; // milliseconds between moves
const SPEED_INCREASE_FACTOR = 0.85; // decrease interval by 5% per apple
const MIN_MOVE_INTERVAL = 50; // minimum interval to prevent the game from becoming too fast
// Constants for after tutorial completion
const POST_TUTORIAL_GRID_SIZE = 30; // Larger grid after tutorial
 // Level system constants
const LEVEL_THRESHOLDS = [50, 200, 500, 1000, 2000]; // Points needed to complete each level
const COLORS = {
    background: 0x222222,
    snake: 0x00ff00,
    snakeHead: 0x00cc00,
    apple: 0xff0000,
    bullet: 0xffff00,
    enemy: 0x0000ff,
    miniBoss: 0x800080, // Purple color for mini boss
    appleEater: 0xff8800, // Orange color for apple-eating enemy
    appleEaterBoss: 0xff00ff, // Magenta color for transformed apple-eater boss
    tankEnemy: 0x663300, // Brown color for tank enemy
    healthBar: 0xff0000,
    healthBarBackground: 0x555555,
    powerUpFireRate: 0xff9900,
    powerUpDamage: 0xff0000,
    powerUpMultiShot: 0x00ffff
};

// Game variables
let scene, camera, renderer;
let snake = [];
let powerUps = [];
let powerUpEffects = {
    fireRate: 1,
    damage: 1,
    multiShot: 1
};
let floatingTexts = []; // Array to store active floating text elements
const POWER_UP_SPAWN_INTERVAL = 20000; // milliseconds between power-up spawns (increased to make them rarer)
let lastPowerUpSpawnTime = 0;
let direction = new THREE.Vector3(1, 0, 0);
let nextDirection = new THREE.Vector3(1, 0, 0);
let apple;
let score = 0;
let highScore = 0; // Track highest score
let applesEaten = 0; // Track apples eaten
let enemiesDefeated = 0; // Track enemies defeated
let gameStartTime = 0; // Track game start time
let gameTime = 0; // Track total game time
let lastMoveTime = 0;
let gameActive = true;
let isPaused = false; // New variable for pause state
let bullets = [];
let enemies = [];
let lastShotTime = 0;
let lastEnemySpawnTime = 0;
let currentMoveInterval = INITIAL_MOVE_INTERVAL; // track current speed
let isTutorialBossFight = false; // Track if tutorial boss fight is active
const SHOT_COOLDOWN = 500; // milliseconds between shots
const ENEMY_SPAWN_INTERVAL = 5000; // milliseconds between enemy spawns
const ENEMY_SIZE = 1.5; // enemies are bigger than snake segments
let ENEMY_HEALTH = 3; // number of hits to kill an enemy (can change after tutorial)
const ENEMY_SPEED = 0.03; // enemy movement speed

// Level system variables
let currentLevel = 0; // 0 = tutorial, 1 = first level, etc.
let levelScore = 0; // Score accumulated in the current level
let bossSpawned = false; // Flag to track if the boss for the current level has been spawned

// Tutorial state
let tutorialCompleted = false;
let firstBossDefeated = false;

// Mini boss constants
const MINI_BOSS_SIZE = ENEMY_SIZE * 3;
const MINI_BOSS_HEALTH = ENEMY_HEALTH * 6;
const MINI_BOSS_SPEED = ENEMY_SPEED * 0.5;

// Apple eater constants
const APPLE_EATER_CHANCE = 0.1; // 10% chance to spawn an apple-eating enemy
const APPLE_EATER_SIZE = ENEMY_SIZE * 0.8; // Apple eaters are slightly smaller
const APPLE_EATER_SPEED = ENEMY_SPEED * 1.2; // Apple eaters are slightly faster
const APPLE_EATER_BOSS_SIZE = MINI_BOSS_SIZE * 0.8; // Transformed boss is smaller than mini boss
const APPLE_EATER_BOSS_HEALTH = MINI_BOSS_HEALTH * 0.7; // Transformed boss has less health than mini boss

// Tank enemy constants
const TANK_ENEMY_CHANCE = 0.08; // 8% chance to spawn a tank enemy
const TANK_ENEMY_SIZE = ENEMY_SIZE * 1.5; // Tank enemies are larger
const TANK_ENEMY_HEALTH = ENEMY_HEALTH * 5; // Tank enemies have 5x health


// DOM elements
const scoreElement = document.getElementById('score');
const levelInfoElement = document.getElementById('levelInfo');
const progressBarElement = document.getElementById('progressBar');
const gameOverElement = document.getElementById('gameOver');
const finalScoreElement = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');
const pauseOverlay = document.getElementById('pauseOverlay'); // Pause overlay element
const tutorialOverlay = document.getElementById('tutorialOverlay'); // Tutorial completion overlay

// Initialize the game
init();
animate();

function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.background);
    
    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 15, 15);
    camera.lookAt(0, 0, 0);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    
    // Add grid for reference
    const gridHelper = new THREE.GridHelper(GRID_SIZE, GRID_SIZE);
    scene.add(gridHelper);
    
    // Create initial snake
    createSnake();
    
    // Create first apple
    createApple();
    
    // Reset enemy spawn time and game start time
    lastEnemySpawnTime = Date.now();
    gameStartTime = Date.now();
    
    // Reset game statistics
    applesEaten = 0;
    enemiesDefeated = 0;
    
    // Reset tutorial state
    tutorialCompleted = false;
    firstBossDefeated = false;
    isTutorialBossFight = false;
    GRID_SIZE = 20; // Reset grid size to initial value
    ENEMY_HEALTH = 3; // Reset enemy health to initial value
    
    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    restartButton.addEventListener('click', restartGame);
    
    // Add mobile control event listeners
    setupMobileControls();
}

function createSnake() {
    // Clear existing snake
    snake.forEach(segment => scene.remove(segment.mesh));
    snake = [];
    
    // Create head (sphere)
    const headGeometry = new THREE.SphereGeometry(CELL_SIZE / 2, 16, 16);
    const headMaterial = new THREE.MeshBasicMaterial({ color: COLORS.snakeHead });
    const headMesh = new THREE.Mesh(headGeometry, headMaterial);
    headMesh.position.set(0, 0, 0);
    scene.add(headMesh);
    
    snake.push({
        mesh: headMesh,
        position: new THREE.Vector3(0, 0, 0)
    });
    
    // Create initial body segments (cubes)
    for (let i = 1; i < 3; i++) {
        addBodySegment(new THREE.Vector3(-i * CELL_SIZE, 0, 0));
    }
}

function addBodySegment(position) {
    const bodyGeometry = new THREE.BoxGeometry(CELL_SIZE, CELL_SIZE, CELL_SIZE);
    const bodyMaterial = new THREE.MeshBasicMaterial({ color: COLORS.snake });
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.position.copy(position);
    scene.add(bodyMesh);
    
    snake.push({
        mesh: bodyMesh,
        position: position.clone()
    });
}

function createApple() {
    // Remove existing apple if it exists
    if (apple) {
        scene.remove(apple.mesh);
    }
    
    // Create new apple (sphere)
    const appleGeometry = new THREE.SphereGeometry(CELL_SIZE / 2, 16, 16);
    const appleMaterial = new THREE.MeshBasicMaterial({ color: COLORS.apple });
    const appleMesh = new THREE.Mesh(appleGeometry, appleMaterial);
    
    // Place apple at random position
    let position;
    do {
        position = new THREE.Vector3(
            Math.floor(Math.random() * GRID_SIZE) - GRID_SIZE / 2,
            0,
            Math.floor(Math.random() * GRID_SIZE) - GRID_SIZE / 2
        );
    } while (isPositionOccupied(position));
    
    appleMesh.position.copy(position);
    scene.add(appleMesh);
    
    apple = {
        mesh: appleMesh,
        position: position
    };
}

function isPositionOccupied(position) {
    return snake.some(segment => 
        segment.position.x === position.x && 
        segment.position.z === position.z
    );
}

function moveSnake() {
    if (!gameActive) return;
    
    // Update direction
    direction.copy(nextDirection);
    
    // Calculate new head position
    const head = snake[0];
    const newHeadPosition = head.position.clone().add(direction.clone().multiplyScalar(CELL_SIZE));
    
    // Check for wall collision
    if (
        newHeadPosition.x < -GRID_SIZE / 2 || 
        newHeadPosition.x >= GRID_SIZE / 2 || 
        newHeadPosition.z < -GRID_SIZE / 2 || 
        newHeadPosition.z >= GRID_SIZE / 2
    ) {
        gameOver();
        return;
    }
    
    // Check for self collision (except with the tail that's about to move)
    for (let i = 0; i < snake.length - 1; i++) {
        if (
            snake[i].position.x === newHeadPosition.x && 
            snake[i].position.z === newHeadPosition.z
        ) {
            gameOver();
            return;
        }
    }
    
    // Check for enemy collision
    for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        const distance = Math.sqrt(
            Math.pow(newHeadPosition.x - enemy.position.x, 2) +
            Math.pow(newHeadPosition.z - enemy.position.z, 2)
        );
        
        // If distance is less than the sum of radii, collision occurred
        const enemySize = enemy.isMiniBoss ? MINI_BOSS_SIZE : ENEMY_SIZE;
        if (distance < (CELL_SIZE / 2 + enemySize / 2)) {
            gameOver();
            return;
        }
    }
    
    // Move body segments (from tail to head)
    for (let i = snake.length - 1; i > 0; i--) {
        snake[i].position.copy(snake[i - 1].position);
        snake[i].mesh.position.copy(snake[i].position);
    }
    
    // Move head
    head.position.copy(newHeadPosition);
    head.mesh.position.copy(head.position);
    
    // Check for apple collision
    if (
        head.position.x === apple.position.x && 
        head.position.z === apple.position.z
    ) {
        // Calculate points based on speed - faster speed (lower interval) means more points
        const speedFactor = INITIAL_MOVE_INTERVAL / currentMoveInterval;
        const basePoints = 10;
        const speedBonus = Math.floor(basePoints * (speedFactor - 1));
        const totalPoints = basePoints + speedBonus;
        
        // Increase score and apples eaten counter
        score += totalPoints;
        levelScore += totalPoints;
        applesEaten++;
        scoreElement.textContent = `Score: ${score}`;
        console.log(`Apple eaten! Speed factor: ${speedFactor.toFixed(2)}, Points earned: ${totalPoints}`);
        
        // Show floating text
        createFloatingText(`+${totalPoints}`, '#00ff00', apple.position);
        
        // Update level progress
        updateLevelProgress();
        
        // Add new body segment
        const tail = snake[snake.length - 1];
        addBodySegment(tail.position.clone());
        
        // Increase speed (decrease interval)
        currentMoveInterval = Math.max(MIN_MOVE_INTERVAL, currentMoveInterval * SPEED_INCREASE_FACTOR);
        console.log(`Speed increased! Current interval: ${currentMoveInterval}ms`);
        
        // Create new apple
        createApple();
    }
}

function shootBullet() {
    if (!gameActive || isPaused) return;
    
    const currentTime = Date.now();
    if (currentTime - lastShotTime < SHOT_COOLDOWN / powerUpEffects.fireRate) return;
    
    lastShotTime = currentTime;
    
    const head = snake[0];
    
    // Create bullets based on multiShot power-up
    const bulletCount = powerUpEffects.multiShot;
    const directions = [];
    
    if (bulletCount === 1) {
        directions.push(direction.clone());
    } else {
        // Spread bullets in a fan pattern
        const maxSpreadAngle = Math.PI / 3; // 60 degrees total spread
        const angleStep = maxSpreadAngle / (bulletCount - 1);
        const startAngle = -maxSpreadAngle / 2;
        
        for (let i = 0; i < bulletCount; i++) {
            const angle = startAngle + i * angleStep;
            const dir = direction.clone().applyAxisAngle(
                new THREE.Vector3(0, 1, 0),
                angle
            );
            directions.push(dir);
        }
    }
    
    directions.forEach(dir => {
        // Create bullet (sphere)
        const bulletGeometry = new THREE.SphereGeometry(CELL_SIZE / 4, 8, 8);
        const bulletMaterial = new THREE.MeshBasicMaterial({ color: COLORS.bullet });
        const bulletMesh = new THREE.Mesh(bulletGeometry, bulletMaterial);
        
        // Position bullet at snake head
        bulletMesh.position.copy(head.position);
        scene.add(bulletMesh);
        
        bullets.push({
            mesh: bulletMesh,
            position: head.position.clone(),
            direction: dir,
            speed: 0.3,
            damage: powerUpEffects.damage
        });
    });
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        // Move bullet
        bullet.position.add(bullet.direction.clone().multiplyScalar(bullet.speed));
        bullet.mesh.position.copy(bullet.position);
        
        // Check if bullet is out of bounds
        if (
            bullet.position.x < -GRID_SIZE / 2 || 
            bullet.position.x >= GRID_SIZE / 2 || 
            bullet.position.z < -GRID_SIZE / 2 || 
            bullet.position.z >= GRID_SIZE / 2
        ) {
            scene.remove(bullet.mesh);
            bullets.splice(i, 1);
            continue;
        }
        
        // Check for enemy collisions
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            
            const enemySize = enemy.isMiniBoss ? MINI_BOSS_SIZE : ENEMY_SIZE;
            if (bullet.position.distanceTo(enemy.position) < enemySize / 2) {
                // Hit enemy
                enemy.health -= bullet.damage;
                enemy.healthBar.scale.x = enemy.health / ENEMY_HEALTH;
                
                // Show floating damage text
                createFloatingText(`-${bullet.damage}`, '#ff0000', bullet.position);
                
                // Remove bullet
                scene.remove(bullet.mesh);
                bullets.splice(i, 1);
                
                // Check if enemy is dead
                if (enemy.health <= 0) {
                    scene.remove(enemy.mesh);
                    scene.remove(enemy.healthBarBackground);
                    scene.remove(enemy.healthBar);
                    
                    // Increment enemies defeated counter
                    enemiesDefeated++;
                    
                    // Award bonus points and spawn a single power-up for mini boss
                    if (enemy.isMiniBoss) {
                        const points = 50;
                        score += points;
                        levelScore += points;
                        // Show floating text
                        createFloatingText(`+${points}`, '#00ff00', enemy.position);
                        // Spawn a single power-up at the boss's position
                        createPowerUp(enemy.position)
                        
                        // Check if this is the first mini-boss defeated (tutorial)
                        if (!tutorialCompleted && !firstBossDefeated) {
                            firstBossDefeated = true;
                            // Pause the game and show tutorial completion message
                            showTutorialCompletion();
                        } else if (currentLevel > 0) {
                            // Advance to the next level after defeating a boss
                            currentLevel++;
                            levelScore = 0;
                            bossSpawned = false;
                            
                            // Update level info
                            levelInfoElement.textContent = `Level: ${currentLevel}`;
                            progressBarElement.style.width = '0%';
                            
                            // Increase enemy health for the new level
                            ENEMY_HEALTH = Math.ceil(ENEMY_HEALTH * 1.5);
                        }
                    } else {
                        const points = 10;
                        score += points;
                        levelScore += points;
                        // Show floating text
                        createFloatingText(`+${points}`, '#00ff00', enemy.position);
                        
                        // Update level progress
                        updateLevelProgress();
                    }
                    
                    enemies.splice(j, 1);
                    scoreElement.textContent = `Score: ${score}`;
                }
                
                break;
            }
        }
    }
}

function handleKeyDown(event) {
    // Handle pause toggle with 'p' key
    if (event.key === 'p' || event.key === 'P') {
        togglePause();
        return;
    }
    
    // If game is paused, don't process other inputs
    if (isPaused) return;
    
    // Handle direction changes
    switch (event.key) {
        case 'ArrowUp':
        case 'w':
            if (direction.z !== 1) { // Not moving backward
                nextDirection.set(0, 0, -1);
            }
            break;
        case 'ArrowDown':
        case 's':
            if (direction.z !== -1) { // Not moving forward
                nextDirection.set(0, 0, 1);
            }
            break;
        case 'ArrowLeft':
        case 'a':
            if (direction.x !== 1) { // Not moving right
                nextDirection.set(-1, 0, 0);
            }
            break;
        case 'ArrowRight':
        case 'd':
            if (direction.x !== -1) { // Not moving left
                nextDirection.set(1, 0, 0);
            }
            break;
        case ' ': // Spacebar to shoot
            shootBullet();
            break;
        case 'r': // Press R to restart
        case 'R':
            restartGame();
            break;
    }
}

function handleResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function gameOver() {
    gameActive = false;
    
    // Calculate total game time in seconds
    gameTime = Math.floor((Date.now() - gameStartTime) / 1000);
    
    // Update high score if current score is higher
    if (score > highScore) {
        highScore = score;
    }
    
    // Update final score element
    finalScoreElement.textContent = score;
    
    // Update game over screen with additional information
    document.getElementById('highScore').textContent = highScore;
    document.getElementById('timePlayed').textContent = formatTime(gameTime);
    document.getElementById('applesEaten').textContent = applesEaten;
    document.getElementById('enemiesDefeated').textContent = enemiesDefeated;
    
    // Show game over screen
    gameOverElement.style.display = 'block';
}

// Helper function to format time as MM:SS
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function restartGame() {
    // Reset game state
    score = 0;
    levelScore = 0;
    currentLevel = 0;
    bossSpawned = false;
    scoreElement.textContent = `Score: ${score}`;
    levelInfoElement.textContent = `Level: Tutorial`;
    progressBarElement.style.width = '0%';
    gameOverElement.style.display = 'none';
    tutorialOverlay.style.display = 'none';
    direction = new THREE.Vector3(1, 0, 0);
    nextDirection = new THREE.Vector3(1, 0, 0);
    gameActive = true;
    isPaused = false;
    currentMoveInterval = INITIAL_MOVE_INTERVAL; // Reset speed to initial value
    
    // Reset game statistics
    applesEaten = 0;
    enemiesDefeated = 0;
    gameStartTime = Date.now();
    
    // Reset tutorial state
    tutorialCompleted = false;
    firstBossDefeated = false;
    isTutorialBossFight = false;
    
    // Reset grid size and enemy health
    GRID_SIZE = 20;
    ENEMY_HEALTH = 3;
    
    // Remove old grid helper
    scene.children.forEach(child => {
        if (child instanceof THREE.GridHelper) {
            scene.remove(child);
        }
    });
    
    // Add new grid
    const gridHelper = new THREE.GridHelper(GRID_SIZE, GRID_SIZE);
    scene.add(gridHelper);
    
    // Reset camera position
    camera.position.set(0, 15, 15);
    camera.lookAt(0, 0, 0);
    
    // Clear floating texts
    floatingTexts.forEach(text => scene.remove(text.mesh));
    floatingTexts = [];
    
    // Reset power-up effects
    powerUpEffects = {
        fireRate: 1,
        damage: 1,
        multiShot: 1
    };
    
    // Clear bullets
    bullets.forEach(bullet => scene.remove(bullet.mesh));
    bullets = [];
    
    // Clear enemies
    enemies.forEach(enemy => {
        scene.remove(enemy.mesh);
        scene.remove(enemy.healthBarBackground);
        scene.remove(enemy.healthBar);
    });
    enemies = [];
    
    // Clear power-ups
    powerUps.forEach(powerUp => scene.remove(powerUp.mesh));
    powerUps = [];
    
    // Reset enemy spawn time
    lastEnemySpawnTime = Date.now();
    lastPowerUpSpawnTime = Date.now();
    
    // Recreate snake and apple
    createSnake();
    createApple();
}

function animate(time) {
    requestAnimationFrame(animate);
    
    // If game is paused, only render the scene and return
    if (isPaused) {
        renderer.render(scene, camera);
        return;
    }
    
    // Move snake at intervals that get faster as the game progresses
    if (gameActive && time - lastMoveTime > currentMoveInterval) {
        moveSnake();
        lastMoveTime = time;
    }
    
    // Update bullets
    updateBullets();
    
    // Spawn enemies at intervals
    const currentTime = Date.now();
    if (gameActive && currentTime - lastEnemySpawnTime > ENEMY_SPAWN_INTERVAL) {
        // Only spawn regular enemies if we haven't reached the boss spawn threshold
        if (!bossSpawned) {
            createEnemy();
        }
        lastEnemySpawnTime = currentTime;
    }
    
    // Spawn power-ups at intervals
    if (gameActive && currentTime - lastPowerUpSpawnTime > POWER_UP_SPAWN_INTERVAL) {
        createPowerUp();
        lastPowerUpSpawnTime = currentTime;
    }
    
    // Update enemies
    updateEnemies();
    
    // Check for power-up collisions
    checkPowerUpCollisions();
    
    // Update floating texts
    updateFloatingTexts();
    
    // Render scene
    renderer.render(scene, camera);
}

function createEnemy() {
    // Skip enemy creation during tutorial boss fight
    if (isTutorialBossFight) return;
    
    // Only spawn regular enemies through this function
    // Mini bosses are spawned through createMiniBoss function
    const isMiniBoss = false;
    
    // Determine enemy type based on random chance
    // Only allow special enemies after tutorial is completed
    const isAppleEater = tutorialCompleted && Math.random() < APPLE_EATER_CHANCE;
    const isTankEnemy = tutorialCompleted && !isAppleEater && Math.random() < TANK_ENEMY_CHANCE;
    
    // Set enemy properties based on current level and type
    let size, health, color, enemyGeometry;
    
    if (isTankEnemy) {
        // Tank enemy properties
        size = TANK_ENEMY_SIZE;
        health = TANK_ENEMY_HEALTH * (currentLevel + 1); // Increase health with level
        color = COLORS.tankEnemy;
        // Use a cube with different dimensions for tank enemies to make them look more like a tank
        enemyGeometry = new THREE.BoxGeometry(size, size * 0.8, size * 1.2);
    } else if (isAppleEater) {
        // Apple eater properties
        size = APPLE_EATER_SIZE;
        health = ENEMY_HEALTH * (currentLevel + 1);
        color = COLORS.appleEater;
        // Use sphere geometry for apple eaters to distinguish them
        enemyGeometry = new THREE.SphereGeometry(size, 16, 16);
    } else {
        // Regular enemy properties
        size = ENEMY_SIZE;
        health = ENEMY_HEALTH * (currentLevel + 1);
        color = COLORS.enemy;
        enemyGeometry = new THREE.BoxGeometry(size, size, size);
    }
    
    const enemyMaterial = new THREE.MeshBasicMaterial({ color: color });
    const enemyMesh = new THREE.Mesh(enemyGeometry, enemyMaterial);
    
    // Place enemy at random position
    let position;
    do {
        position = new THREE.Vector3(
            Math.floor(Math.random() * GRID_SIZE) - GRID_SIZE / 2,
            0,
            Math.floor(Math.random() * GRID_SIZE) - GRID_SIZE / 2
        );
    } while (isPositionOccupied(position) || isPositionTooCloseToSnake(position));
    
    enemyMesh.position.copy(position);
    scene.add(enemyMesh);
    
    // Create health bar background - make it wider for tank enemies to show their higher health
    const healthBarWidth = isTankEnemy ? size * 1.5 : size;
    const healthBarBackgroundGeometry = new THREE.BoxGeometry(healthBarWidth, 0.2, 0.2);
    const healthBarBackgroundMaterial = new THREE.MeshBasicMaterial({ color: COLORS.healthBarBackground });
    const healthBarBackground = new THREE.Mesh(healthBarBackgroundGeometry, healthBarBackgroundMaterial);
    healthBarBackground.position.set(position.x, size, position.z);
    scene.add(healthBarBackground);
    
    // Create health bar
    const healthBarGeometry = new THREE.BoxGeometry(healthBarWidth, 0.2, 0.2);
    const healthBarMaterial = new THREE.MeshBasicMaterial({ color: COLORS.healthBar });
    const healthBar = new THREE.Mesh(healthBarGeometry, healthBarMaterial);
    healthBar.position.set(position.x, size, position.z);
    scene.add(healthBar);
    
    // Add enemy to array
    enemies.push({
        mesh: enemyMesh,
        position: position,
        health: health,
        maxHealth: health,
        healthBarBackground: healthBarBackground,
        healthBar: healthBar,
        isMiniBoss: isMiniBoss,
        isAppleEater: isAppleEater,
        isTankEnemy: isTankEnemy, // New property to identify tank enemies
        hasEatenApple: false, // Track if this apple eater has eaten an apple
        direction: new THREE.Vector3(
            Math.random() * 2 - 1,
            0,
            Math.random() * 2 - 1
        ).normalize()
    });}


function isPositionTooCloseToSnake(position) {
    const minDistance = GRID_SIZE / 4; // Minimum safe distance from snake
    
    for (let i = 0; i < snake.length; i++) {
        const distance = Math.sqrt(
            Math.pow(position.x - snake[i].position.x, 2) +
            Math.pow(position.z - snake[i].position.z, 2)
        );
        
        if (distance < minDistance) {
            return true;
        }
    }
    
    return false;
}

function updateEnemies() {
    enemies.forEach(enemy => {
        // Skip movement for tank enemies as they are stationary
        if (!enemy.isTankEnemy) {
            let targetPosition;
            
            // Determine target based on enemy type
            if (enemy.isAppleEater && !enemy.hasEatenApple) {
                // Apple eaters target the apple
                targetPosition = apple.position;
            } else {
                // Regular enemies and transformed apple eaters target the snake head
                targetPosition = snake[0].position;
            }
            
            // Move enemy towards target
            const direction = new THREE.Vector3().subVectors(
                targetPosition,
                enemy.position
            ).normalize();
            
            // Determine speed based on enemy type
            let speed;
            if (enemy.isMiniBoss) {
                speed = MINI_BOSS_SPEED;
            } else if (enemy.isAppleEater && !enemy.hasEatenApple) {
                speed = APPLE_EATER_SPEED;
            } else {
                speed = ENEMY_SPEED;
            }
            
            enemy.position.add(direction.multiplyScalar(speed));
            enemy.mesh.position.copy(enemy.position);
            
            // Check if apple eater has reached the apple
            if (enemy.isAppleEater && !enemy.hasEatenApple) {
                const distanceToApple = enemy.position.distanceTo(apple.position);
                if (distanceToApple < CELL_SIZE / 2 + APPLE_EATER_SIZE / 2) {
                    // Apple eater has reached the apple
                    transformAppleEater(enemy);
                    // Create a new apple
                    createApple();
                }
            }
        }
        
        // Update health bar position - adjust height based on enemy size
        const barHeight = enemy.isMiniBoss ? MINI_BOSS_SIZE : 
                         (enemy.isAppleEater && enemy.hasEatenApple) ? APPLE_EATER_BOSS_SIZE : 
                         enemy.isAppleEater ? APPLE_EATER_SIZE : 
                         enemy.isTankEnemy ? TANK_ENEMY_SIZE : ENEMY_SIZE;
        
        enemy.healthBarBackground.position.set(
            enemy.position.x,
            enemy.position.y + barHeight,
            enemy.position.z
        );
        enemy.healthBar.position.set(
            enemy.position.x,
            enemy.position.y + barHeight,
            enemy.position.z
        );
    });
}

function transformAppleEater(enemy) {
    // Mark as having eaten an apple
    enemy.hasEatenApple = true;
    
    // Remove old mesh
    scene.remove(enemy.mesh);
    
    // Create new larger mesh with boss appearance
    const bossGeometry = new THREE.SphereGeometry(APPLE_EATER_BOSS_SIZE, 16, 16);
    const bossMaterial = new THREE.MeshBasicMaterial({ color: COLORS.appleEaterBoss });
    const bossMesh = new THREE.Mesh(bossGeometry, bossMaterial);
    bossMesh.position.copy(enemy.position);
    scene.add(bossMesh);
    
    // Update enemy properties
    enemy.mesh = bossMesh;
    enemy.health = APPLE_EATER_BOSS_HEALTH * (currentLevel + 1);
    enemy.maxHealth = enemy.health;
    
    // Update health bar size
    scene.remove(enemy.healthBarBackground);
    scene.remove(enemy.healthBar);
    
    // Create new health bars
    const healthBarBackgroundGeometry = new THREE.BoxGeometry(APPLE_EATER_BOSS_SIZE, 0.2, 0.2);
    const healthBarBackgroundMaterial = new THREE.MeshBasicMaterial({ color: COLORS.healthBarBackground });
    const healthBarBackground = new THREE.Mesh(healthBarBackgroundGeometry, healthBarBackgroundMaterial);
    healthBarBackground.position.set(enemy.position.x, enemy.position.y + APPLE_EATER_BOSS_SIZE, enemy.position.z);
    scene.add(healthBarBackground);
    
    const healthBarGeometry = new THREE.BoxGeometry(APPLE_EATER_BOSS_SIZE, 0.2, 0.2);
    const healthBarMaterial = new THREE.MeshBasicMaterial({ color: COLORS.healthBar });
    const healthBar = new THREE.Mesh(healthBarGeometry, healthBarMaterial);
    healthBar.position.set(enemy.position.x, enemy.position.y + APPLE_EATER_BOSS_SIZE, enemy.position.z);
    scene.add(healthBar);
    
    enemy.healthBarBackground = healthBarBackground;
    enemy.healthBar = healthBar;
    
    // Add visual effect or sound to indicate transformation
    // Award points for the transformation
    score += 15;
    levelScore += 15;
    scoreElement.textContent = `Score: ${score}`;
    
    // Update level progress
    updateLevelProgress();
}


function createPowerUp(customPosition = null) {
    const types = ['fireRate', 'damage', 'multiShot'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    let color, shape;
    switch (type) {
        case 'fireRate':
            color = COLORS.powerUpFireRate;
            shape = new THREE.ConeGeometry(CELL_SIZE/2, CELL_SIZE, 16);
            break;
        case 'damage':
            color = COLORS.powerUpDamage;
            shape = new THREE.TetrahedronGeometry(CELL_SIZE/2);
            break;
        case 'multiShot':
            color = COLORS.powerUpMultiShot;
            shape = new THREE.TorusGeometry(CELL_SIZE/3, CELL_SIZE/6, 16, 16);
            break;
    }
    
    const material = new THREE.MeshBasicMaterial({ color: color });
    const mesh = new THREE.Mesh(shape, material);
    
    // Use custom position if provided, otherwise generate random position
    let position;
    if (customPosition) {
        position = customPosition.clone();
    } else {
        do {
            position = new THREE.Vector3(
                Math.floor(Math.random() * GRID_SIZE) - GRID_SIZE / 2,
                0,
                Math.floor(Math.random() * GRID_SIZE) - GRID_SIZE / 2
            );
        } while (isPositionOccupied(position));
    }
    
    mesh.position.copy(position);
    scene.add(mesh);
    
    powerUps.push({
        mesh: mesh,
        position: position,
        type: type
    });
}

function createFloatingText(text, color, position) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    context.font = 'Bold 60px Arial';
    context.fillStyle = color;
    context.textAlign = 'center';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position);
    sprite.position.y += 1; // Position above the event
    sprite.scale.set(2, 1, 2);
    scene.add(sprite);
    
    floatingTexts.push({
        mesh: sprite,
        createdAt: Date.now(),
        velocity: new THREE.Vector3(0, 0.02, 0)
    });
}

function updateFloatingTexts() {
    const now = Date.now();
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const text = floatingTexts[i];
        const age = now - text.createdAt;
        
        if (age > 1000) { // Remove after 1 second
            scene.remove(text.mesh);
            floatingTexts.splice(i, 1);
        } else {
            // Move text upward and fade out
            text.mesh.position.add(text.velocity);
            text.mesh.material.opacity = 1 - (age / 1000);
        }
    }
}

function checkPowerUpCollisions() {
    const head = snake[0];
    
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUp = powerUps[i];
        
        if (head.position.distanceTo(powerUp.position) < CELL_SIZE) {
            // Apply power-up effect
            switch (powerUp.type) {
                case 'fireRate':
                    powerUpEffects.fireRate += 2; // Double fire rate
                    break;
                case 'damage':
                    powerUpEffects.damage += 2; // Double damage
                    break;
                case 'multiShot':
                    powerUpEffects.multiShot += 3; // Triple shot
                    break;
            }
            
            // Remove power-up from scene and array
            scene.remove(powerUp.mesh);
            powerUps.splice(i, 1);
            
            // Play sound or show effect
            const points = 5;
            score += points; // Bonus points for collecting power-ups
            levelScore += points; // Add to level score
            scoreElement.textContent = `Score: ${score}`;
            
            // Show floating text
            createFloatingText(`+${points}`, '#00ff00', head.position);
            
            // Update level progress
            updateLevelProgress();
        }
    }
}

function updateEnemyHealthBar(enemy) {
    // Update health bar width based on current health
    const healthPercentage = enemy.health / enemy.maxHealth;
    enemy.healthBar.scale.x = healthPercentage;
    
    // Center the health bar
    const offset = (ENEMY_SIZE * (1 - healthPercentage)) / 2;
    enemy.healthBar.position.x = enemy.position.x - offset;
}

function removeEnemy(index) {
    const enemy = enemies[index];
    
    // Remove meshes from scene
    scene.remove(enemy.mesh);
    scene.remove(enemy.healthBarBackground);
    scene.remove(enemy.healthBar);
    
    // Remove enemy from array
    enemies.splice(index, 1);
}

function togglePause() {
    // Only allow pausing if the game is active
    if (!gameActive) return;
    
    isPaused = !isPaused;
    
    if (isPaused) {
        // Show pause overlay
        pauseOverlay.style.display = 'block';
    } else {
        // Hide pause overlay
        pauseOverlay.style.display = 'none';
        // Reset lastMoveTime to prevent snake from moving immediately after unpausing
        lastMoveTime = performance.now();
    }
}

function showTutorialCompletion() {
    // Pause the game
    isPaused = true;
    
    // Show tutorial completion overlay
    tutorialOverlay.style.display = 'block';
    
    // Add one-time event listener for any key press to continue
    const continueHandler = function(event) {
        // Don't continue if the key pressed was 'p' (to prevent immediate unpausing)
        if (event.key === 'p' || event.key === 'P') return;
        
        continueTutorial();
        
        // Remove this event listener
        window.removeEventListener('keydown', continueHandler);
    };
    
    // Add touch event for mobile users
    const touchHandler = function() {
        continueTutorial();
        
        // Remove this event listener
        tutorialOverlay.removeEventListener('touchstart', touchHandler);
        tutorialOverlay.removeEventListener('click', touchHandler);
    };
    
    // Helper function to continue after tutorial
    function continueTutorial() {
        // Hide tutorial overlay
        tutorialOverlay.style.display = 'none';
        
        // Apply game changes
        applyTutorialCompletionChanges();
        
        // Unpause the game
        isPaused = false;
        lastMoveTime = performance.now();
        
        // Mark tutorial as completed and reset tutorial boss fight flag
        tutorialCompleted = true;
        isTutorialBossFight = false;
    }
    
    window.addEventListener('keydown', continueHandler);
    tutorialOverlay.addEventListener('touchstart', touchHandler, { passive: true });
    tutorialOverlay.addEventListener('click', touchHandler); // Also add click for testing on desktop
}

function applyTutorialCompletionChanges() {
    // Increase grid size
    GRID_SIZE = POST_TUTORIAL_GRID_SIZE;
    
    // Remove old grid helper
    scene.children.forEach(child => {
        if (child instanceof THREE.GridHelper) {
            scene.remove(child);
        }
    });
    
    // Add new larger grid
    const gridHelper = new THREE.GridHelper(GRID_SIZE, GRID_SIZE);
    scene.add(gridHelper);
    
    // Move camera further away
    camera.position.set(0, 20, 20);
    camera.lookAt(0, 0, 0);
    
    // Increase enemy health
    ENEMY_HEALTH = ENEMY_HEALTH * 2; // Double enemy health
    
    // Update level info
    currentLevel = 1;
    levelScore = 0;
    bossSpawned = false;
    levelInfoElement.textContent = `Level: ${currentLevel}`;
    progressBarElement.style.width = '0%';
}

function updateLevelProgress() {
    // If we're in the tutorial, check if we've reached the threshold to spawn the boss
    if (currentLevel === 0 && !bossSpawned && levelScore >= LEVEL_THRESHOLDS[0]) {
        bossSpawned = true;
        isTutorialBossFight = true; // Set tutorial boss fight flag
        // Spawn a mini boss for the tutorial
        createMiniBoss();
    }
    // If we're in a regular level (after tutorial)
    else if (currentLevel > 0 && currentLevel <= LEVEL_THRESHOLDS.length) {
        // Calculate progress percentage
        const levelThreshold = LEVEL_THRESHOLDS[currentLevel];
        const progress = Math.min(100, (levelScore / levelThreshold) * 100);
        
        // Update progress bar
        progressBarElement.style.width = `${progress}%`;
        
        // Check if we've reached the threshold to spawn the boss
        if (!bossSpawned && levelScore >= levelThreshold) {
            bossSpawned = true;
            // Spawn a mini boss for this level
            createMiniBoss();
        }
    }
}

function createMiniBoss() {
    // Create a mini boss enemy (this is a special case of createEnemy)
    const isMiniBoss = true;
    
    // Create enemy mesh (cube)
    const enemyGeometry = new THREE.BoxGeometry(MINI_BOSS_SIZE, MINI_BOSS_SIZE, MINI_BOSS_SIZE);
    const enemyMaterial = new THREE.MeshBasicMaterial({ color: COLORS.miniBoss });
    const enemyMesh = new THREE.Mesh(enemyGeometry, enemyMaterial);
    
    // Place enemy at random position
    let position;
    do {
        position = new THREE.Vector3(
            Math.floor(Math.random() * GRID_SIZE) - GRID_SIZE / 2,
            0,
            Math.floor(Math.random() * GRID_SIZE) - GRID_SIZE / 2
        );
    } while (isPositionOccupied(position) || isPositionTooCloseToSnake(position));
    
    enemyMesh.position.copy(position);
    scene.add(enemyMesh);
    
    // Create health bar background
    const healthBarBackgroundGeometry = new THREE.BoxGeometry(MINI_BOSS_SIZE, 0.2, 0.2);
    const healthBarBackgroundMaterial = new THREE.MeshBasicMaterial({ color: COLORS.healthBarBackground });
    const healthBarBackground = new THREE.Mesh(healthBarBackgroundGeometry, healthBarBackgroundMaterial);
    healthBarBackground.position.set(position.x, MINI_BOSS_SIZE, position.z);
    scene.add(healthBarBackground);
    
    // Create health bar
    const healthBarGeometry = new THREE.BoxGeometry(MINI_BOSS_SIZE, 0.2, 0.2);
    const healthBarMaterial = new THREE.MeshBasicMaterial({ color: COLORS.healthBar });
    const healthBar = new THREE.Mesh(healthBarGeometry, healthBarMaterial);
    healthBar.position.set(position.x, MINI_BOSS_SIZE, position.z);
    scene.add(healthBar);
    
    // Calculate health based on level
    const health = MINI_BOSS_HEALTH * (currentLevel + 1);
    
    // Add enemy to array
    enemies.push({
        mesh: enemyMesh,
        position: position,
        health: health,
        maxHealth: health,
        healthBarBackground: healthBarBackground,
        healthBar: healthBar,
        isMiniBoss: isMiniBoss,
        direction: new THREE.Vector3(
            Math.random() * 2 - 1,
            0,
            Math.random() * 2 - 1
        ).normalize()
    });
}

// Mobile controls setup function
function setupMobileControls() {
    // Get mobile control elements
    const upBtn = document.getElementById('upBtn');
    const downBtn = document.getElementById('downBtn');
    const leftBtn = document.getElementById('leftBtn');
    const rightBtn = document.getElementById('rightBtn');
    const shootBtn = document.getElementById('shootBtn');
    
    // Helper function to handle both touch and mouse events
    const addMobileControlEvents = (element, handler) => {
        // Touch events
        element.addEventListener('touchstart', handler, { passive: true });
        // Mouse events (for testing on desktop)
        element.addEventListener('mousedown', handler);
    };
    
    // Direction button handlers
    addMobileControlEvents(upBtn, (e) => {
        e.preventDefault();
        if (!isPaused && gameActive && direction.z !== 1) { // Not moving backward
            nextDirection.set(0, 0, -1);
        }
    });
    
    addMobileControlEvents(downBtn, (e) => {
        e.preventDefault();
        if (!isPaused && gameActive && direction.z !== -1) { // Not moving forward
            nextDirection.set(0, 0, 1);
        }
    });
    
    addMobileControlEvents(leftBtn, (e) => {
        e.preventDefault();
        if (!isPaused && gameActive && direction.x !== 1) { // Not moving right
            nextDirection.set(-1, 0, 0);
        }
    });
    
    addMobileControlEvents(rightBtn, (e) => {
        e.preventDefault();
        if (!isPaused && gameActive && direction.x !== -1) { // Not moving left
            nextDirection.set(1, 0, 0);
        }
    });
    
    // Shoot button handler
    addMobileControlEvents(shootBtn, (e) => {
        e.preventDefault();
        if (!isPaused && gameActive) {
            shootBullet();
        }
    });
    
    // Add pause button functionality to mobile
    const pauseBtn = document.createElement('div');
    pauseBtn.id = 'pauseBtn';
    pauseBtn.className = 'controlBtn';
    pauseBtn.style.position = 'absolute';
    pauseBtn.style.top = '10px';
    pauseBtn.style.right = '10px';
    pauseBtn.style.zIndex = '200';
    pauseBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
    pauseBtn.innerHTML = '⏸️';
    document.body.appendChild(pauseBtn);
    
    // Only show pause button on mobile
    pauseBtn.style.display = 'none';
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    if (mediaQuery.matches) {
        pauseBtn.style.display = 'flex';
    }
    mediaQuery.addEventListener('change', (e) => {
        pauseBtn.style.display = e.matches ? 'flex' : 'none';
    });
    
    addMobileControlEvents(pauseBtn, (e) => {
        e.preventDefault();
        togglePause();
    });
}