const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const holdCanvas = document.getElementById('holdCanvas');
const holdCtx = holdCanvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreElement = document.getElementById('score');

// 縮放設定
context.scale(20, 20);
holdCtx.scale(20, 20);
nextCtx.scale(20, 20);

// 方塊顏色 (增加透明度版本供影子使用)
const colors = [
    null,
    '#FF0D72', // T
    '#0DC2FF', // I
    '#0DFF72', // S
    '#F538FF', // Z
    '#FF8E0D', // L
    '#FFE138', // O
    '#3877FF'  // J
];

function createPiece(type) {
    if (type === 'I') return [[0, 2, 0, 0], [0, 2, 0, 0], [0, 2, 0, 0], [0, 2, 0, 0]];
    if (type === 'L') return [[0, 5, 0], [0, 5, 0], [0, 5, 5]];
    if (type === 'J') return [[0, 7, 0], [0, 7, 0], [7, 7, 0]];
    if (type === 'O') return [[6, 6], [6, 6]];
    if (type === 'Z') return [[4, 4, 0], [0, 4, 4], [0, 0, 0]];
    if (type === 'S') return [[0, 3, 3], [3, 3, 0], [0, 0, 0]];
    if (type === 'T') return [[0, 1, 0], [1, 1, 1], [0, 0, 0]];
}

const arena = Array.from({length: 20}, () => Array(12).fill(0));

const player = {
    pos: {x: 0, y: 0},
    matrix: null,
    score: 0,
    hold: null,
    canHold: true
};

let nextPieces = [];
const PIECES = 'ILJOTSZ';

function refillNext() {
    while (nextPieces.length < 10) {
        let shuffle = PIECES.split('').sort(() => Math.random() - 0.5);
        nextPieces.push(...shuffle);
    }
}

// --- 新增：繪製網格背景 ---
function drawGrid() {
    context.lineWidth = 0.05; // 線條要非常細
    context.strokeStyle = 'rgba(255, 255, 255, 0.2)'; // 半透明白色

    // 畫直向線
    for (let x = 0; x <= arena[0].length; x++) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, arena.length);
        context.stroke();
    }
    // 畫橫向線
    for (let y = 0; y <= arena.length; y++) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(arena[0].length, y);
        context.stroke();
    }
}

// --- 新增：計算並繪製影子 (Ghost Piece) ---
function drawGhost() {
    // 複製玩家位置
    let ghostPos = { x: player.pos.x, y: player.pos.y };
    
    // 模擬下墜直到碰撞
    while (!collide(arena, { pos: { x: ghostPos.x, y: ghostPos.y + 1 }, matrix: player.matrix })) {
        ghostPos.y++;
    }

    // 繪製影子
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                context.fillStyle = 'rgba(255, 255, 255, 0.15)'; // 淡淡的白色影子
                context.fillRect(x + ghostPos.x, y + ghostPos.y, 1, 1);
                // 加個框框更有質感
                context.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                context.lineWidth = 0.05;
                context.strokeRect(x + ghostPos.x, y + ghostPos.y, 1, 1);
            }
        });
    });
}

function draw() {
    // 填滿背景黑底
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);

    drawGrid();      // 1. 先畫格子
    drawGhost();     // 2. 再畫影子
    drawMatrix(arena, {x: 0, y: 0}, context); // 3. 畫已經在地上的方塊
    drawMatrix(player.matrix, player.pos, context); // 4. 最後畫玩家正在動的方塊
}

function drawMatrix(matrix, offset, ctx) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                ctx.fillStyle = colors[value];
                ctx.fillRect(x + offset.x, y + offset.y, 1, 1);
                
                // 為方塊加上細微的邊框，讓格子感更明顯
                ctx.strokeStyle = 'rgba(0,0,0,0.5)';
                ctx.lineWidth = 0.05;
                ctx.strokeRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

// 預覽與暫存的繪製功能
function drawPreview(ctx, matrix, offset = {x: 1, y: 1}) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 5, 5);
    if (!matrix) return;
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                ctx.fillStyle = colors[value];
                ctx.fillRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

function updateNextDisplay() {
    nextCtx.fillStyle = '#000';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    for (let i = 0; i < 5; i++) {
        const matrix = createPiece(nextPieces[i]);
        // 根據方塊形狀微調顯示位置(中心化)
        const offsetX = (5 - matrix[0].length) / 2;
        drawPreview(nextCtx, matrix, {x: offsetX, y: i * 4 + 0.5});
    }
}

function playerReset() {
    refillNext();
    const type = nextPieces.shift();
    player.matrix = createPiece(type);
    player.pos.y = 0;
    player.pos.x = Math.floor(arena[0].length / 2) - Math.floor(player.matrix[0].length / 2);
    player.canHold = true;
    updateNextDisplay();

    if (collide(arena, player)) {
        arena.forEach(row => row.fill(0));
        player.score = 0;
        updateScore();
    }
}

function playerHold() {
    if (!player.canHold) return;
    const currentType = getTypeName(player.matrix);
    
    holdCtx.fillStyle = '#000';
    holdCtx.fillRect(0, 0, holdCanvas.width, holdCanvas.height);

    if (!player.hold) {
        player.hold = currentType;
        playerReset();
    } else {
        const temp = player.hold;
        player.hold = currentType;
        player.matrix = createPiece(temp);
        player.pos.y = 0;
        player.pos.x = Math.floor(arena[0].length / 2) - Math.floor(player.matrix[0].length / 2);
    }
    player.canHold = false;
    const holdMatrix = createPiece(player.hold);
    const offsetX = (5 - holdMatrix[0].length) / 2;
    drawPreview(holdCtx, holdMatrix, {x: offsetX, y: 1});
}

function getTypeName(matrix) {
    const flat = matrix.flat();
    const val = flat.find(v => v !== 0);
    return PIECES[val - 1] || 'T';
}

function hardDrop() {
    while (!collide(arena, player)) {
        player.pos.y++;
    }
    player.pos.y--;
    merge(arena, player);
    playerReset();
    arenaSweep();
    dropCounter = 0;
}

function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 && (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }
    if (dir > 0) matrix.forEach(row => row.reverse());
    else matrix.reverse();
}

function arenaSweep() {
    let rowCount = 1;
    outer: for (let y = arena.length - 1; y > 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) continue outer;
        }
        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        ++y;
        player.score += rowCount * 10;
        rowCount *= 2;
    }
    updateScore();
}

function updateScore() {
    scoreElement.innerText = player.score;
}

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
    }
    dropCounter = 0;
}

function playerMove(dir) {
    player.pos.x += dir;
    if (collide(arena, player)) {
        player.pos.x -= dir;
    }
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;

function update(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }
    draw();
    requestAnimationFrame(update);
}

document.addEventListener('keydown', event => {
    if (event.keyCode === 37) playerMove(-1);
    else if (event.keyCode === 39) playerMove(1);
    else if (event.keyCode === 40) playerDrop();
    else if (event.keyCode === 38) playerRotate(1);
    else if (event.keyCode === 32) { event.preventDefault(); hardDrop(); }
    else if (event.keyCode === 16) { event.preventDefault(); playerHold(); }
});

playerReset();
update();
