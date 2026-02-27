const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const holdCanvas = document.getElementById('holdCanvas');
const holdCtx = holdCanvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');

// 縮放設定
context.scale(20, 20);      // 主畫面 240/20 = 12格寬
holdCtx.scale(20, 20);     // 暫存畫面 100/20 = 5格寬
nextCtx.scale(20, 20);     // 預覽畫面 100/20 = 5格寬

const colors = [null, '#FF0D72', '#0DC2FF', '#0DFF72', '#F538FF', '#FF8E0D', '#FFE138', '#3877FF'];

function createPiece(type) {
    if (type === 'I') return [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]];
    if (type === 'L') return [[0, 2, 0], [0, 2, 0], [0, 2, 2]];
    if (type === 'J') return [[0, 3, 0], [0, 3, 0], [3, 3, 0]];
    if (type === 'O') return [[4, 4], [4, 4]];
    if (type === 'Z') return [[5, 5, 0], [0, 5, 5], [0, 0, 0]];
    if (type === 'S') return [[0, 6, 6], [6, 6, 0], [0, 0, 0]];
    if (type === 'T') return [[0, 7, 0], [7, 7, 7], [0, 0, 0]];
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

// 初始化預覽隊列
function refillNext() {
    while (nextPieces.length < 6) {
        nextPieces.push(PIECES[Math.floor(Math.random() * PIECES.length)]);
    }
}

// 繪製預覽窗格
function drawPreview(ctx, matrix, offset = {x: 1, y: 1}) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 5, 5); // 清除背景
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
        drawPreview(nextCtx, matrix, {x: 1, y: i * 4 + 1});
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
    drawPreview(holdCtx, createPiece(player.hold));
}

// 輔助函式：從矩陣抓取類型
function getTypeName(matrix) {
    for (let row of matrix) {
        for (let val of row) {
            if (val !== 0) return PIECES[val - 1];
        }
    }
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

function draw() {
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);
    drawMatrix(arena, {x: 0, y: 0}, context);
    drawMatrix(player.matrix, player.pos, context);
}

function drawMatrix(matrix, offset, ctx) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                ctx.fillStyle = colors[value];
                ctx.fillRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

document.addEventListener('keydown', event => {
    if (event.keyCode === 37) playerMove(-1);        // Left
    else if (event.keyCode === 39) playerMove(1);     // Right
    else if (event.keyCode === 40) playerDrop();      // Down
    else if (event.keyCode === 38) playerRotate(1);   // Up (Rotate)
    else if (event.keyCode === 32) hardDrop();        // Space (Hard Drop)
    else if (event.keyCode === 16) playerHold();      // Shift (Hold)
});

playerReset();
update();


