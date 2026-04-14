const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const finalScoreElement = document.getElementById('final-score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Game configurations
const gridSize = 30; // 600 / 30 = 20 cells
const tileCount = canvas.width / gridSize;

// Game state variables
let snake = [];
let food = {};
let dx = 0;
let dy = 0;
let score = 0;
let highScore = localStorage.getItem('neonSnakeHighScore') || 0;
let gameLoop;
let isPlaying = false;
let gameSpeed = 120; // ms per frame

highScoreElement.textContent = highScore;

// Snake colors for gradient effect
const headColor = '#00ffcc';
const tailColor = '#0088aa';

function initGame() {
    // Initial snake at center
    snake = [
        { x: 10, y: 10 },
        { x: 10, y: 11 },
        { x: 10, y: 12 }
    ];
    
    // Initial movement direction (up)
    dx = 0;
    dy = -1;
    
    score = 0;
    gameSpeed = 120;
    updateScore();
    placeFood();
    
    isPlaying = true;
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    
    if (gameLoop) clearTimeout(gameLoop);
    main();
}

function main() {
    if (checkCollision()) {
        endGame();
        return;
    }
    
    gameLoop = setTimeout(() => {
        clearCanvas();
        drawFood();
        moveSnake();
        drawSnake();
        if(isPlaying) main();
    }, gameSpeed);
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawSnake() {
    snake.forEach((segment, index) => {
        // Create a glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = headColor;
        
        ctx.fillStyle = index === 0 ? headColor : tailColor;
        
        // Slightly smaller rect to see grid spacing intuitively
        const offset = 2;
        const size = gridSize - offset * 2;
        
        // Make the body segments slightly smaller than the head
        const segmentSize = index === 0 ? size : size - 2;
        const alignOffset = index === 0 ? offset : offset + 1;
        
        ctx.beginPath();
        ctx.roundRect(
            segment.x * gridSize + alignOffset, 
            segment.y * gridSize + alignOffset, 
            segmentSize, segmentSize, 5
        );
        ctx.fill();
        
        // Reset shadow for performance
        ctx.shadowBlur = 0;
    });
}

function moveSnake() {
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    snake.unshift(head);
    
    // Check if snake ate food
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        updateScore();
        placeFood();
        // Slightly increase speed
        if (gameSpeed > 50) gameSpeed -= 2; 
    } else {
        snake.pop(); // Remove tail if not eating
    }
}

function placeFood() {
    let newFoodPosition;
    let isValidPosition = false;
    
    while (!isValidPosition) {
        newFoodPosition = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount)
        };
        
        // Make sure food is not on snake
        let onSnake = false;
        for (let segment of snake) {
            if (segment.x === newFoodPosition.x && segment.y === newFoodPosition.y) {
                onSnake = true;
                break;
            }
        }
        
        if (!onSnake) {
            isValidPosition = true;
        }
    }
    
    food = newFoodPosition;
}

function drawFood() {
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff0055';
    ctx.fillStyle = '#ff0055';
    
    const offset = 4;
    const size = gridSize - offset * 2;
    
    ctx.beginPath();
    // Use arc/circle for food
    ctx.arc(
        food.x * gridSize + gridSize/2, 
        food.y * gridSize + gridSize/2, 
        size/2, 0, Math.PI * 2
    );
    ctx.fill();
    
    ctx.shadowBlur = 0;
}

function checkCollision() {
    const head = snake[0];
    
    // Wall collision
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        return true;
    }
    
    // Self collision (start checking from segment 1, not 0 which is head)
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            return true;
        }
    }
    
    return false;
}

function updateScore() {
    scoreElement.textContent = score;
    if (score > highScore) {
        highScore = score;
        highScoreElement.textContent = highScore;
        localStorage.setItem('neonSnakeHighScore', highScore);
    }
}

function endGame() {
    isPlaying = false;
    finalScoreElement.textContent = score;
    gameOverScreen.classList.remove('hidden');
}

// Controls
window.addEventListener('keydown', e => {
    // Prevent default scroll behavior for arrow keys
    if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].indexOf(e.code) > -1) {
        e.preventDefault();
    }
    
    if (!isPlaying) return;
    
    const key = e.key.toLowerCase();
    
    if ((key === 'arrowup' || key === 'w') && dy !== 1) {
        dx = 0; dy = -1;
    } else if ((key === 'arrowdown' || key === 's') && dy !== -1) {
        dx = 0; dy = 1;
    } else if ((key === 'arrowleft' || key === 'a') && dx !== 1) {
        dx = -1; dy = 0;
    } else if ((key === 'arrowright' || key === 'd') && dx !== -1) {
        dx = 1; dy = 0;
    }
});

startBtn.addEventListener('click', initGame);
restartBtn.addEventListener('click', initGame);

// Initially render the canvas 
clearCanvas();
