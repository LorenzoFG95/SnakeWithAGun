import * as THREE from 'three';

// Game constants
const GRID_SIZE = 20;
const CELL_SIZE = 1;
const INITIAL_MOVE_INTERVAL = 150; // milliseconds between moves
const SPEED_INCREASE_FACTOR = 0.85; // decrease interval by 5% per apple
const MIN_MOVE_INTERVAL = 50; // minimum interval to prevent the game from becoming too fast
const COLORS = {
    background: 0x222222,
    snake: 0x00ff00,
    snakeHead: 0x00cc00,
    apple: 0xff0000,
    bullet: 0xffff00,
    enemy: 0x0000ff,
    miniBoss: 0x800080, // Purple color for mini boss
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
const POWER_UP_SPAWN_INTERVAL = 10000; // milliseconds between power-up spawns
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
const SHOT_COOLDOWN = 500; // milliseconds between shots
const ENEMY_SPAWN_INTERVAL = 5000; // milliseconds between enemy spawns
const ENEMY_SIZE = 1.5; // enemies are bigger than snake segments
const ENEMY_HEALTH = 3; // number of hits to kill an enemy
const ENEMY_SPEED = 0.02; // enemy movement speed

// Mini boss constants
const MINI_BOSS_SIZE = ENEMY_SIZE * 3;
const MINI_BOSS_HEALTH = ENEMY_HEALTH * 10;
const MINI_BOSS_SPEED = ENEMY_SPEED * 0.5;

// DOM elements
const scoreElement = document.getElementById('score');
const gameOverElement = document.getElementById('gameOver');
const finalScoreElement = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');
const pauseOverlay = document.getElementById('pauseOverlay'); // New pause overlay element

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
    
    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    restartButton.addEventListener('click', restartGame);
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
        // Increase score and apples eaten counter
        score++;
        applesEaten++;
        scoreElement.textContent = `Score: ${score}`;
        
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
            speed: 0.2,
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
                    
                    // Award bonus points and spawn power-ups for mini boss
                    if (enemy.isMiniBoss) {
                        score += 50;
                        // Spawn multiple power-ups
                        for (let i = 0; i < 3; i++) {
                            createPowerUp();
                        }
                    } else {
                        score += 10;
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
    scoreElement.textContent = `Score: ${score}`;
    gameOverElement.style.display = 'none';
    direction = new THREE.Vector3(1, 0, 0);
    nextDirection = new THREE.Vector3(1, 0, 0);
    gameActive = true;
    currentMoveInterval = INITIAL_MOVE_INTERVAL; // Reset speed to initial value
    
    // Reset game statistics
    applesEaten = 0;
    enemiesDefeated = 0;
    gameStartTime = Date.now();
    
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
        createEnemy();
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
    
    // Render scene
    renderer.render(scene, camera);
}

function createEnemy() {
    // Check if we should spawn a mini boss
    const isMiniBoss = score >= 50 && !enemies.some(e => e.isMiniBoss);
    
    // Set enemy properties based on type
    const size = isMiniBoss ? MINI_BOSS_SIZE : ENEMY_SIZE;
    const health = isMiniBoss ? MINI_BOSS_HEALTH : ENEMY_HEALTH;
    const color = isMiniBoss ? COLORS.miniBoss : COLORS.enemy;
    
    // Create enemy mesh (cube)
    const enemyGeometry = new THREE.BoxGeometry(size, size, size);
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
    
    // Create health bar background
    const healthBarBackgroundGeometry = new THREE.BoxGeometry(ENEMY_SIZE, 0.2, 0.2);
    const healthBarBackgroundMaterial = new THREE.MeshBasicMaterial({ color: COLORS.healthBarBackground });
    const healthBarBackground = new THREE.Mesh(healthBarBackgroundGeometry, healthBarBackgroundMaterial);
    healthBarBackground.position.set(position.x, ENEMY_SIZE, position.z);
    scene.add(healthBarBackground);
    
    // Create health bar
    const healthBarGeometry = new THREE.BoxGeometry(ENEMY_SIZE, 0.2, 0.2);
    const healthBarMaterial = new THREE.MeshBasicMaterial({ color: COLORS.healthBar });
    const healthBar = new THREE.Mesh(healthBarGeometry, healthBarMaterial);
    healthBar.position.set(position.x, ENEMY_SIZE, position.z);
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
        direction: new THREE.Vector3(
            Math.random() * 2 - 1,
            0,
            Math.random() * 2 - 1
        ).normalize()
    });
}

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
        // Move enemy towards snake head
        const direction = new THREE.Vector3().subVectors(
            snake[0].position,
            enemy.position
        ).normalize();
        
        const speed = enemy.isMiniBoss ? MINI_BOSS_SPEED : ENEMY_SPEED;
        enemy.position.add(direction.multiplyScalar(speed));
        enemy.mesh.position.copy(enemy.position);
        
        // Update health bar position
        enemy.healthBarBackground.position.set(
            enemy.position.x,
            enemy.position.y + ENEMY_SIZE,
            enemy.position.z
        );
        enemy.healthBar.position.set(
            enemy.position.x,
            enemy.position.y + ENEMY_SIZE,
            enemy.position.z
        );
    });
}

function createPowerUp() {
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
    
    // Place power-up at random position
    let position;
    do {
        position = new THREE.Vector3(
            Math.floor(Math.random() * GRID_SIZE) - GRID_SIZE / 2,
            0,
            Math.floor(Math.random() * GRID_SIZE) - GRID_SIZE / 2
        );
    } while (isPositionOccupied(position));
    
    mesh.position.copy(position);
    scene.add(mesh);
    
    powerUps.push({
        mesh: mesh,
        position: position,
        type: type
    });
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
            score += 5; // Bonus points for collecting power-ups
            scoreElement.textContent = `Score: ${score}`;
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