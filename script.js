const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const coinsDisplay = document.getElementById('coins-display');
const finalScoreElement = document.getElementById('final-score');
const finalCoinsElement = document.getElementById('final-coins');
const deathReasonElement = document.getElementById('death-reason');
const shopCoins = document.getElementById('shop-coins');
const inGameHud = document.getElementById('in-game-hud');

// Overlays
const mainMenu = document.getElementById('main-menu');
const gameOverMenu = document.getElementById('game-over');
const shopMenu = document.getElementById('shop-menu');
const worldMenu = document.getElementById('world-menu');

// Buttons
const btnPlay = document.getElementById('btn-play');
const btnShop = document.getElementById('btn-shop');
const btnWorlds = document.getElementById('btn-worlds');
const btnRestart = document.getElementById('btn-restart');
const btnBackMenu = document.getElementById('btn-back-menu');
const btnCloseShop = document.getElementById('btn-close-shop');
const btnCloseWorlds = document.getElementById('btn-close-worlds');

// Labels
const currentWorldLabel = document.getElementById('current-world-label');
const currentSkinLabel = document.getElementById('current-skin-label');
const skinsContainer = document.getElementById('skins-container');
const worldCards = document.querySelectorAll('.world-card');

// Data
const SKINS = {
    'neon': { id: 'neon', name: 'Neon Clássica', price: 0, headColor: '#00ffcc', bodyColor: '#0088aa', type: 'round' },
    'crystal': { id: 'crystal', name: 'Gruta de Cristal', price: 50, headColor: '#00ddff', bodyColor: '#0044cc', type: 'diamond' },
    'magma': { id: 'magma', name: 'Verme de Magma', price: 100, headColor: '#ffaa00', bodyColor: '#aa2200', type: 'spike' }
};

const WORLDS = {
    'neon': { id: 'neon', name: 'Selva Neon' },
    'crystal': { id: 'crystal', name: 'Caverna de Cristal' },
    'lava': { id: 'lava', name: 'Vulcão' }
};

// Config & State
const gridSize = 20; // 800 / 20 = 40 cells
const tileCount = canvas.width / gridSize;

let snake = [];
let enemy = [];
let items = []; // fruits and coins
let dx = 0;
let dy = 0;
let score = 0;
let sessionCoins = 0;

let gameLoop;
let isPlaying = false;
let gameSpeed = 100; // ms per frame
let tickCounter = 0;

// Player Data
let savedData = JSON.parse(localStorage.getItem('superSnakeData')) || {
    highScore: 0,
    coins: 0,
    unlockedSkins: ['neon'],
    currentSkin: 'neon',
    currentWorld: 'neon'
};

function saveData() {
    localStorage.setItem('superSnakeData', JSON.stringify(savedData));
    updateUI();
}

function updateUI() {
    highScoreElement.textContent = savedData.highScore;
    coinsDisplay.textContent = savedData.coins;
    shopCoins.textContent = savedData.coins;
    currentWorldLabel.textContent = WORLDS[savedData.currentWorld].name;
    currentSkinLabel.textContent = SKINS[savedData.currentSkin].name;
    document.body.setAttribute('data-world', savedData.currentWorld);
    
    // Update world cards
    worldCards.forEach(c => {
        c.classList.remove('active');
        if (c.getAttribute('data-world-id') === savedData.currentWorld) {
            c.classList.add('active');
        }
    });
}

// Inicialização de Menus
function initMenus() {
    updateUI();
    renderShop();
    
    // World Select listeners
    worldCards.forEach(card => {
        card.addEventListener('click', () => {
            savedData.currentWorld = card.getAttribute('data-world-id');
            saveData();
        });
    });
}

function renderShop() {
    skinsContainer.innerHTML = '';
    Object.values(SKINS).forEach(skin => {
        const isUnlocked = savedData.unlockedSkins.includes(skin.id);
        const isActive = savedData.currentSkin === skin.id;
        
        const card = document.createElement('div');
        card.className = `skin-card ${isUnlocked ? '' : 'locked'} ${isActive ? 'active' : ''}`;
        
        card.innerHTML = `
            <div class="skin-preview" style="background:${skin.bodyColor}; border-top: 5px solid ${skin.headColor}"></div>
            <h4 style="text-align:center">${skin.name}</h4>
            ${isActive ? '<span>Equipado</span>' : 
              isUnlocked ? '<button class="action-btn secondary" style="min-width:0; padding: 5px 15px">Equipar</button>' : 
              `<button class="buy-btn">💰 ${skin.price}</button>`}
        `;
        
        if (isUnlocked && !isActive) {
            const equipBtn = card.querySelector('button');
            equipBtn.addEventListener('click', () => {
                savedData.currentSkin = skin.id;
                saveData();
                renderShop();
            });
        } else if (!isUnlocked) {
            const buyBtn = card.querySelector('.buy-btn');
            buyBtn.addEventListener('click', () => {
                if (savedData.coins >= skin.price) {
                    savedData.coins -= skin.price;
                    savedData.unlockedSkins.push(skin.id);
                    savedData.currentSkin = skin.id;
                    saveData();
                    renderShop();
                } else {
                    alert('Moedas insuficientes!');
                }
            });
        }
        
        skinsContainer.appendChild(card);
    });
}

// ----------------------------------------------------------------
// ENGINE DO JOGO
// ----------------------------------------------------------------

function startGame() {
    snake = [
        { x: 10, y: 10 },
        { x: 10, y: 11 },
        { x: 10, y: 12 }
    ];
    dx = 0; dy = -1;
    score = 0;
    sessionCoins = 0;
    gameSpeed = 100;
    tickCounter = 0;
    items = [];
    
    // Inimigo começa longe (ex: perto do canto inferior direito)
    enemy = [
        { x: tileCount - 5, y: tileCount - 5 },
        { x: tileCount - 5, y: tileCount - 4 },
        { x: tileCount - 5, y: tileCount - 3 },
        { x: tileCount - 5, y: tileCount - 2 },
        { x: tileCount - 5, y: tileCount - 1 }
    ];
    
    scoreElement.textContent = score;
    
    // Spawn initial items
    spawnItem('fruit');
    spawnItem('fruit');
    spawnItem('coin');
    
    isPlaying = true;
    mainMenu.classList.add('hidden');
    gameOverMenu.classList.add('hidden');
    inGameHud.classList.remove('hidden');
    
    if (gameLoop) clearTimeout(gameLoop);
    main();
}

function stopGame(reason) {
    isPlaying = false;
    inGameHud.classList.add('hidden');
    
    finalScoreElement.textContent = score;
    finalCoinsElement.textContent = sessionCoins;
    deathReasonElement.textContent = reason;
    
    if (score > savedData.highScore) {
        savedData.highScore = score;
    }
    savedData.coins += sessionCoins;
    saveData();
    
    gameOverMenu.classList.remove('hidden');
}

function main() {
    if (!isPlaying) return;
    
    if (checkCollisions()) return; // Game Over triggers inside
    
    gameLoop = setTimeout(() => {
        tickCounter++;
        clearCanvas();
        drawItems();
        
        moveSnake();
        drawSnake(snake, SKINS[savedData.currentSkin]);
        
        // Inimigo move 1 vez a cada 2 ticks para ser um pouco mais lento
        if (tickCounter % 2 === 0) {
            moveEnemy();
        }
        drawEnemy();
        
        if(isPlaying) main();
    }, gameSpeed);
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function spawnItem(type) {
    let valid = false;
    let pos;
    while (!valid) {
        pos = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount),
            type: type
        };
        // Check if on player
        let onPlayer = snake.some(s => s.x === pos.x && s.y === pos.y);
        // Check if on enemy
        let onEnemy = enemy.some(e => e.x === pos.x && e.y === pos.y);
        // Check if on another item
        let onOther = items.some(i => i.x === pos.x && i.y === pos.y);
        
        if (!onPlayer && !onEnemy && !onOther) valid = true;
    }
    items.push(pos);
}

function drawItems() {
    items.forEach(item => {
        ctx.beginPath();
        const centerX = item.x * gridSize + gridSize/2;
        const centerY = item.y * gridSize + gridSize/2;
        
        if (item.type === 'fruit') {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff0055';
            ctx.fillStyle = '#ff0055';
            ctx.arc(centerX, centerY, gridSize/2 - 2, 0, Math.PI * 2);
        } else if (item.type === 'coin') {
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'gold';
            ctx.fillStyle = 'gold';
            ctx.arc(centerX, centerY, gridSize/2 - 3, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.shadowBlur = 0;
    });
}

function moveSnake() {
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    snake.unshift(head);
    
    // Check items
    let ateIndex = items.findIndex(i => i.x === head.x && i.y === head.y);
    if (ateIndex !== -1) {
        const item = items[ateIndex];
        if (item.type === 'fruit') {
            score += 10;
            scoreElement.textContent = score;
            spawnItem('fruit');
            if (Math.random() < 0.3) spawnItem('coin'); // 30% chance to spawn coin when eat fruit
            if (gameSpeed > 60) gameSpeed -= 1; // Increase speed slightly
        } else if (item.type === 'coin') {
            sessionCoins += 1;
            snake.pop(); // didn't grow
        }
        items.splice(ateIndex, 1);
    } else {
        snake.pop(); // Remove tail
    }
}

// IA do Inimigo: Persegue a cabeça do jogador
function moveEnemy() {
    const head = enemy[0];
    const target = snake[0]; // Player head
    
    // Choose direction that minimizes distance to target
    const possibleMoves = [
        { dx: 0, dy: -1 }, // up
        { dx: 0, dy: 1 },  // down
        { dx: -1, dy: 0 }, // left
        { dx: 1, dy: 0 }   // right
    ];
    
    let bestMove = null;
    let minDistance = Infinity;
    
    possibleMoves.forEach(move => {
        const nextX = head.x + move.dx;
        const nextY = head.y + move.dy;
        
        // Prevent going out of bounds
        if (nextX < 0 || nextX >= tileCount || nextY < 0 || nextY >= tileCount) return;
        
        // Prevent enemy reversing tightly into its own neck (simple check)
        if (enemy.length > 1 && nextX === enemy[1].x && nextY === enemy[1].y) return;
        
        // Distance calc
        const dist = Math.abs(nextX - target.x) + Math.abs(nextY - target.y);
        
        if (dist < minDistance) {
            minDistance = dist;
            bestMove = move;
        }
    });
    
    if (bestMove) {
        enemy.unshift({ x: head.x + bestMove.dx, y: head.y + bestMove.dy });
        enemy.pop(); // Enemy doesn't grow
    }
}

function drawSnake(arr, skinDef) {
    arr.forEach((segment, index) => {
        const isHead = index === 0;
        ctx.fillStyle = isHead ? skinDef.headColor : skinDef.bodyColor;
        ctx.shadowBlur = isHead ? 15 : 0;
        ctx.shadowColor = skinDef.headColor;
        
        const x = segment.x * gridSize;
        const y = segment.y * gridSize;
        
        ctx.beginPath();
        if (skinDef.type === 'diamond') {
            // Desenha um formato de diamante
            ctx.moveTo(x + gridSize/2, y + 2);
            ctx.lineTo(x + gridSize - 2, y + gridSize/2);
            ctx.lineTo(x + gridSize/2, y + gridSize - 2);
            ctx.lineTo(x + 2, y + gridSize/2);
            ctx.closePath();
        } else if (skinDef.type === 'spike') {
            // Desenha com um visual pontiagudo
             ctx.moveTo(x, y + gridSize/2);
             ctx.lineTo(x + gridSize/2, y);
             ctx.lineTo(x + gridSize, y + gridSize/2);
             ctx.lineTo(x + gridSize/2, y + gridSize);
             ctx.closePath();
             // fill spike
             ctx.fillRect(x + 4, y + 4, gridSize - 8, gridSize - 8);
        } else {
            // Round clássico
            ctx.arc(x + gridSize/2, y + gridSize/2, isHead ? gridSize/2 - 1 : gridSize/2 - 2, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Draw eyes on head
        if (isHead) {
            ctx.fillStyle = '#000';
            // Simplificado: dois pontos negros
            ctx.fillRect(x + gridSize/2 - 4, y + gridSize/2 - 4, 3, 3);
            ctx.fillRect(x + gridSize/2 + 2, y + gridSize/2 - 4, 3, 3);
        }
    });
}

function drawEnemy() {
    // Inimigo fixo: cores amedrontadoras
    const enemySkin = {
        headColor: '#ff2222',
        bodyColor: '#551111',
        type: 'spike'
    };
    drawSnake(enemy, enemySkin);
}

function checkCollisions() {
    const head = snake[0];
    
    // Parede
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        stopGame('Você bateu na parede!');
        return true;
    }
    
    // Corpo própio
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            stopGame('Você mordeu o próprio corpo!');
            return true;
        }
    }
    
    // Colisão SE a CABEÇA DO JOGADOR bater no INIMIGO
    // ("se encostar a parte de cima da minha minhoca nela eu perco")
    for (let i = 0; i < enemy.length; i++) {
        if (head.x === enemy[i].x && head.y === enemy[i].y) {
            stopGame('A Minhoca Assassina te pegou!');
            return true;
        }
    }
    
    return false;
}

// ----------------------------------------------------------------
// CONTROLES E EVENTOS
// ----------------------------------------------------------------

window.addEventListener('keydown', e => {
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

btnPlay.addEventListener('click', startGame);
btnRestart.addEventListener('click', startGame);
btnBackMenu.addEventListener('click', () => {
    gameOverMenu.classList.add('hidden');
    mainMenu.classList.remove('hidden');
    clearCanvas();
});

// Menus logic
btnShop.addEventListener('click', () => {
    renderShop();
    mainMenu.classList.add('hidden');
    shopMenu.classList.remove('hidden');
});
btnCloseShop.addEventListener('click', () => {
    shopMenu.classList.add('hidden');
    mainMenu.classList.remove('hidden');
});

btnWorlds.addEventListener('click', () => {
    mainMenu.classList.add('hidden');
    worldMenu.classList.remove('hidden');
});
btnCloseWorlds.addEventListener('click', () => {
    worldMenu.classList.add('hidden');
    mainMenu.classList.remove('hidden');
});

// Init
initMenus();
clearCanvas();
