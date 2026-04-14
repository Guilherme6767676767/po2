/**
 * ANTIGRAVITY SNAKE ENGINE v3.0 - ADVANCED IA & ORCHESTRATION
 * Senior Game Architect & IA Systems Engineer
 */

class TableMachine {
    constructor() { this.history = []; }

    logGame(score, coins, startTime) {
        const timeSurvived = Math.floor((Date.now() - startTime) / 1000);
        const entry = { points: score, moedas: coins, tempo: `${timeSurvived}s`, date: new Date().toLocaleTimeString() };
        this.history.push(entry);
        return entry;
    }

    render(container) {
        const last = this.history[this.history.length - 1];
        if (!last) return;
        container.innerHTML = `
            <table>
                <tr><td>FINAL SCORE</td><td>${last.points}</td></tr>
                <tr><td>COINS COLECTED</td><td>${last.moedas}</td></tr>
                <tr><td>TIME ACTIVE</td><td>${last.tempo}</td></tr>
            </table>
        `;
    }

    exportJSON() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.history));
        const anchor = document.createElement('a');
        anchor.setAttribute("href", dataStr); anchor.setAttribute("download", "snake_logs.json");
        anchor.click();
    }
}

class AntigravityPhysics {
    constructor() { this.level = 0; }
    
    process(coins, difficultyFactor) {
        // Every 5 coins * difficultyFactor trigger progression
        const threshold = 5;
        if (coins > 0 && coins % threshold === 0) {
            this.level++;
            this.updateUI();
            return true;
        }
        this.updateUI(coins % threshold);
        return false;
    }

    updateUI(partial = 5) {
        const bar = document.getElementById('antigravity-bar');
        if (bar) bar.style.width = `${(partial / 5) * 100}%`;
    }
}

class DynamicIAManager {
    constructor() {
        this.model = null; this.webcam = null; this.isActive = false;
        this.currentClass = "None";
        // Map of probable class names to colors
        this.colorMap = {
            "Red": "#440000", "Vermelho": "#440000",
            "Blue": "#000044", "Azul": "#000044",
            "Green": "#004400", "Verde": "#004400",
            "Yellow": "#444400", "Amarelo": "#444400",
            "Purple": "#220044", "Roxo": "#220044",
            "Normal": "#000000", "Fundo": "#000000"
        };
    }

    async init(url) {
        try {
            this.model = await tmImage.load(url + "model.json", url + "metadata.json");
            this.webcam = new tmImage.Webcam(110, 85, true);
            await this.webcam.setup(); await this.webcam.play();
            document.getElementById("webcam-container").innerHTML = ""; // Clear
            document.getElementById("webcam-container").appendChild(this.webcam.canvas);
            this.isActive = true;
            this.loop();
            return true;
        } catch (e) { alert("IA Loader Error"); return false; }
    }

    async loop() {
        if (!this.isActive) return;
        this.webcam.update();
        await this.predict();
        window.requestAnimationFrame(() => this.loop());
    }

    async predict() {
        const prediction = await this.model.predict(this.webcam.canvas);
        let best = { prob: 0, className: "" };
        prediction.forEach(p => { if (p.probability > best.prob) best = p; });

        if (best.prob > 0.8 && best.className !== this.currentClass) {
            this.currentClass = best.className;
            document.getElementById('ia-current-class').textContent = this.currentClass;
            this.updateWorldColor(this.currentClass);
        }
    }

    updateWorldColor(className) {
        // Feature: IA sets World Background
        const color = this.colorMap[className] || this.generateColorFromText(className);
        document.body.style.backgroundColor = color;
    }

    generateColorFromText(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
        // Keep it dark and moody for the neon vibe
        const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
        const hex = "00000".substring(0, 6 - c.length) + c;
        return `#${hex.substring(0,2)}00${hex.substring(4,6)}`; // Darkened Red/Blue mix
    }
}

const Core = {
    // Engine State
    config: { grid: 20, tileCount: 40 },
    stats: { score: 0, coins: 0, difficulty: 'medium', startTime: 0 },
    difficultyMap: {
        easy: { speed: 150, entropy: 0.5, enemySpeed: 3 },
        medium: { speed: 100, entropy: 1.0, enemySpeed: 2 },
        hard: { speed: 60, entropy: 2.0, enemySpeed: 1 }
    },
    
    // Components
    tables: new TableMachine(),
    antigravity: new AntigravityPhysics(),
    ia: new DynamicIAManager(),

    // Game Objects
    snake: [], dx: 0, dy: -1,
    enemy: { body: [], tick: 0 },
    items: { food: null, gold: [] },
    
    init() {
        this.cvs = document.getElementById('gameCanvas');
        this.ctx = this.cvs.getContext('2d');
        this.bindEvents();
    },

    bindEvents() {
        document.getElementById('btn-play').onclick = () => this.boot();
        document.getElementById('btn-restart').onclick = () => this.boot();
        document.getElementById('btn-setup-ia').onclick = () => this.showMenu('ia-menu');
        document.getElementById('btn-start-ia').onclick = () => {
            const url = document.getElementById('ia-model-url').value;
            if(url) this.ia.init(url);
        };

        // Difficulty toggles
        document.querySelectorAll('.btn-diff').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.btn-diff').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.stats.difficulty = btn.dataset.diff;
            };
        });

        document.getElementById('btn-close-ia').onclick = () => this.showMenu('main-menu');
        document.getElementById('btn-back-menu').onclick = () => this.showMenu('main-menu');
        document.getElementById('btn-download-json').onclick = () => this.tables.exportJSON();
        window.onkeydown = (e) => this.input(e);
    },

    showMenu(id) {
        document.querySelectorAll('.menu-content').forEach(m => m.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
        document.getElementById('overlay-menu').classList.remove('hidden');
    },

    boot() {
        const settings = this.difficultyMap[this.stats.difficulty];
        this.stats.score = 0; this.stats.coins = 0;
        this.snake = [{x:20, y:20}, {x:20, y:21}, {x:20, y:22}];
        this.enemy.body = [{x:5, y:5}, {x:5, y:6}];
        this.dx = 0; this.dy = -1;
        this.stats.startTime = Date.now();
        this.currentSpeed = settings.speed;
        
        this.spawn();
        this.playing = true;
        document.getElementById('overlay-menu').classList.add('hidden');
        this.renderHUD();
        this.run();
    },

    run() {
        if (!this.playing) return;
        setTimeout(() => {
            this.tick();
            this.draw();
            this.run();
        }, this.currentSpeed);
    },

    tick() {
        const head = { x: this.snake[0].x + this.dx, y: this.snake[0].y + this.dy };
        const cfg = this.config;

        // Collision Logic
        if (head.x < 0 || head.x >= cfg.tileCount || head.y < 0 || head.y >= cfg.tileCount) return this.die("BOUNDARY BREACH");
        if (this.snake.some(s => s.x === head.x && s.y === head.y)) return this.die("SELF INTERSECTION");
        if (this.enemy.body.some(e => e.x === head.x && e.y === head.y)) return this.die("PREDATOR CONTACT");

        this.snake.unshift(head);

        // Consume Fruit
        if (head.x === this.items.food.x && head.y === this.items.food.y) {
            this.stats.score += 10;
            this.spawn();
        } else {
            this.snake.pop();
        }

        // Consume Gold
        const gIdx = this.items.gold.findIndex(g => g.x === head.x && g.y === head.y);
        if (gIdx !== -1) {
            this.items.gold.splice(gIdx, 1);
            this.stats.coins++;
            this.processDifficulty();
        }

        this.updateEnemy();
        this.renderHUD();
    },

    processDifficulty() {
        const set = this.difficultyMap[this.stats.difficulty];
        if (this.antigravity.process(this.stats.coins)) {
            // Speed increases based on entropy factor
            this.currentSpeed = Math.max(40, this.currentSpeed - (10 * set.entropy));
        }
    },

    updateEnemy() {
        const set = this.difficultyMap[this.stats.difficulty];
        this.enemy.tick++;
        if (this.enemy.tick % set.enemySpeed !== 0) return; // Difficulty determines predator speed

        const eH = this.enemy.body[0];
        const target = this.snake[0];
        const moves = [{x:0, y:-1}, {x:0, y:1}, {x:-1, y:0}, {x:1, y:0}];
        let best = moves[0]; let minD = Infinity;

        moves.forEach(m => {
            const nx = eH.x + m.x, ny = eH.y + m.y;
            const d = Math.abs(nx - target.x) + Math.abs(ny - target.y);
            if (d < minD) { minD = d; best = m; }
        });

        this.enemy.body.unshift({x: eH.x + best.x, y: eH.y + best.y});
        this.enemy.body.pop();
    },

    draw() {
        this.ctx.fillStyle = 'rgba(0,0,0,0.8)';
        this.ctx.fillRect(0, 0, 800, 800);

        // Player (Neon Pink)
        this.ctx.shadowBlur = 10; this.ctx.shadowColor = '#FF00FF';
        this.ctx.fillStyle = '#FF00FF';
        this.snake.forEach(s => this.ctx.fillRect(s.x*20+1, s.y*20+1, 18, 18));

        // Enemy (Purple)
        this.ctx.shadowColor = '#8A2BE2'; this.ctx.fillStyle = '#8A2BE2';
        this.enemy.body.forEach(e => this.ctx.fillRect(e.x*20+1, e.y*20+1, 18, 18));

        // Items
        this.ctx.shadowColor = '#FF00FF'; this.ctx.fillStyle = '#FF00FF';
        this.ctx.beginPath(); this.ctx.arc(this.items.food.x*20+10, this.items.food.y*20+10, 6, 0, Math.PI*2); this.ctx.fill();

        this.ctx.fillStyle = '#FFF'; this.ctx.shadowColor = '#FFF';
        this.items.gold.forEach(g => {
            this.ctx.beginPath(); this.ctx.arc(g.x*20+10, g.y*20+10, 4, 0, Math.PI*2); this.ctx.fill();
        });
        this.ctx.shadowBlur = 0;
    },

    spawn() {
        this.items.food = { x: Math.floor(Math.random()*40), y: Math.floor(Math.random()*40) };
        if (Math.random() > 0.6) this.items.gold.push({ x: Math.floor(Math.random()*40), y: Math.floor(Math.random()*40) });
    },

    input(e) {
        const k = e.key.toLowerCase();
        if ((k === 'arrowup' || k === 'w') && this.dy === 0) { this.dx = 0; this.dy = -1; }
        if ((k === 'arrowdown' || k === 's') && this.dy === 0) { this.dx = 0; this.dy = 1; }
        if ((k === 'arrowleft' || k === 'a') && this.dx === 0) { this.dx = -1; this.dy = 0; }
        if ((k === 'arrowright' || k === 'd') && this.dx === 0) { this.dx = 1; this.dy = 0; }
    },

    renderHUD() {
        document.getElementById('score').textContent = this.stats.score;
        document.getElementById('coins').textContent = this.stats.coins;
    },

    die(reason) {
        this.playing = false;
        this.tables.logGame(this.stats.score, this.stats.coins, this.stats.startTime);
        this.tables.render(document.getElementById('stats-log'));
        this.showMenu('game-over');
    }
};

document.addEventListener('DOMContentLoaded', () => Core.init());
