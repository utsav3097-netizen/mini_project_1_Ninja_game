const canvas = document.getElementById('game-canvas');
const context = canvas.getContext('2d');
const startButton = document.getElementById('start-button');
const overlay = document.getElementById('start-overlay');
const overlayKicker = document.getElementById('overlay-kicker');
const overlayTitle = document.getElementById('overlay-title');
const overlayCopy = document.getElementById('overlay-copy');
const statusMessage = document.getElementById('status-message');
const phaseLabel = document.getElementById('phase-label');
const fighterName = document.getElementById('fighter-name');
const leaderboard = document.getElementById('leaderboard-list');
const leaderboardMessage = document.getElementById('leaderboard-message');
const scoreValue = document.getElementById('score-value');
const bestValue = document.getElementById('best-value');
const roundValue = document.getElementById('round-value');
const comboValue = document.getElementById('combo-value');
const playerHealthFill = document.getElementById('player-health-fill');
const playerHealthText = document.getElementById('player-health-text');
const playerStaminaFill = document.getElementById('player-stamina-fill');
const playerStaminaText = document.getElementById('player-stamina-text');
const enemyHealthFill = document.getElementById('enemy-health-fill');
const enemyHealthText = document.getElementById('enemy-health-text');
const enemyNameText = document.getElementById('enemy-name-text');
const controlButtons = [...document.querySelectorAll('[data-control]')];

const palette = {
    ink: '#10262b',
    shadow: '#18353b',
    hill: '#294b43',
    hillLight: '#496a52',
    ground: '#172f2b',
    cream: '#f2ead8',
    lime: '#d4e57a',
    coral: '#f0785b',
    red: '#d95a52',
};

const ninjaSprite = new Image();
ninjaSprite.src = '/static/assets/ninja.svg';

const enemyTypes = [
    { name: 'Ronin', sprite: '/static/assets/oni.svg', health: 72, damage: 13, speed: 100, points: 100, attackStyle: 'low', windup: 0.6, recovery: 0.7, scale: 0.86, height: 0 },
    { name: 'Brute', sprite: '/static/assets/brute.svg', health: 142, damage: 25, speed: 63, points: 220, attackStyle: 'low', windup: 0.95, recovery: 1, scale: 1.03, height: 0 },
    { name: 'Wisp', sprite: '/static/assets/wisp.svg', health: 90, damage: 17, speed: 87, points: 170, attackStyle: 'high', windup: 0.72, recovery: 0.65, scale: 0.76, height: 54 },
];

enemyTypes.forEach((type) => {
    type.image = new Image();
    type.image.src = type.sprite;
});

const controls = new Set();
const game = {
    phase: 'ready',
    score: 0,
    best: readBestScore(),
    round: 1,
    combo: 0,
    player: null,
    enemy: null,
    intermission: 0,
    clock: 0,
    lastFrame: 0,
    width: 0,
    height: 0,
    pixelRatio: 1,
};

function readBestScore() {
    try {
        return Number(localStorage.getItem('ninja-last-stand-best') || 0);
    } catch {
        return 0;
    }
}

function createPlayer() {
    return {
        x: game.width * 0.25,
        health: 100,
        maxHealth: 100,
        stamina: 100,
        maxStamina: 100,
        facing: 1,
        jumpHeight: 0,
        jumpVelocity: 0,
        attack: null,
        attackCooldown: 0,
        dashTime: 0,
        dashDirection: 1,
        invulnerable: 0,
        hurtTime: 0,
        blockHeldTime: 0,
        blocking: false,
    };
}

function getStage() {
    const fighterHeight = Math.min(154, game.height * 0.48);
    return {
        ground: game.height - 36,
        fighterWidth: fighterHeight * (160 / 180),
        fighterHeight,
        leftLimit: Math.max(36, game.width * 0.08),
        rightLimit: game.width - Math.max(36, game.width * 0.08),
    };
}

function resizeCanvas() {
    const bounds = canvas.getBoundingClientRect();
    game.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    game.width = bounds.width;
    game.height = bounds.height;
    canvas.width = Math.round(bounds.width * game.pixelRatio);
    canvas.height = Math.round(bounds.height * game.pixelRatio);
    context.setTransform(game.pixelRatio, 0, 0, game.pixelRatio, 0, 0);
    if (game.player) {
        const stage = getStage();
        game.player.x = Math.max(stage.leftLimit, Math.min(stage.rightLimit, game.player.x));
        if (game.enemy) game.enemy.x = Math.max(stage.leftLimit, Math.min(stage.rightLimit, game.enemy.x));
    }
}

function drawBackground() {
    const { ground } = getStage();
    const sky = context.createLinearGradient(0, 0, 0, game.height);
    sky.addColorStop(0, '#19363d');
    sky.addColorStop(0.66, '#587466');
    sky.addColorStop(1, '#c38c62');
    context.fillStyle = sky;
    context.fillRect(0, 0, game.width, game.height);

    context.fillStyle = '#eac58a';
    context.beginPath();
    context.arc(game.width * 0.76, game.height * 0.22, Math.min(30, game.height * 0.1), 0, Math.PI * 2);
    context.fill();

    context.fillStyle = palette.hillLight;
    context.beginPath();
    context.moveTo(0, ground - game.height * 0.18);
    context.quadraticCurveTo(game.width * 0.2, ground - game.height * 0.54, game.width * 0.43, ground - game.height * 0.2);
    context.quadraticCurveTo(game.width * 0.73, ground - game.height * 0.48, game.width, ground - game.height * 0.16);
    context.lineTo(game.width, ground);
    context.lineTo(0, ground);
    context.fill();

    context.fillStyle = palette.hill;
    context.beginPath();
    context.moveTo(0, ground - game.height * 0.1);
    context.quadraticCurveTo(game.width * 0.28, ground - game.height * 0.33, game.width * 0.53, ground - game.height * 0.1);
    context.quadraticCurveTo(game.width * 0.78, ground - game.height * 0.38, game.width, ground - game.height * 0.1);
    context.lineTo(game.width, ground);
    context.lineTo(0, ground);
    context.fill();

    context.fillStyle = palette.ground;
    context.fillRect(0, ground, game.width, game.height - ground);
    context.fillStyle = palette.lime;
    context.fillRect(0, ground, game.width, 2);

    context.globalAlpha = 0.18;
    context.strokeStyle = '#d5d0a4';
    context.lineWidth = 1;
    for (let index = 0; index < 18; index += 1) {
        const x = (index * 97 + game.clock * 22) % Math.max(game.width, 1);
        const y = ground + 9 + (index % 3) * 7;
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x + 26, y);
        context.stroke();
    }
    context.globalAlpha = 1;

    drawTorii(game.width * 0.08, ground, 0.8);
    drawTorii(game.width * 0.91, ground, 1.08);
}

function drawTorii(x, ground, scale) {
    const width = 55 * scale;
    const height = 103 * scale;
    context.save();
    context.globalAlpha = 0.5;
    context.fillStyle = '#703f37';
    context.fillRect(x - width / 2, ground - height, 7 * scale, height);
    context.fillRect(x + width / 2 - 7 * scale, ground - height, 7 * scale, height);
    context.fillRect(x - width / 2 - 9 * scale, ground - height, width + 18 * scale, 8 * scale);
    context.fillRect(x - width / 2 - 4 * scale, ground - height + 20 * scale, width + 8 * scale, 5 * scale);
    context.restore();
}

function actorMetrics() {
    const stage = getStage();
    return { ...stage, playerWidth: stage.fighterWidth * 0.92, enemyWidth: stage.fighterWidth * 0.84 };
}

function drawActorShadow(x, ground, width) {
    context.save();
    context.globalAlpha = 0.32;
    context.fillStyle = '#071515';
    context.beginPath();
    context.ellipse(x, ground - 3, width * 0.42, 8, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
}

function drawFighter(image, x, ground, height, width, facing, options = {}) {
    const y = ground - height - (options.jump || 0) - (options.hover || 0);
    drawActorShadow(x, ground, width);
    context.save();
    if (options.flash && Math.floor(game.clock * 28) % 2 === 0) context.globalAlpha = 0.35;
    context.translate(x, y + height / 2);
    context.scale(facing >= 0 ? 1 : -1, 1);
    if (options.blocking) {
        context.strokeStyle = '#83c7be';
        context.globalAlpha *= 0.62;
        context.lineWidth = 5;
        context.beginPath();
        context.arc(12, 0, height * 0.43, -1.1, 1.1);
        context.stroke();
        context.globalAlpha = 1;
    }
    if (image.complete && image.naturalWidth > 0) {
        context.drawImage(image, -width / 2, -height / 2, width, height);
    }
    context.restore();
}

function drawHealthBar(x, y, width, ratio, fill, label) {
    context.fillStyle = 'rgb(9 24 25 / 82%)';
    context.fillRect(x - width / 2, y, width, 7);
    context.fillStyle = fill;
    context.fillRect(x - width / 2, y, width * Math.max(0, ratio), 7);
    context.fillStyle = palette.cream;
    context.font = '700 9px Trebuchet MS, sans-serif';
    context.textAlign = 'center';
    context.fillText(label, x, y - 5);
}

function drawPlayer() {
    if (!game.player) return;
    const stage = actorMetrics();
    const player = game.player;
    const bob = game.phase === 'playing' && player.jumpHeight === 0 && !player.attack ? Math.abs(Math.sin(game.clock * 10)) * 2 : 0;
    drawFighter(ninjaSprite, player.x, stage.ground, stage.fighterHeight, stage.playerWidth, player.facing, {
        jump: player.jumpHeight + bob,
        flash: player.hurtTime > 0,
        blocking: player.blocking,
    });
    const meterY = stage.ground - stage.fighterHeight - player.jumpHeight - 19;
    drawHealthBar(player.x, meterY, 70, player.health / player.maxHealth, palette.lime, fighterName.value.trim() || 'Ninja');

    if (player.attack && player.attack.elapsed > player.attack.activeAt * 0.55 && player.attack.elapsed < player.attack.activeAt + 0.2) {
        const progress = Math.min(1, player.attack.elapsed / player.attack.duration);
        context.save();
        context.strokeStyle = player.attack.kind === 'heavy' ? palette.coral : palette.lime;
        context.lineWidth = player.attack.kind === 'heavy' ? 8 : 5;
        context.lineCap = 'round';
        context.beginPath();
        const direction = player.facing;
        context.arc(player.x + direction * 21, stage.ground - stage.fighterHeight * 0.57 - player.jumpHeight, 57 + progress * 12, direction > 0 ? -1.05 : Math.PI - 0.55, direction > 0 ? 0.45 : Math.PI + 1.05, direction < 0);
        context.stroke();
        context.restore();
    }
}

function drawEnemy() {
    const enemy = game.enemy;
    if (!enemy) return;
    const stage = actorMetrics();
    const hover = enemy.type.height + (enemy.type.attackStyle === 'high' ? Math.sin(game.clock * 5) * 7 : 0);
    const facing = game.player.x >= enemy.x ? 1 : -1;
    const warned = enemy.state === 'telegraph' || enemy.state === 'attack';
    drawFighter(enemy.type.image, enemy.x, stage.ground, stage.fighterHeight * enemy.type.scale, stage.enemyWidth * enemy.type.scale, facing, {
        hover,
        flash: enemy.hitFlash > 0,
        blocking: warned,
    });
    drawHealthBar(enemy.x, stage.ground - stage.fighterHeight * enemy.type.scale - hover - 20, 74, enemy.health / enemy.maxHealth, warned ? palette.coral : '#eaa567', enemy.type.name);

    if (enemy.state === 'telegraph') {
        const radius = 24 + Math.sin(game.clock * 18) * 5;
        context.save();
        context.strokeStyle = palette.coral;
        context.globalAlpha = 0.76;
        context.lineWidth = 3;
        context.beginPath();
        context.arc(enemy.x, stage.ground - 12, radius, 0, Math.PI * 2);
        context.stroke();
        context.restore();
    }
}

function drawScene() {
    if (!game.width || !game.height) return;
    context.clearRect(0, 0, game.width, game.height);
    drawBackground();
    drawPlayer();
    drawEnemy();
}

function updateHud() {
    scoreValue.textContent = String(game.score);
    bestValue.textContent = String(game.best);
    roundValue.textContent = String(game.round);
    comboValue.textContent = `${game.combo}×`;

    if (!game.player) return;
    playerHealthFill.style.width = `${Math.max(0, game.player.health / game.player.maxHealth) * 100}%`;
    playerHealthText.textContent = `${Math.ceil(game.player.health)} / ${game.player.maxHealth}`;
    playerStaminaFill.style.width = `${Math.max(0, game.player.stamina / game.player.maxStamina) * 100}%`;
    playerStaminaText.textContent = `${Math.ceil(game.player.stamina)} / ${game.player.maxStamina}`;

    if (game.enemy) {
        enemyNameText.textContent = `${game.enemy.type.name.toUpperCase()} · ${game.enemy.state === 'telegraph' ? 'WINDING UP' : game.enemy.state.toUpperCase()}`;
        enemyHealthFill.style.width = `${Math.max(0, game.enemy.health / game.enemy.maxHealth) * 100}%`;
        enemyHealthText.textContent = `${Math.ceil(game.enemy.health)} / ${game.enemy.maxHealth}`;
    } else {
        enemyNameText.textContent = game.phase === 'intermission' ? 'ROUND CLEAR' : 'WAITING';
        enemyHealthFill.style.width = '0%';
        enemyHealthText.textContent = '—';
    }
}

function describeEnemy(type) {
    if (type.name === 'Brute') return 'The Brute hits hard. Heavy strikes crack its guard.';
    if (type.name === 'Wisp') return 'The Wisp hovers. Jump to bring your blade level.';
    return 'The Ronin is quick. Watch for its red wind-up.';
}

function spawnEnemy() {
    const stage = actorMetrics();
    const type = enemyTypes[(game.round - 1) % enemyTypes.length];
    game.enemy = {
        type,
        x: stage.rightLimit - stage.enemyWidth * 0.5,
        health: type.health,
        maxHealth: type.health,
        state: 'approach',
        stateTimer: 0.7,
        hitFlash: 0,
    };
    phaseLabel.textContent = `ROUND ${game.round}`;
    statusMessage.textContent = describeEnemy(type);
    updateHud();
}

function startRun() {
    controls.clear();
        game.phase = 'intermission';
    game.score = 0;
    game.round = 1;
    game.combo = 0;
    game.player = createPlayer();
    game.enemy = null;
    game.intermission = 0.4;
    game.lastFrame = 0;
    overlay.hidden = true;
    fighterName.disabled = true;
    statusMessage.textContent = 'Move with A/D. Strike when close; guard or dash the red wind-up.';
    startButton.textContent = 'Restart Duel';
    updateHud();
}

function endRun() {
    game.phase = 'over';
    game.enemy = null;
    controls.clear();
    fighterName.disabled = false;
    phaseLabel.textContent = 'DUEL OVER';
    overlayKicker.textContent = `ROUND ${game.round} · ${game.combo} HIT COMBO`;
    overlayTitle.textContent = 'The duel is done.';
    overlayCopy.textContent = `${game.score} points earned. Your result is being recorded.`;
    statusMessage.textContent = `Final score: ${game.score}`;
    startButton.textContent = 'Fight Again';
    overlay.hidden = false;
    updateHud();
    void submitScore();
}

function beginAttack(kind) {
    const player = game.player;
    if (game.phase !== 'playing' || !player || player.attackCooldown > 0 || player.blocking || player.dashTime > 0) return;

    const heavy = kind === 'heavy';
    const staminaCost = heavy ? 24 : 10;
    if (player.stamina < staminaCost) {
        statusMessage.textContent = 'Too tired. Guard briefly to recover stamina.';
        return;
    }

    player.stamina -= staminaCost;
    player.attackCooldown = heavy ? 0.62 : 0.32;
    player.attack = {
        kind,
        damage: heavy ? 39 : 21,
        range: heavy ? 174 : 143,
        duration: heavy ? 0.48 : 0.3,
        activeAt: heavy ? 0.23 : 0.11,
        elapsed: 0,
        hit: false,
    };
    statusMessage.textContent = heavy ? 'Heavy strike committed.' : 'Quick strike committed.';
}

function jump() {
    const player = game.player;
        if (game.phase !== 'playing' || !player || player.jumpHeight > 0 || player.jumpVelocity > 0 || player.stamina < 8 || player.blocking) return;
    player.stamina -= 8;
    player.jumpVelocity = 560;
}

function dash() {
    const player = game.player;
    if (game.phase !== 'playing' || !player || player.dashTime > 0 || player.stamina < 20 || player.blocking) return;
    player.stamina -= 20;
    player.dashTime = 0.2;
    player.invulnerable = 0.24;
    player.dashDirection = controls.has('left') ? -1 : controls.has('right') ? 1 : player.facing;
}

function faceOpponent() {
    if (!game.player || !game.enemy) return;
    const separation = game.enemy.x - game.player.x;
    if (Math.abs(separation) > 3) game.player.facing = Math.sign(separation);
}

function damageEnemy(attack) {
    const player = game.player;
    const enemy = game.enemy;
    if (!enemy || attack.hit) return;
    attack.hit = true;

    const separation = enemy.x - player.x;
    const direction = Math.sign(separation);
    const distance = Math.abs(separation);
    const correctHeight = enemy.type.height === 0 || player.jumpHeight > 48;
    if (distance > attack.range || player.facing !== direction || !correctHeight) {
        game.combo = 0;
        statusMessage.textContent = !correctHeight ? 'Jump to reach the Wisp.' : 'Out of range. Step closer before attacking.';
        updateHud();
        return;
    }

    const counterHit = enemy.state === 'telegraph' || enemy.state === 'attack';
    const damage = attack.damage + (counterHit && attack.kind === 'heavy' ? 10 : 0);
    enemy.health = Math.max(0, enemy.health - damage);
    enemy.hitFlash = 0.18;
    enemy.state = 'stagger';
    enemy.stateTimer = 0.42;
    game.combo += 1;
    game.score += (attack.kind === 'heavy' ? 12 : 8) + Math.min(game.combo, 8) * 2;
    statusMessage.textContent = counterHit ? 'COUNTER HIT! Keep your rhythm.' : 'Clean hit. Stay in range.';
    phaseLabel.textContent = `${game.combo} HIT COMBO`;

    if (enemy.health <= 0) defeatEnemy();
    updateHud();
}

function defeatEnemy() {
    const defeated = game.enemy;
    game.score += defeated.type.points + Math.max(0, game.combo - 1) * 12;
    game.round += 1;
    game.player.health = Math.min(game.player.maxHealth, game.player.health + 14);
    game.player.stamina = Math.min(game.player.maxStamina, game.player.stamina + 30);
    game.enemy = null;
    game.phase = 'intermission';
    game.intermission = 1.15;
    phaseLabel.textContent = 'ROUND CLEAR';
    statusMessage.textContent = `${defeated.type.name} defeated. A short breather, then the next challenger.`;
}

function setBlockHeld(isHeld) {
    if (isHeld && game.player?.stamina > 0) {
        controls.add('block');
    } else {
        controls.delete('block');
    }
}

function takeEnemyHit() {
    const player = game.player;
    const enemy = game.enemy;
    if (!player || !enemy) return;
    const distance = Math.abs(enemy.x - player.x);
    if (distance > 138) {
        statusMessage.textContent = 'The enemy overreached. Punish the recovery.';
        enemy.state = 'recover';
        enemy.stateTimer = enemy.type.recovery;
        return;
    }

    if (player.invulnerable > 0) {
        statusMessage.textContent = 'Dash through! You avoided the strike.';
        game.combo += 1;
        enemy.state = 'recover';
        enemy.stateTimer = enemy.type.recovery;
        updateHud();
        return;
    }

    const facingAttacker = player.facing === Math.sign(enemy.x - player.x);
    if (player.blocking && facingAttacker && player.stamina >= 12) {
        player.stamina -= 12;
        enemy.state = 'stagger';
        enemy.stateTimer = 0.52;
        game.combo += 1;
        game.score += 18;
        statusMessage.textContent = 'Perfect guard! The enemy is open.';
        phaseLabel.textContent = 'PARRY';
        updateHud();
        return;
    }

    const jumpedOverLowAttack = enemy.type.attackStyle === 'low' && player.jumpHeight > 92;
    if (jumpedOverLowAttack) {
        statusMessage.textContent = 'Jumped the attack. Strike on the landing.';
        game.combo += 1;
        enemy.state = 'recover';
        enemy.stateTimer = enemy.type.recovery;
        updateHud();
        return;
    }

    player.health = Math.max(0, player.health - enemy.type.damage);
    player.hurtTime = 0.28;
    player.invulnerable = 0.55;
    game.combo = 0;
    statusMessage.textContent = 'Hit taken. Create space or hold guard.';
    phaseLabel.textContent = 'NINJA HIT';
    enemy.state = 'recover';
    enemy.stateTimer = enemy.type.recovery;
    if (player.health <= 0) endRun();
    updateHud();
}

function updatePlayer(delta) {
    const player = game.player;
    const stage = actorMetrics();
    const moveDirection = Number(controls.has('right')) - Number(controls.has('left'));
    const wantsBlock = controls.has('block') && player.stamina > 0;
    player.blocking = wantsBlock;

    if (wantsBlock) {
        player.blockHeldTime += delta;
        player.stamina = Math.max(0, player.stamina - 12 * delta);
        if (player.stamina === 0) setBlockHeld(false);
    } else {
        player.blockHeldTime = 0;
        player.stamina = Math.min(player.maxStamina, player.stamina + 19 * delta);
    }

    if (moveDirection && !player.blocking && !player.attack && player.dashTime <= 0) {
        player.x += moveDirection * 218 * delta;
    }
    if (moveDirection && !game.enemy) player.facing = moveDirection;

    if (player.dashTime > 0) {
        player.dashTime = Math.max(0, player.dashTime - delta);
        player.x += player.dashDirection * 620 * delta;
    }
    player.invulnerable = Math.max(0, player.invulnerable - delta);
    player.hurtTime = Math.max(0, player.hurtTime - delta);
    player.attackCooldown = Math.max(0, player.attackCooldown - delta);

    if (player.jumpHeight > 0 || player.jumpVelocity > 0) {
        player.jumpHeight += player.jumpVelocity * delta;
        player.jumpVelocity -= 1450 * delta;
        if (player.jumpHeight <= 0) {
            player.jumpHeight = 0;
            player.jumpVelocity = 0;
        }
    }

    if (player.attack) {
        player.attack.elapsed += delta;
        if (!player.attack.hit && player.attack.elapsed >= player.attack.activeAt) damageEnemy(player.attack);
        if (player.attack.elapsed >= player.attack.duration) player.attack = null;
    }

    player.x = Math.max(stage.leftLimit, Math.min(stage.rightLimit, player.x));
    faceOpponent();
}

function updateEnemy(delta) {
    const enemy = game.enemy;
    const player = game.player;
    if (!enemy || !player) return;
    const separation = player.x - enemy.x;
    const distance = Math.abs(separation);
    const direction = Math.sign(separation);
    enemy.hitFlash = Math.max(0, enemy.hitFlash - delta);

    if (enemy.state === 'approach') {
        if (distance > 118) {
            enemy.x += direction * enemy.type.speed * delta;
        } else {
            enemy.state = 'telegraph';
            enemy.stateTimer = enemy.type.windup;
            phaseLabel.textContent = 'INCOMING STRIKE';
            statusMessage.textContent = enemy.type.attackStyle === 'high'
                ? 'High attack! Guard or dash now.'
                : 'Red flash: jump, guard, or dash now.';
        }
    } else {
        enemy.stateTimer -= delta;
        if (enemy.state === 'telegraph' && enemy.stateTimer <= 0) {
            enemy.state = 'attack';
            enemy.stateTimer = 0.18;
            takeEnemyHit();
        } else if (enemy.state === 'attack' && enemy.stateTimer <= 0) {
            enemy.state = 'recover';
            enemy.stateTimer = enemy.type.recovery;
        } else if ((enemy.state === 'recover' || enemy.state === 'stagger') && enemy.stateTimer <= 0) {
            enemy.state = 'approach';
        }
    }

    const stage = actorMetrics();
    enemy.x = Math.max(stage.leftLimit, Math.min(stage.rightLimit, enemy.x));
}

function updateGame(delta) {
    game.clock += delta;
    if (game.phase === 'intermission') {
        game.intermission -= delta;
        if (game.intermission <= 0) {
            game.phase = 'playing';
            spawnEnemy();
        }
    }
    if (game.phase !== 'playing') return;
    updatePlayer(delta);
    updateEnemy(delta);
    updateHud();
}

function startAction(action) {
    if (action === 'jump') jump();
    else if (action === 'light') beginAttack('light');
    else if (action === 'heavy') beginAttack('heavy');
    else if (action === 'dash') dash();
}

function drawFrame(timestamp) {
    if (!game.width || !game.height) resizeCanvas();
    const delta = game.lastFrame ? Math.min((timestamp - game.lastFrame) / 1000, 0.04) : 0;
    game.lastFrame = timestamp;
    updateGame(delta);
    drawScene();
    requestAnimationFrame(drawFrame);
}

async function loadLeaderboard() {
    try {
        const response = await fetch('/api/leaderboard');
        if (!response.ok) throw new Error('Could not load leaderboard');
        const entries = await response.json();
        leaderboard.replaceChildren();
        if (entries.length === 0) {
            const empty = document.createElement('li');
            empty.className = 'leaderboard-empty';
            empty.textContent = 'No duels recorded yet.';
            leaderboard.append(empty);
        }
        entries.forEach((entry, index) => {
            const item = document.createElement('li');
            const rank = document.createElement('span');
            rank.className = 'leaderboard-rank';
            rank.textContent = String(index + 1).padStart(2, '0');
            const name = document.createElement('span');
            name.className = 'leaderboard-name';
            name.textContent = entry.name;
            const score = document.createElement('span');
            score.className = 'leaderboard-score';
            score.textContent = String(entry.score);
            item.append(rank, name, score);
            leaderboard.append(item);
        });
        leaderboardMessage.textContent = 'LOCAL SERVER RECORDS';
    } catch {
        leaderboard.replaceChildren();
        const offline = document.createElement('li');
        offline.className = 'leaderboard-empty';
        offline.textContent = 'Leaderboard unavailable.';
        leaderboard.append(offline);
        leaderboardMessage.textContent = 'CONNECT TO THE GAME SERVER';
    }
}

async function submitScore() {
    if (game.score > 0) {
        try {
            const response = await fetch('/api/scores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: fighterName.value.trim() || 'Ninja', score: game.score }),
            });
            if (!response.ok) throw new Error('Could not save score');
            leaderboardMessage.textContent = 'SCORE RECORDED';
        } catch {
            leaderboardMessage.textContent = 'SCORE NOT SAVED · SERVER UNAVAILABLE';
        }
    }
    await loadLeaderboard();
}

function setHeldControl(control, held) {
    if (held) controls.add(control);
    else controls.delete(control);
    const button = controlButtons.find((item) => item.dataset.hold === control);
    if (button) button.setAttribute('aria-pressed', String(held));
}

function bindControlButton(button) {
    const action = button.dataset.action;
    const hold = button.dataset.hold;
    if (hold) {
        const press = (event) => {
            event.preventDefault();
            button.setPointerCapture?.(event.pointerId);
            setHeldControl(hold, true);
        };
        const release = () => setHeldControl(hold, false);
        button.addEventListener('pointerdown', press);
        button.addEventListener('pointerup', release);
        button.addEventListener('pointercancel', release);
        button.addEventListener('lostpointercapture', release);
    } else {
        button.addEventListener('pointerdown', (event) => {
            event.preventDefault();
            startAction(action);
        });
    }
}

const keyControls = new Map([
    ['ArrowLeft', 'left'], ['KeyA', 'left'],
    ['ArrowRight', 'right'], ['KeyD', 'right'],
    ['KeyL', 'block'],
]);

window.addEventListener('keydown', (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest('input, button, a')) return;
    if (keyControls.has(event.code)) {
        event.preventDefault();
        setHeldControl(keyControls.get(event.code), true);
        return;
    }
    if (event.repeat) return;
    if (event.code === 'ArrowUp' || event.code === 'KeyW') startAction('jump');
    else if (event.code === 'Space' || event.code === 'KeyJ') startAction('light');
    else if (event.code === 'KeyK') startAction('heavy');
    else if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') startAction('dash');
    else return;
    event.preventDefault();
});

window.addEventListener('keyup', (event) => {
    if (keyControls.has(event.code)) setHeldControl(keyControls.get(event.code), false);
});
window.addEventListener('blur', () => controls.clear());
startButton.addEventListener('click', startRun);
controlButtons.forEach(bindControlButton);
window.addEventListener('resize', resizeCanvas, { passive: true });

function initialize() {
    resizeCanvas();
    game.player = createPlayer();
    game.phase = 'ready';
    updateHud();
    requestAnimationFrame(drawFrame);
    void loadLeaderboard();
}

initialize();
