document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error("Canvas não encontrado!");
        return;
    }
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
    const gridSize = 20; 
    const tileCount = canvas.width / gridSize;

    let snake = [];
    let enemy = [];
    let items = []; 
    let dx = 0;
    let dy = 0;
    let score = 0;
    let sessionCoins = 0;

    let gameLoop;
    let isPlaying = false;
    let gameSpeed = 100; 
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
        if (highScoreElement) highScoreElement.textContent = savedData.highScore;
        if (coinsDisplay) coinsDisplay.textContent = savedData.coins;
        if (shopCoins) shopCoins.textContent = savedData.coins;
        if (currentWorldLabel) currentWorldLabel.textContent = WORLDS[savedData.currentWorld].name;
        if (currentSkinLabel) currentSkinLabel.textContent = SKINS[savedData.currentSkin].name;
        document.body.setAttribute('data-world', savedData.currentWorld);
        
        worldCards.forEach(c => {
            c.classList.remove('active');
            if (c.getAttribute('data-world-id') === savedData.currentWorld) {
                c.classList.add('active');
            }
        });
    }

    function initMenus() {
        updateUI();
        renderShop();
        
        worldCards.forEach(card => {
            card.addEventListener('click', () => {
                savedData.currentWorld = card.getAttribute('data-world-id');
                saveData();
            });
        });
    }

    function renderShop() {
        if (!skinsContainer) return;
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
                  isUnlocked ? '<button class="action-btn secondary equip-btn" style="min-width:0; padding: 5px 15px">Equipar</button>' : 
                  `<button class="buy-btn">💰 ${skin.price}</button>`}
            `;
            
            if (isUnlocked && !isActive) {
                const equipBtn = card.querySelector('.equip-btn');
                if (equipBtn) {
                    equipBtn.addEventListener('click', () => {
                        savedData.currentSkin = skin.id;
                        saveData();
                        renderShop();
                    });
                }
            } else if (!isUnlocked) {
                const buyBtn = card.querySelector('.buy-btn');
                if (buyBtn) {
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
            }
            
            skinsContainer.appendChild(card);
        });
    }

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
        
        enemy = [
            { x: tileCount - 5, y: tileCount - 5 },
            { x: tileCount - 5, y: tileCount - 4 },
            { x: tileCount - 5, y: tileCount - 3 },
            { x: tileCount - 5, y: tileCount - 2 },
            { x: tileCount - 5, y: tileCount - 1 }
        ];
        
        if (scoreElement) scoreElement.textContent = score;
        
        spawnItem('fruit');
        spawnItem('fruit');
        spawnItem('coin');
        
        isPlaying = true;
        if (mainMenu) mainMenu.classList.add('hidden');
        if (gameOverMenu) gameOverMenu.classList.add('hidden');
        if (inGameHud) inGameHud.classList.remove('hidden');
        
        if (gameLoop) clearTimeout(gameLoop);
        main();
    }

    function stopGame(reason) {
        isPlaying = false;
        if (inGameHud) inGameHud.classList.add('hidden');
        
        if (finalScoreElement) finalScoreElement.textContent = score;
        if (finalCoinsElement) finalCoinsElement.textContent = sessionCoins;
        if (deathReasonElement) deathReasonElement.textContent = reason;
        
        if (score > savedData.highScore) {
            savedData.highScore = score;
        }
        savedData.coins += sessionCoins;
        saveData();
        
        if (gameOverMenu) gameOverMenu.classList.remove('hidden');
    }

    function main() {
        if (!isPlaying) return;
        if (checkCollisions()) return; 
        
        gameLoop = setTimeout(() => {
            tickCounter++;
            clearCanvas();
            drawItems();
            moveSnake();
            drawSnake(snake, SKINS[savedData.currentSkin]);
            if (tickCounter % 2 === 0) moveEnemy();
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
        let attempts = 0;
        while (!valid && attempts < 100) {
            pos = {
                x: Math.floor(Math.random() * tileCount),
                y: Math.floor(Math.random() * tileCount),
                type: type
            };
            let onPlayer = snake.some(s => s.x === pos.x && s.y === pos.y);
            let onEnemy = enemy.some(e => e.x === pos.x && e.y === pos.y);
            let onOther = items.some(i => i.x === pos.x && i.y === pos.y);
            if (!onPlayer && !onEnemy && !onOther) valid = true;
            attempts++;
        }
        if(pos) items.push(pos);
    }

    function drawItems() {
        items.forEach(item => {
            ctx.beginPath();
            const centerX = item.x * gridSize + gridSize/2;
            const centerY = item.y * gridSize + gridSize/2;
            if (item.type === 'fruit') {
                ctx.shadowBlur = 10; ctx.shadowColor = '#ff0055'; ctx.fillStyle = '#ff0055';
                ctx.arc(centerX, centerY, gridSize/2 - 2, 0, Math.PI * 2);
            } else if (item.type === 'coin') {
                ctx.shadowBlur = 15; ctx.shadowColor = 'gold'; ctx.fillStyle = 'gold';
                ctx.arc(centerX, centerY, gridSize/2 - 3, 0, Math.PI * 2);
            }
            ctx.fill();
            ctx.shadowBlur = 0;
        });
    }

    function moveSnake() {
        if (snake.length === 0) return;
        const head = { x: snake[0].x + dx, y: snake[0].y + dy };
        snake.unshift(head);
        let ateIndex = items.findIndex(i => i.x === head.x && i.y === head.y);
        if (ateIndex !== -1) {
            const item = items[ateIndex];
            if (item.type === 'fruit') {
                score += 10;
                if (scoreElement) scoreElement.textContent = score;
                spawnItem('fruit');
                if (Math.random() < 0.3) spawnItem('coin');
                if (gameSpeed > 60) gameSpeed -= 1;
            } else if (item.type === 'coin') {
                sessionCoins += 1;
                snake.pop();
            }
            items.splice(ateIndex, 1);
        } else {
            snake.pop();
        }
    }

    function moveEnemy() {
        if (enemy.length === 0 || snake.length === 0) return;
        const head = enemy[0];
        const target = snake[0];
        const possibleMoves = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];
        let bestMove = null;
        let minDistance = Infinity;
        possibleMoves.forEach(move => {
            const nextX = head.x + move.dx;
            const nextY = head.y + move.dy;
            if (nextX < 0 || nextX >= tileCount || nextY < 0 || nextY >= tileCount) return;
            if (enemy.length > 1 && nextX === enemy[1].x && nextY === enemy[1].y) return;
            const dist = Math.abs(nextX - target.x) + Math.abs(nextY - target.y);
            if (dist < minDistance) { minDistance = dist; bestMove = move; }
        });
        if (bestMove) {
            enemy.unshift({ x: head.x + bestMove.dx, y: head.y + bestMove.dy });
            enemy.pop();
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
                ctx.moveTo(x + gridSize/2, y + 2); ctx.lineTo(x + gridSize - 2, y + gridSize/2);
                ctx.lineTo(x + gridSize/2, y + gridSize - 2); ctx.lineTo(x + 2, y + gridSize/2);
                ctx.closePath();
            } else if (skinDef.type === 'spike') {
                ctx.moveTo(x, y + gridSize/2); ctx.lineTo(x + gridSize/2, y);
                ctx.lineTo(x + gridSize, y + gridSize/2); ctx.lineTo(x + gridSize/2, y + gridSize);
                ctx.closePath();
                ctx.fillRect(x + 4, y + 4, gridSize - 8, gridSize - 8);
            } else {
                ctx.arc(x + gridSize/2, y + gridSize/2, isHead ? gridSize/2 - 1 : gridSize/2 - 2, 0, Math.PI * 2);
            }
            ctx.fill();
            ctx.shadowBlur = 0;
            if (isHead) {
                ctx.fillStyle = '#000';
                ctx.fillRect(x + gridSize/2 - 4, y + gridSize/2 - 4, 3, 3);
                ctx.fillRect(x + gridSize/2 + 2, y + gridSize/2 - 4, 3, 3);
            }
        });
    }

    function drawEnemy() {
        const enemySkin = { headColor: '#ff2222', bodyColor: '#551111', type: 'spike' };
        drawSnake(enemy, enemySkin);
    }

    function checkCollisions() {
        if (snake.length === 0) return false;
        const head = snake[0];
        if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
            stopGame('Você bateu na parede!'); return true;
        }
        for (let i = 1; i < snake.length; i++) {
            if (head.x === snake[i].x && head.y === snake[i].y) {
                stopGame('Você mordeu o próprio corpo!'); return true;
            }
        }
        for (let i = 0; i < enemy.length; i++) {
            if (head.x === enemy[i].x && head.y === enemy[i].y) {
                stopGame('A Minhoca Assassina te pegou!'); return true;
            }
        }
        return false;
    }

    window.addEventListener('keydown', e => {
        if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].indexOf(e.code) > -1) e.preventDefault();
        if (!isPlaying) return;
        const key = e.key.toLowerCase();
        if ((key === 'arrowup' || key === 'w') && dy !== 1) { dx = 0; dy = -1; }
        else if ((key === 'arrowdown' || key === 's') && dy !== -1) { dx = 0; dy = 1; }
        else if ((key === 'arrowleft' || key === 'a') && dx !== 1) { dx = -1; dy = 0; }
        else if ((key === 'arrowright' || key === 'd') && dx !== -1) { dx = 1; dy = 0; }
    });

    if (btnPlay) btnPlay.addEventListener('click', startGame);
    if (btnRestart) btnRestart.addEventListener('click', startGame);
    if (btnBackMenu) btnBackMenu.addEventListener('click', () => {
        if (gameOverMenu) gameOverMenu.classList.add('hidden');
        if (mainMenu) mainMenu.classList.remove('hidden');
        clearCanvas();
    });

    if (btnShop) btnShop.addEventListener('click', () => {
        renderShop();
        if (mainMenu) mainMenu.classList.add('hidden');
        if (shopMenu) shopMenu.classList.remove('hidden');
    });
    if (btnCloseShop) btnCloseShop.addEventListener('click', () => {
        if (shopMenu) shopMenu.classList.add('hidden');
        if (mainMenu) mainMenu.classList.remove('hidden');
    });

    if (btnWorlds) btnWorlds.addEventListener('click', () => {
        if (mainMenu) mainMenu.classList.add('hidden');
        if (worldMenu) worldMenu.classList.remove('hidden');
    });
    if (btnCloseWorlds) btnCloseWorlds.addEventListener('click', () => {
        if (worldMenu) worldMenu.classList.remove('hidden');
        if (mainMenu) mainMenu.classList.remove('hidden');
    });

    initMenus();
    clearCanvas();
});
