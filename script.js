/**
 * ANTIGRAVITY SNAKE ENGINE v3.2 - BASIC MODE
 * Senior Developer Fix: Added Native Color Extraction from Images
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
        container.innerHTML = `<table><tr><td>POINTS</td><td>${last.points}</td></tr><tr><td>COINS</td><td>${last.moedas}</td></tr><tr><td>TIME</td><td>${last.tempo}</td></tr></table>`;
    }
    export() {
        const data = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.history));
        const a = document.createElement('a'); a.href = data; a.download = "stats.json"; a.click();
    }
}

class IAManager {
    constructor() {
        this.model = null; this.webcam = null; this.isActive = false;
        this.currentClass = "DEFAULT";
    }

    // MODO BÁSICO: Extrai a cor média real de qualquer imagem sem precisar de IA
    extractAverageColor(imgElement) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 1; canvas.height = 1; 
        ctx.drawImage(imgElement, 0, 0, 1, 1);
        const data = ctx.getImageData(0, 0, 1, 1).data;
        // Aplicamos um escurecimento (0.4) para manter o tema neon legível
        return `rgb(${Math.floor(data[0]*0.4)}, ${Math.floor(data[1]*0.4)}, ${Math.floor(data[2]*0.4)})`;
    }

    async loadModel(url) {
        const status = document.getElementById('model-status');
        try {
            status.textContent = "Status: Carregando...";
            this.model = await tmImage.load(url + "model.json", url + "metadata.json");
            status.textContent = "Status: Modelo Ativo!";
            return true;
        } catch (e) {
            status.textContent = "Status: Off (Cores básicas via Upload ativas)";
            return false;
        }
    }

    async startWebcam() {
        if (!this.model) return alert("Carregue o modelo primeiro para usar Webcam!");
        this.webcam = new tmImage.Webcam(120, 90, true);
        await this.webcam.setup(); await this.webcam.play();
        document.getElementById("webcam-container").innerHTML = "";
        document.getElementById("webcam-container").appendChild(this.webcam.canvas);
        this.isActive = true;
        this.loop();
    }

    async loop() {
        if (!this.isActive) return;
        this.webcam.update();
        const prediction = await this.model.predict(this.webcam.canvas);
        this.handlePrediction(prediction);
        window.requestAnimationFrame(() => this.loop());
    }

    handlePrediction(prediction) {
        let best = { prob: 0, class: "" };
        prediction.forEach(p => { if (p.probability > best.prob) best = { prob: p.probability, class: p.className }; });
        if (best.prob > 0.8 && best.class !== this.currentClass) {
            this.currentClass = best.class;
            document.getElementById('ia-current-class').textContent = this.currentClass;
            this.applyColorByClass(this.currentClass);
        }
    }

    applyColorByClass(name) {
        const map = { "Red": "#300", "Vermelho": "#300", "Blue": "#003", "Azul": "#003", "Green": "#030", "Verde": "#030" };
        if (map[name]) document.body.style.backgroundColor = map[name];
    }

    async handleUpload(file) {
        const img = document.getElementById('upload-preview');
        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target.result;
            img.onload = () => {
                // PRIMEIRO: Extrair a cor física da imagem (Funciona sempre!)
                const pickedColor = this.extractAverageColor(img);
                document.body.style.backgroundColor = pickedColor;
                document.getElementById('ia-current-class').textContent = "COLOR DETECTED";
                
                // SEGUNDO: Se tiver modelo de IA, tenta classificar lógico
                if (this.model) this.model.predict(img).then(p => this.handlePrediction(p));
            };
        }
        reader.readAsDataURL(file);
    }
}

const Engine = {
    state: { score: 0, coins: 0, difficulty: 'easy', start: 0, playing: false },
    diffs: { easy: { speed: 140 }, medium: { speed: 100 }, hard: { speed: 70 } },
    snake: [], dx: 0, dy: -1, enemy: { body: [] }, food: null, gold: [],
    tables: new TableMachine(),
    ia: new IAManager(),

    init() {
        this.cvs = document.getElementById('gameCanvas');
        this.ctx = this.cvs.getContext('2d');
        this.bind();
    },

    bind() {
        document.getElementById('btn-play').onclick = () => this.boot();
        document.getElementById('btn-setup-ia').onclick = () => this.show('ia-menu');
        
        ['easy', 'medium', 'hard'].forEach(id => {
            const btn = document.getElementById(`diff-${id}`);
            if (btn) btn.onclick = (e) => {
                document.querySelectorAll('.btn-diff').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.state.difficulty = id;
            };
        });

        document.getElementById('btn-load-model').onclick = () => {
            const url = document.getElementById('ia-model-url').value;
            if (url) this.ia.loadModel(url);
        };
        document.getElementById('btn-start-webcam').onclick = () => this.ia.startWebcam();
        document.getElementById('ia-image-upload').onchange = (e) => this.ia.handleUpload(e.target.files[0]);
        document.getElementById('btn-close-ia').onclick = () => this.show('main-menu');
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
        setTimeout(() => {
            this.update();
            this.draw();
            this.loop();
        }, this.diffs[this.state.difficulty].speed - (this.state.coins * 2));
    },

    update() {
        const head = { x: this.snake[0].x + this.dx, y: this.snake[0].y + this.dy };
        if (head.x < 0 || head.x >= 40 || head.y < 0 || head.y >= 40) return this.die();
        if (this.snake.some(s => s.x === head.x && s.y === head.y)) return this.die();
        if (this.enemy.body.some(e => e.x === head.x && e.y === head.y)) return this.die();
        this.snake.unshift(head);
        if (head.x === this.food.x && head.y === this.food.y) { this.state.score += 10; this.spawn(); }
        else { this.snake.pop(); }
        const gIdx = this.gold.findIndex(g => g.x === head.x && g.y === head.y);
        if (gIdx !== -1) { this.gold.splice(gIdx, 1); this.state.coins++; }
        this.aiEnemy();
        document.getElementById('score').textContent = this.state.score;
        document.getElementById('coins').textContent = this.state.coins;
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
        this.gold.forEach(g => { this.ctx.beginPath(); this.ctx.arc(g.x*20+10, g.y*20+10, 4, 0, Math.PI*2); this.ctx.fill(); });
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

    die() {
        this.state.playing = false;
        this.tables.log(this.state.score, this.state.coins, this.state.start);
        this.tables.render(document.getElementById('stats-log'));
        this.show('game-over');
    }
};

document.addEventListener('DOMContentLoaded', () => Engine.init());
