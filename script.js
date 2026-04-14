/**
 * ANTIGRAVITY SNAKE ENGINE v2.0
 * Roles: Senior Game Developer & AI Engineer
 */

class TableMachine {
    constructor() {
        this.history = [];
    }

    logGame(score, coins, startTime) {
        const timeSurvived = Math.floor((Date.now() - startTime) / 1000);
        const entry = {
            points: score,
            moedas: coins,
            tempo_sobrevivencia: `${timeSurvived}s`,
            timestamp: new Date().toISOString()
        };
        this.history.push(entry);
        return entry;
    }

    renderTable(container) {
        if (!container) return;
        const last = this.history[this.history.length - 1];
        container.innerHTML = `
            <table>
                <thead>
                    <tr><th>METRIC</th><th>VALUE</th></tr>
                </thead>
                <tbody>
                    <tr><td>POINTS</td><td>${last.points}</td></tr>
                    <tr><td>COINS</td><td>${last.moedas}</td></tr>
                    <tr><td>SURVIVAL</td><td>${last.tempo_sobrevivencia}</td></tr>
                </tbody>
            </table>
        `;
    }

    exportJSON() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.history));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "game_stats.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }
}

class AntigravityOrchestrator {
    constructor() {
        this.progressionLevel = 0;
    }

    processFruit(coins) {
        // Antigravity Logic: Each 5 coins increases entropy
        if (coins > 0 && coins % 5 === 0) {
            this.progressionLevel++;
            this.updateProgressBar();
            return true; // Threshold reached
        }
        this.updateProgressBar(coins % 5);
        return false;
    }

    updateProgressBar(partial = 5) {
        const bar = document.getElementById('antigravity-bar');
        if (bar) bar.style.width = `${(partial / 5) * 100}%`;
    }
}

class IAManager {
    constructor() {
        this.model = null;
        this.webcam = null;
        this.labelContainer = null;
        this.maxPredictions = 0;
        this.isActive = false;
        this.currentPrediction = "None";
    }

    async init(modelURL) {
        try {
            const checkpointURL = modelURL + "model.json";
            const metadataURL = modelURL + "metadata.json";

            this.model = await tmImage.load(checkpointURL, metadataURL);
            this.maxPredictions = this.model.getTotalClasses();

            const flip = true; 
            this.webcam = new tmImage.Webcam(120, 90, flip);
            await this.webcam.setup();
            await this.webcam.play();
            
            document.getElementById("webcam-container").appendChild(this.webcam.canvas);
            this.isActive = true;
            document.getElementById('ia-status-label').textContent = "ONLINE";
            document.getElementById('ia-status-label').style.color = "#00FF00";
            
            this.loop();
            return true;
        } catch (e) {
            console.error("Erro IA:", e);
            alert("Falha ao carregar modelo IA. Verifique a URL.");
            return false;
        }
    }

    async loop() {
        if (!this.isActive) return;
        this.webcam.update();
        await this.predict();
        window.requestAnimationFrame(() => this.loop());
    }

    async predict() {
        const prediction = await this.model.predict(this.webcam.canvas);
        let highestProb = 0;
        let bestClass = "None";

        for (let i = 0; i < this.maxPredictions; i++) {
            if (prediction[i].probability > highestProb) {
                highestProb = prediction[i].probability;
                bestClass = prediction[i].className;
            }
        }

        // Logic: Confidence >= 80%
        if (highestProb >= 0.8) {
            this.currentPrediction = bestClass;
        }
    }
}

// MAIN ENGINE
const game = {
    canvas: null,
    ctx: null,
    grid: 20,
    tileCount: 40, // 800/20
    snake: [],
    dx: 0, dy: -1,
    food: null,
    coins: [],
    score: 0,
    sessionCoins: 0,
    startTime: 0,
    isPlaying: false,
    speed: 120,
    enemy: { body: [], speed: 2 }, // enemy speed counter
    
    // Components
    tableMachine: new TableMachine(),
    antigravity: new AntigravityOrchestrator(),
    ia: new IAManager(),

    init() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.setupListeners();
    },

    setupListeners() {
        document.getElementById('btn-play').onclick = () => this.start();
        document.getElementById('btn-restart').onclick = () => this.start();
        document.getElementById('btn-setup-ia').onclick = () => this.toggleMenu('ia-menu');
        document.getElementById('btn-worlds').onclick = () => this.toggleMenu('world-menu');
        
        // FIX: Voltar button behavior
        document.getElementById('btn-close-worlds').onclick = () => this.toggleMenu('main-menu');
        document.getElementById('btn-close-ia').onclick = () => this.toggleMenu('main-menu');
        document.getElementById('btn-back-menu').onclick = () => this.toggleMenu('main-menu');

        document.getElementById('btn-start-ia').onclick = async () => {
            const url = document.getElementById('ia-model-url').value;
            if (url) await this.ia.init(url);
            else alert("URL Necessária!");
        };

        document.getElementById('btn-download-json').onclick = () => this.tableMachine.exportJSON();

        window.addEventListener('keydown', e => this.handleInput(e));
    },

    toggleMenu(menuId) {
        document.querySelectorAll('.menu-content').forEach(m => m.classList.add('hidden'));
        document.getElementById(menuId).classList.remove('hidden');
        document.getElementById('overlay-menu').classList.remove('hidden');
    },

    start() {
        this.snake = [{x: 20, y: 20}, {x: 20, y: 21}, {x: 20, y: 22}];
        this.dx = 0; this.dy = -1;
        this.score = 0;
        this.sessionCoins = 0;
        this.speed = 120;
        this.startTime = Date.now();
        this.spawnFood();
        this.coins = [];
        this.enemy.body = [{x: 5, y: 5}, {x: 5, y: 6}, {x: 5, y: 7}];
        
        this.isPlaying = true;
        document.getElementById('overlay-menu').classList.add('hidden');
        this.loop();
    },

    loop() {
        if (!this.isPlaying) return;
        
        // IA Control Check
        if (this.ia.isActive) {
            this.handleIAGesture(this.ia.currentPrediction);
        }

        setTimeout(() => {
            this.update();
            this.draw();
            this.loop();
        }, this.speed);
    },

    handleIAGesture(gesture) {
        // Modern turning logic based on gestural rotation
        if (gesture === "None") return;
        
        // Use relative turning based on current direction
        // Mão Aberta -> Girar Direita | Punho Fechado -> Girar Esquerda
        if (gesture === "Mão Aberta") {
            this.rotateSnake(1); // 1 = Clockwise
        } else if (gesture === "Punho Fechado") {
            this.rotateSnake(-1); // -1 = Counter-clockwise
        }
    },

    rotateSnake(dir) {
        // Simple rotation mapping
        const currentDx = this.dx;
        const currentDy = this.dy;
        
        if (dir === 1) { // Right turn
            this.dx = -currentDy;
            this.dy = currentDx;
        } else { // Left turn
            this.dx = currentDy;
            this.dy = -currentDx;
        }
        // Force cleanup prediction to avoid spinning
        this.ia.currentPrediction = "None";
    },

    handleInput(e) {
        const key = e.key.toLowerCase();
        if ((key === 'arrowup' || key === 'w') && this.dy === 0) { this.dx = 0; this.dy = -1; }
        if ((key === 'arrowdown' || key === 's') && this.dy === 0) { this.dx = 0; this.dy = 1; }
        if ((key === 'arrowleft' || key === 'a') && this.dx === 0) { this.dx = -1; this.dy = 0; }
        if ((key === 'arrowright' || key === 'd') && this.dx === 0) { this.dx = 1; this.dy = 0; }
    },

    update() {
        const head = { x: this.snake[0].x + this.dx, y: this.snake[0].y + this.dy };
        
        // FIX: Collision Detection (Strict grid)
        if (head.x < 0 || head.x >= this.tileCount || head.y < 0 || head.y >= this.tileCount) {
            return this.gameOver("WALL COLLISION");
        }

        for (let s of this.snake) {
            if (head.x === s.x && head.y === s.y) return this.gameOver("SELF COLLISION");
        }

        // Enemy collision
        for (let e of this.enemy.body) {
            if (head.x === e.x && head.y === e.y) return this.gameOver("FATAL ENEMY ENCOUNTER");
        }

        this.snake.unshift(head);

        // Check Food
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            this.spawnFood();
            this.antigravity.processFruit(this.sessionCoins);
        } else {
            this.snake.pop();
        }

        // Check Coins
        const coinIndex = this.coins.findIndex(c => c.x === head.x && c.y === head.y);
        if (coinIndex !== -1) {
            this.coins.splice(coinIndex, 1);
            this.sessionCoins++;
            document.getElementById('coins').textContent = this.sessionCoins;
            
            // Antigravity Orchestration: Progress Difficulty
            if (this.antigravity.processFruit(this.sessionCoins)) {
                this.speed = Math.max(50, this.speed - 10); // Faster
                this.enemy.speed = Math.max(1, this.enemy.speed - 1); // Enemy logic faster? 
            }
        }

        this.updateEnemy();
        document.getElementById('score').textContent = this.score;
    },

    updateEnemy() {
        // AI Predator: Moves toward player
        const eHead = this.enemy.body[0];
        const pHead = this.snake[0];
        
        const possibleMoves = [{x:0,y:-1}, {x:0,y:1}, {x:-1,y:0}, {x:1,y:0}];
        let best = possibleMoves[0];
        let minDist = Infinity;

        possibleMoves.forEach(m => {
            const nx = eHead.x + m.x;
            const ny = eHead.y + m.y;
            const dist = Math.abs(nx - pHead.x) + Math.abs(ny - pHead.y);
            if (dist < minDist) { minDist = dist; best = m; }
        });

        this.enemy.body.unshift({x: eHead.x + best.x, y: eHead.y + best.y});
        this.enemy.body.pop();
    },

    draw() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, 800, 800);

        // Draw HUD lines (Minimalist)
        this.ctx.strokeStyle = 'rgba(255, 0, 255, 0.05)';
        for(let i=0; i<800; i+=this.grid) {
            this.ctx.beginPath(); this.ctx.moveTo(i, 0); this.ctx.lineTo(i, 800); this.ctx.stroke();
            this.ctx.beginPath(); this.ctx.moveTo(0, i); this.ctx.lineTo(800, i); this.ctx.stroke();
        }

        // Draw Player (Neon Pink)
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = '#FF00FF';
        this.ctx.fillStyle = '#FF00FF';
        this.snake.forEach(s => {
            this.ctx.fillRect(s.x * this.grid + 1, s.y * this.grid + 1, this.grid - 2, this.grid - 2);
        });

        // Draw Enemy (Dark Purple/Pink)
        this.ctx.shadowColor = '#8A2BE2';
        this.ctx.fillStyle = '#8A2BE2';
        this.enemy.body.forEach(e => {
            this.ctx.fillRect(e.x * this.grid + 1, e.y * this.grid + 1, this.grid - 2, this.grid - 2);
        });

        // Draw Food
        this.ctx.shadowColor = '#FF00FF';
        this.ctx.fillStyle = '#FF00FF';
        this.ctx.beginPath();
        this.ctx.arc(this.food.x * this.grid + this.grid/2, this.food.y * this.grid + this.grid/2, this.grid/3, 0, Math.PI*2);
        this.ctx.fill();

        // Draw Coins
        this.ctx.fillStyle = '#FFF'; 
        this.ctx.shadowColor = '#FFF';
        this.coins.forEach(c => {
            this.ctx.beginPath();
            this.ctx.arc(c.x * this.grid + this.grid/2, c.y * this.grid + this.grid/2, this.grid/4, 0, Math.PI*2);
            this.ctx.fill();
        });

        this.ctx.shadowBlur = 0;
    },

    spawnFood() {
        this.food = { 
            x: Math.floor(Math.random() * this.tileCount), 
            y: Math.floor(Math.random() * this.tileCount) 
        };
        // Randomly spawn coins
        if (Math.random() > 0.7) {
            this.coins.push({
                x: Math.floor(Math.random() * this.tileCount), 
                y: Math.floor(Math.random() * this.tileCount)
            });
        }
    },

    gameOver(reason) {
        this.isPlaying = false;
        this.tableMachine.logGame(this.score, this.sessionCoins, this.startTime);
        this.tableMachine.renderTable(document.getElementById('stats-log'));
        this.toggleMenu('game-over');
    }
};

document.addEventListener('DOMContentLoaded', () => game.init());
