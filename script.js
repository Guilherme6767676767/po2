/**
 * ANTIGRAVITY SNAKE ENGINE v3.1 - INTERFACE & IA VERIFIED
 */

class TableMachine {
    constructor() { this.history = []; }
    log(score, coins, start) {
        const time = Math.floor((Date.now() - start) / 1000);
        this.history.push({ points: score, moedas: coins, tempo: `${time}s` });
    }
    render(container) {
        if (!container) return;
        const last = this.history[this.history.length - 1];
        container.innerHTML = `
            <table>
                <tr><td>POINTS</td><td>${last.points}</td></tr>
                <tr><td>COINS</td><td>${last.moedas}</td></tr>
                <tr><td>SURVIVAL</td><td>${last.tempo}</td></tr>
            </table>
        `;
    }
    export() {
        const data = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.history));
        const a = document.createElement('a'); a.href = data; a.download = "snake.json"; a.click();
    }
}

class IAManager {
    constructor() {
        this.model = null; this.webcam = null; this.isActive = false;
        this.currentClass = "DEFAULT";
        this.colorPalette = {
            "Red": "#400", "Vermelho": "#400", "Blue": "#004", "Azul": "#004",
            "Green": "#040", "Verde": "#040", "Yellow": "#440", "Amarelo": "#440"
        };
    }

    async loadModel(url) {
        const status = document.getElementById('model-status');
        try {
            status.textContent = "Status: Carregando...";
            this.model = await tmImage.load(url + "model.json", url + "metadata.json");
            status.textContent = "Status: Modelo Carregado!";
            return true;
        } catch (e) {
            status.textContent = "Status: Erro no Link.";
            return false;
        }
    }

    async startWebcam() {
        if (!this.model) return alert("Carregue o modelo primeiro!");
        this.webcam = new tmImage.Webcam(120, 90, true);
        await this.webcam.setup(); await this.webcam.play();
        const container = document.getElementById("webcam-container");
        container.innerHTML = ""; container.appendChild(this.webcam.canvas);
        this.isActive = true;
        this.loop();
    }

    async loop() {
        if (!this.isActive) return;
        this.webcam.update();
        await this.predict(this.webcam.canvas);
        window.requestAnimationFrame(() => this.loop());
    }

    async predict(element) {
        if (!this.model) return;
        const prediction = await this.model.predict(element);
        let best = { prob: 0, class: "" };
        prediction.forEach(p => { if (p.probability > best.prob) best = { prob: p.probability, class: p.className }; });

        if (best.prob > 0.8 && best.class !== this.currentClass) {
            this.currentClass = best.class;
            document.getElementById('ia-current-class').textContent = this.currentClass;
            this.applyColor(this.currentClass);
        }
    }

    async handleUpload(file) {
        if (!this.model) return alert("Carregue o modelo primeiro!");
        const img = document.getElementById('upload-preview');
        const reader = new FileReader();
        reader.onload = async (e) => {
            img.src = e.target.result;
            img.onload = async () => {
                await this.predict(img);
            };
        }
        reader.readAsDataURL(file);
    }

    applyColor(className) {
        const color = this.colorPalette[className] || "#000000";
        document.body.style.backgroundColor = color;
    }
}

const Engine = {
    state: { score: 0, coins: 0, difficulty: 'easy', start: 0, playing: false },
    diffs: {
        easy: { speed: 140, entropy: 0.5 },
        medium: { speed: 100, entropy: 1.0 },
        hard: { speed: 70, entropy: 1.5 }
    },
    snake: [], dx: 0, dy: -1,
    enemy: { body: [] },
    food: null, gold: [],

    tables: new TableMachine(),
    ia: new IAManager(),

    init() {
        this.cvs = document.getElementById('gameCanvas');
        this.ctx = this.cvs.getContext('2d');
        this.bind();
    },

    bind() {
        // Main Navigation
        document.getElementById('btn-play').onclick = () => this.boot();
        document.getElementById('btn-setup-ia').onclick = () => this.show('ia-menu');
        
        // Difficulty
        ['easy', 'medium', 'hard'].forEach(id => {
            const btn = document.getElementById(`diff-${id}`);
            btn.onclick = () => {
                document.querySelectorAll('.btn-diff').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.state.difficulty = id;
            };
        });

        // IA Functions
        document.getElementById('btn-load-model').onclick = () => {
            const url = document.getElementById('ia-model-url').value;
            if (url) this.ia.loadModel(url);
        };
        document.getElementById('btn-start-webcam').onclick = () => this.ia.startWebcam();
        document.getElementById('ia-image-upload').onchange = (e) => this.ia.handleUpload(e.target.files[0]);
        document.getElementById('btn-close-ia').onclick = () => this.show('main-menu');

        // Game Over Functions
        document.getElementById('btn-restart').onclick = () => this.boot();
        document.getElementById('btn-back-menu').onclick = () => this.show('main-menu');
        document.getElementById('btn-download-json').onclick = () => this.tables.export();

        window.onkeydown = (e) => this.keys(e);
    },

    show(id) {
        document.querySelectorAll('.menu-content').forEach(m => m.classList.add('hidden'));
        document.getElementById(id).classList.remove('hidden');
        document.getElementById('overlay-menu').classList.remove('hidden');
    },

    boot() {
        this.state.score = 0; this.state.coins = 0;
        this.snake = [{x:20, y:20}, {x:20, y:21}, {x:20, y:22}];
        this.enemy.body = [{x:5, y:5}, {x:5, y:6}];
        this.dx = 0; this.dy = -1;
        this.state.start = Date.now();
        this.state.playing = true;
        document.getElementById('overlay-menu').classList.add('hidden');
        this.spawn();
        this.loop();
    },

    loop() {
        if (!this.state.playing) return;
        const currentSpeed = this.diffs[this.state.difficulty].speed;
        // Increase speed based on coins and entropy
        const dynamicSpeed = Math.max(40, currentSpeed - (this.state.coins * 5 * this.diffs[this.state.difficulty].entropy));
        
        setTimeout(() => {
            this.update();
            this.draw();
            this.loop();
        }, dynamicSpeed);
    },

    update() {
        const head = { x: this.snake[0].x + this.dx, y: this.snake[0].y + this.dy };
        if (head.x < 0 || head.x >= 40 || head.y < 0 || head.y >= 40) return this.die();
        if (this.snake.some(s => s.x === head.x && s.y === head.y)) return this.die();
        if (this.enemy.body.some(e => e.x === head.x && e.y === head.y)) return this.die();

        this.snake.unshift(head);

        if (head.x === this.food.x && head.y === this.food.y) {
            this.state.score += 10;
            this.spawn();
        } else {
            this.snake.pop();
        }

        const gIdx = this.gold.findIndex(g => g.x === head.x && g.y === head.y);
        if (gIdx !== -1) {
            this.gold.splice(gIdx, 1);
            this.state.coins++;
            // Update Antigravity Bar
            document.getElementById('antigravity-bar').style.width = `${(this.state.coins % 5 / 5) * 100}%`;
        }

        this.aiEnemy();
        this.hud();
    },

    aiEnemy() {
        const eh = this.enemy.body[0];
        const target = this.snake[0];
        const moves = [{x:0, y:-1}, {x:0, y:1}, {x:-1, y:0}, {x:1, y:0}];
        let best = moves[0]; let min = Infinity;
        moves.forEach(m => {
            const nx = eh.x + m.x, ny = eh.y + m.y;
            const d = Math.abs(nx - target.x) + Math.abs(ny - target.y);
            if (d < min) { min = d; best = m; }
        });
        this.enemy.body.unshift({x: eh.x + best.x, y: eh.y + best.y});
        this.enemy.body.pop();
    },

    draw() {
        this.ctx.fillStyle = 'rgba(0,0,0,0.8)';
        this.ctx.fillRect(0,0,800,800);
        this.ctx.shadowBlur = 10; this.ctx.shadowColor = '#F0F';
        this.ctx.fillStyle = '#F0F';
        this.snake.forEach(s => this.ctx.fillRect(s.x*20+1, s.y*20+1, 18, 18));
        this.ctx.fillStyle = '#8A2BE2';
        this.enemy.body.forEach(e => this.ctx.fillRect(e.x*20+1, e.y*20+1, 18, 18));
        this.ctx.fillStyle = '#F0F';
        this.ctx.beginPath(); this.ctx.arc(this.food.x*20+10, this.food.y*20+10, 6, 0, Math.PI*2); this.ctx.fill();
        this.ctx.fillStyle = '#FFF';
        this.gold.forEach(g => {
            this.ctx.beginPath(); this.ctx.arc(g.x*20+10, g.y*20+10, 4, 0, Math.PI*2); this.ctx.fill();
        });
        this.ctx.shadowBlur = 0;
    },

    spawn() {
        this.food = { x: Math.floor(Math.random()*40), y: Math.floor(Math.random()*40) };
        if (Math.random()>0.7 && this.gold.length < 3) this.gold.push({ x: Math.floor(Math.random()*40), y: Math.floor(Math.random()*40) });
    },

    keys(e) {
        const k = e.key.toLowerCase();
        if ((k === 'arrowup' || k === 'w') && this.dy === 0) { this.dx = 0; this.dy = -1; }
        if ((k === 'arrowdown' || k === 's') && this.dy === 0) { this.dx = 0; this.dy = 1; }
        if ((k === 'arrowleft' || k === 'a') && this.dx === 0) { this.dx = -1; this.dy = 0; }
        if ((k === 'arrowright' || k === 'd') && this.dx === 0) { this.dx = 1; this.dy = 0; }
    },

    hud() {
        document.getElementById('score').textContent = this.state.score;
        document.getElementById('coins').textContent = this.state.coins;
    },

    die() {
        this.state.playing = false;
        this.tables.log(this.state.score, this.state.coins, this.state.start);
        this.tables.render(document.getElementById('stats-log'));
        this.show('game-over');
    }
};

document.addEventListener('DOMContentLoaded', () => Engine.init());
