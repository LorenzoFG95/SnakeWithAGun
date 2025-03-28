import * as THREE from 'three';

// Game constants
const GRID_SIZE = 20;
const CELL_SIZE = 1;
const INITIAL_MOVE_INTERVAL = 150; // milliseconds between moves
const SPEED_INCREASE_FACTOR = 0.65; // decrease interval by 5% per apple
const MIN_MOVE_INTERVAL = 30; // minimum interval to prevent the game from becoming too fast
const COLORS = {
    background: 0x222222,
    snake: 0x00ff00,
    snakeHead: 0x00cc00,
    apple: 0xff0000,
    bullet: 0xffff00,
    enemy: 0x0000ff,
    healthBar: 0xff0000,
    healthBarBackground: 0x555555
};

// Game variables
let scene, camera, renderer;
let snake = [];
let direction = new THREE.Vector3(1, 0, 0);
let nextDirection = new THREE.Vector3(1, 0, 0);
let apple;
let score = 0;
let lastMoveTime = 0;
let gameActive = true;
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

// DOM elements
const scoreElement = document.getElementById('score');
const gameOverElement = document.getElementById('gameOver');
const finalScoreElement = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');

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
    
    // Reset enemy spawn time
    lastEnemySpawnTime = Date.now();
    
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
        if (distance < (CELL_SIZE / 2 + ENEMY_SIZE / 2)) {
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
        // Increase score
        score++;
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
    if (!gameActive) return;
    
    const currentTime = Date.now();
    if (currentTime - lastShotTime < SHOT_COOLDOWN) return;
    
    lastShotTime = currentTime;
    
    const head = snake[0];
    const bulletGeometry = new THREE.SphereGeometry(CELL_SIZE / 4, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: COLORS.bullet });
    const bulletMesh = new THREE.Mesh(bulletGeometry, bulletMaterial);
    
    // Position bullet at snake head
    bulletMesh.position.copy(head.position.clone());
    scene.add(bulletMesh);
    
    bullets.push({
        mesh: bulletMesh,
        position: head.position.clone(),
        direction: direction.clone(),
        speed: 0.2
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
            bullet.position.x < -GRID_SIZE || 
            bullet.position.x > GRID_SIZE || 
            bullet.position.z < -GRID_SIZE || 
            bullet.position.z > GRID_SIZE
        ) {
            scene.remove(bullet.mesh);
            bullets.splice(i, 1);
        }
        
        // Check if bullet hit apple
        else if (
            Math.abs(bullet.position.x - apple.position.x) < CELL_SIZE / 2 && 
            Math.abs(bullet.position.z - apple.position.z) < CELL_SIZE / 2
        ) {
            // Increase score
            score += 5; // Bonus points for shooting apple
            scoreElement.textContent = `Score: ${score}`;
            
            // Remove bullet
            scene.remove(bullet.mesh);
            bullets.splice(i, 1);
            
            // Create new apple
            createApple();
        }
        
        // Check if bullet hit enemy
        else {
            let hitEnemy = false;
            
            for (let j = enemies.length - 1; j >= 0; j--) {
                const enemy = enemies[j];
                const distance = Math.sqrt(
                    Math.pow(bullet.position.x - enemy.position.x, 2) +
                    Math.pow(bullet.position.z - enemy.position.z, 2)
                );
                
                if (distance < ENEMY_SIZE / 2) {
                    // Reduce enemy health
                    enemy.health--;
                    
                    // Update health bar
                    updateEnemyHealthBar(enemy);
                    
                    // Check if enemy is dead
                    if (enemy.health <= 0) {
                        // Increase score
                        score += 10; // Points for killing enemy
                        scoreElement.textContent = `Score: ${score}`;
                        
                        // Remove enemy
                        removeEnemy(j);
                    }
                    
                    // Remove bullet
                    scene.remove(bullet.mesh);
                    bullets.splice(i, 1);
                    
                    hitEnemy = true;
                    break;
                }
            }
            
            if (hitEnemy) continue;
        }
    }
}

function handleKeyDown(event) {
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
    }
}

function handleResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function gameOver() {
    gameActive = false;
    finalScoreElement.textContent = score;
    gameOverElement.style.display = 'block';
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
    
    // Reset enemy spawn time
    lastEnemySpawnTime = Date.now();
    
    // Recreate snake and apple
    createSnake();
    createApple();
}

function animate(time) {
    requestAnimationFrame(animate);
    
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
    
    // Update enemies
    updateEnemies();
    
    // Render scene
    renderer.render(scene, camera);
}

function createEnemy() {
    // Create enemy mesh (cube)
    const enemyGeometry = new THREE.BoxGeometry(ENEMY_SIZE, ENEMY_SIZE, ENEMY_SIZE);
    const enemyMaterial = new THREE.MeshBasicMaterial({ color: COLORS.enemy });
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
        health: ENEMY_HEALTH,
        maxHealth: ENEMY_HEALTH,
        healthBarBackground: healthBarBackground,
        healthBar: healthBar,
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
    for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        
        // Move enemy towards snake with some randomness
        if (Math.random() < 0.02) { // Occasionally change direction
            enemy.direction = new THREE.Vector3(
                Math.random() * 2 - 1,
                0,
                Math.random() * 2 - 1
            ).normalize();
        } else if (Math.random() < 0.1) { // Sometimes move towards snake
            const head = snake[0];
            enemy.direction = new THREE.Vector3(
                head.position.x - enemy.position.x,
                0,
                head.position.z - enemy.position.z
            ).normalize();
        }
        
        // Move enemy
        enemy.position.add(enemy.direction.clone().multiplyScalar(ENEMY_SPEED));
        
        // Keep enemy within bounds
        enemy.position.x = Math.max(-GRID_SIZE / 2 + ENEMY_SIZE / 2, Math.min(GRID_SIZE / 2 - ENEMY_SIZE / 2, enemy.position.x));
        enemy.position.z = Math.max(-GRID_SIZE / 2 + ENEMY_SIZE / 2, Math.min(GRID_SIZE / 2 - ENEMY_SIZE / 2, enemy.position.z));
        
        // Update enemy mesh position
        enemy.mesh.position.copy(enemy.position);
        
        // Update health bar position
        enemy.healthBarBackground.position.set(enemy.position.x, ENEMY_SIZE, enemy.position.z);
        enemy.healthBar.position.set(enemy.position.x, ENEMY_SIZE, enemy.position.z);
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