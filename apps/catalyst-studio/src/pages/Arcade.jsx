import React, { useState, useRef, useEffect, useCallback } from 'react';

// ═══════════════════════════════════════════════════════
// GALAGA — Space Shooter
// ═══════════════════════════════════════════════════════
function Galaga() {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const stateRef = useRef({ shipX: 200, bullets: [], enemies: [], enemyDir: 1, score: 0, lives: 3, gameOver: false, enemyTimer: 0 });

  const W = 420, H = 520;

  const reset = useCallback(() => {
    const s = stateRef.current;
    s.shipX = W / 2 - 15;
    s.bullets = [];
    s.enemies = [];
    s.enemyDir = 1;
    s.score = 0;
    s.lives = 3;
    s.gameOver = false;
    s.enemyTimer = 0;
    setScore(0); setLives(3); setGameOver(false);
    // Create enemy grid
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 8; col++) {
        s.enemies.push({ x: 40 + col * 45, y: 30 + row * 35, alive: true, row });
      }
    }
  }, []);

  const start = () => { reset(); setStarted(true); };

  const fire = useCallback(() => {
    const s = stateRef.current;
    if (s.gameOver) return;
    s.bullets.push({ x: s.shipX + 13, y: H - 60 });
  }, []);

  useEffect(() => {
    if (!started) return;
    const handleKey = (e) => {
      const s = stateRef.current;
      if (e.key === 'ArrowLeft') s.shipX = Math.max(0, s.shipX - 12);
      if (e.key === 'ArrowRight') s.shipX = Math.min(W - 30, s.shipX + 12);
      if (e.key === ' ') { e.preventDefault(); fire(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [started, fire]);

  useEffect(() => {
    if (!started) return;
    const loop = setInterval(() => {
      const s = stateRef.current;
      if (s.gameOver) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');

      // Move bullets
      s.bullets = s.bullets.filter(b => b.y > 0);
      s.bullets.forEach(b => b.y -= 6);

      // Move enemies
      let hitEdge = false;
      s.enemies.forEach(e => {
        if (!e.alive) return;
        e.x += s.enemyDir * 0.8;
        if (e.x <= 5 || e.x >= W - 35) hitEdge = true;
      });
      if (hitEdge) {
        s.enemyDir *= -1;
        s.enemies.forEach(e => { if (e.alive) e.y += 10; });
      }

      // Enemy bullets
      s.enemyTimer++;
      if (s.enemyTimer > 40) {
        s.enemyTimer = 0;
        const alive = s.enemies.filter(e => e.alive);
        if (alive.length > 0) {
          const shooter = alive[Math.floor(Math.random() * alive.length)];
          s.bullets.push({ x: shooter.x + 12, y: shooter.y + 20, enemy: true });
        }
      }

      // Collisions
      s.bullets.forEach(b => {
        if (b.enemy) return;
        s.enemies.forEach(e => {
          if (!e.alive) return;
          if (Math.abs(b.x - e.x) < 20 && Math.abs(b.y - e.y) < 18) {
            e.alive = false;
            b.hit = true;
            s.score += (4 - e.row) * 25 + 25;
          }
        });
      });
      s.bullets = s.bullets.filter(b => !b.hit);

      // Enemy bullets hit ship
      s.bullets.forEach(b => {
        if (!b.enemy) return;
        if (Math.abs(b.x - s.shipX) < 16 && b.y > H - 65 && b.y < H - 40) {
          s.lives--;
          b.hit = true;
        }
      });
      s.bullets = s.bullets.filter(b => !b.hit);

      // Enemies reach bottom
      s.enemies.forEach(e => {
        if (e.alive && e.y > H - 80) s.lives = 0;
      });

      if (s.lives <= 0) { s.gameOver = true; setGameOver(true); }
      if (s.enemies.every(e => !e.alive)) { s.score += 1000; s.gameOver = true; setGameOver(true); } // WIN

      setScore(s.score);
      setLives(s.lives);

      // Draw
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, W, H);

      // Stars
      ctx.fillStyle = '#ffffff33';
      for (let i = 0; i < 40; i++) {
        const sx = (i * 97 + 13) % W;
        const sy = (Date.now() * 0.02 + i * 73) % H;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      // Enemies
      s.enemies.forEach(e => {
        if (!e.alive) return;
        const colors = ['#ff4444', '#ff8800', '#ffcc00', '#44ff44'];
        ctx.fillStyle = colors[e.row % 4];
        ctx.beginPath();
        ctx.moveTo(e.x + 12, e.y);
        ctx.lineTo(e.x + 24, e.y + 8);
        ctx.lineTo(e.x + 18, e.y + 16);
        ctx.lineTo(e.x + 12, e.y + 12);
        ctx.lineTo(e.x + 6, e.y + 16);
        ctx.lineTo(e.x + 0, e.y + 8);
        ctx.fill();
        ctx.fillRect(e.x + 10, e.y + 5, 4, 8);
      });

      // Bullets
      s.bullets.forEach(b => {
        ctx.fillStyle = b.enemy ? '#ff4444' : '#00ff88';
        ctx.fillRect(b.x - 1, b.y - 4, 3, 8);
      });

      // Ship
      ctx.fillStyle = '#00ff88';
      ctx.beginPath();
      ctx.moveTo(s.shipX + 15, H - 65);
      ctx.lineTo(s.shipX + 25, H - 40);
      ctx.lineTo(s.shipX + 15, H - 50);
      ctx.lineTo(s.shipX + 5, H - 40);
      ctx.fill();
      ctx.fillStyle = '#00cc66';
      ctx.fillRect(s.shipX + 13, H - 62, 4, 8);
    }, 1000 / 60);
    return () => clearInterval(loop);
  }, [started]);

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ margin: '10px 0' }}>
        <span style={{ color: '#00ff88', fontSize: 18, fontWeight: 'bold', marginRight: 20 }}>⭐ {score}</span>
        <span style={{ color: '#ff4444' }}>{'❤️'.repeat(lives)}</span>
      </div>
      {!started ? (
        <div style={{ padding: 60 }}>
          <h2 style={{ color: '#ff8800' }}>🛸 GALAGA</h2>
          <p style={{ color: '#888', margin: '10px 0' }}>⬅️ ➡️ para mover | ESPACIO para disparar</p>
          <button onClick={start} style={btnStyle}>▶ JUGAR</button>
        </div>
      ) : gameOver ? (
        <div style={{ padding: 40 }}>
          <h2 style={{ color: score > 500 ? '#00ff88' : '#ff4444' }}>{score > 500 ? '🏆 VICTORIA' : '💀 GAME OVER'}</h2>
          <p style={{ color: '#ffcc00', fontSize: 20 }}>{score} puntos</p>
          <button onClick={start} style={btnStyle}>▶ JUGAR OTRA VEZ</button>
        </div>
      ) : null}
      <canvas ref={canvasRef} width={W} height={H} onClick={fire}
        style={{ border: '2px solid #00ff8833', borderRadius: 8, cursor: 'crosshair', display: started && !gameOver ? 'block' : 'none', margin: '0 auto' }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PACMAN — Maze Game
// ═══════════════════════════════════════════════════════
const PACMAN_MAZE = [
  'XXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  'X............XX............X',
  'X.XXXX.XXXXX.XX.XXXXX.XXXX.X',
  'X.XXXX.XXXXX.XX.XXXXX.XXXX.X',
  'X.XXXX.XXXXX.XX.XXXXX.XXXX.X',
  'X..........................X',
  'X.XXXX.XX.XXXXXXXX.XX.XXXX.X',
  'X.XXXX.XX.XXXXXXXX.XX.XXXX.X',
  'X......XX....XX....XX......X',
  'XXXXXX.XXXXX XX XXXXX.XXXXXX',
  '     X.XXXXX    XXXXX.X     ',
  '     X.XX          XX.X     ',
  '     X.XX XXX  XXX XX.X     ',
  'XXXXXX.XX X      X XX.XXXXXX',
  '          X      X          ',
  'XXXXXX.XX X      X XX.XXXXXX',
  '     X.XX XXXXXXXX XX.X     ',
  '     X.XX          XX.X     ',
  '     X.XX XXXXXXXX XX.X     ',
  'XXXXXX.XX XXXXXXXX XX.XXXXXX',
  'X............XX............X',
  'X.XXXX.XXXXX.XX.XXXXX.XXXX.X',
  'X.XXXX.XXXXX.XX.XXXXX.XXXX.X',
  'X...XX................XX...X',
  'XXX.XX.XX.XXXXXXXX.XX.XX.XXX',
  'XXX.XX.XX.XXXXXXXX.XX.XX.XXX',
  'X......XX....XX....XX......X',
  'X.XXXXXXXXXX.XX.XXXXXXXXXX.X',
  'X.XXXXXXXXXX.XX.XXXXXXXXXX.X',
  'X..........................X',
  'XXXXXXXXXXXXXXXXXXXXXXXXXXXX',
];

function Pacman() {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const stateRef = useRef({});

  const TILE = 16, ROWS = PACMAN_MAZE.length, COLS = PACMAN_MAZE[0].length;
  const W = COLS * TILE, H = ROWS * TILE;

  const reset = useCallback(() => {
    const dots = [];
    const walls = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (PACMAN_MAZE[r][c] === 'X') walls.push({ x: c * TILE, y: r * TILE });
        else if (PACMAN_MAZE[r][c] === '.') dots.push({ x: c * TILE + TILE / 2, y: r * TILE + TILE / 2, eaten: false });
      }
    }
    const s = {
      pacX: 14 * TILE + TILE / 2, pacY: 23 * TILE + TILE / 2, pacDir: 0, pacMouth: 0,
      ghosts: [
        { x: 13 * TILE, y: 14 * TILE, dx: 1, dy: 0, color: '#ff4444' },
        { x: 14 * TILE, y: 14 * TILE, dx: -1, dy: 0, color: '#ff88cc' },
        { x: 13 * TILE, y: 15 * TILE, dx: 0, dy: -1, color: '#44ccff' },
        { x: 14 * TILE, y: 15 * TILE, dx: 0, dy: 1, color: '#ffaa44' },
      ],
      dots, walls, score: 0, lives: 3, gameOver: false, powerUp: 0,
    };
    stateRef.current = s;
    setScore(0); setLives(3); setGameOver(false);
  }, []);

  const start = () => { reset(); setStarted(true); };

  useEffect(() => {
    if (!started) return;
    const handleKey = (e) => {
      const s = stateRef.current;
      if (e.key === 'ArrowLeft') s.pacDir = 3;
      if (e.key === 'ArrowRight') s.pacDir = 1;
      if (e.key === 'ArrowUp') s.pacDir = 0;
      if (e.key === 'ArrowDown') s.pacDir = 2;
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const loop = setInterval(() => {
      const s = stateRef.current;
      if (s.gameOver) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const speed = 1.2;

      // Move Pacman
      const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // up, right, down, left
      const [dx, dy] = dirs[s.pacDir] || [0, 0];
      const nx = s.pacX + dx * speed, ny = s.pacY + dy * speed;
      const tx = Math.floor(nx / TILE), ty = Math.floor(ny / TILE);
      const canMove = nx > 2 && nx < W - 2 && ny > 2 && ny < H - 2 &&
        PACMAN_MAZE[Math.max(0, Math.min(ROWS - 1, ty))]?.[Math.max(0, Math.min(COLS - 1, tx))] !== 'X';
      if (canMove) { s.pacX = nx; s.pacY = ny; }
      s.pacMouth = (s.pacMouth + 0.1) % 1;

      // Eat dots
      s.dots.forEach(d => {
        if (!d.eaten && Math.abs(s.pacX - d.x) < 8 && Math.abs(s.pacY - d.y) < 8) {
          d.eaten = true;
          s.score += 10;
          // Power pellet (center dots)
          if (d.x > W / 2 - 30 && d.x < W / 2 + 30 && d.y > H / 2 - 30 && d.y < H / 2 + 30) {
            s.score += 40;
            s.powerUp = 300;
          }
        }
      });

      // Move ghosts
      s.ghosts.forEach(g => {
        let nx2 = g.x + g.dx * 0.7, ny2 = g.y + g.dy * 0.7;
        const tx2 = Math.floor((nx2 + 8) / TILE), ty2 = Math.floor((ny2 + 8) / TILE);
        if (nx2 < 2 || nx2 > W - TILE - 2 || ny2 < 2 || ny2 > H - TILE - 2 ||
            PACMAN_MAZE[Math.max(0, Math.min(ROWS - 1, ty2))]?.[Math.max(0, Math.min(COLS - 1, tx2))] === 'X') {
          g.dx = [-1, 1, 0, 0][Math.floor(Math.random() * 4)] || 1;
          g.dy = g.dx === 0 ? (Math.random() > 0.5 ? 1 : -1) : 0;
        } else {
          g.x = nx2; g.y = ny2;
        }
        if (Math.random() < 0.01) {
          const dirs2 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
          const pick = dirs2[Math.floor(Math.random() * 4)];
          g.dx = pick[0]; g.dy = pick[1];
        }
        // Power-up mode: ghosts are slow
        if (s.powerUp > 0) {
          g.x += (g.dx < 0 ? 1 : g.dx > 0 ? -1 : 0) * 0.3;
          g.y += (g.dy < 0 ? 1 : g.dy > 0 ? -1 : 0) * 0.3;
        }
      });

      // Collision Pacman <-> Ghosts
      if (s.powerUp <= 0) {
        s.ghosts.forEach(g => {
          if (Math.abs(s.pacX - g.x) < 12 && Math.abs(s.pacY - g.y) < 12) {
            s.lives--;
            s.pacX = 14 * TILE + TILE / 2;
            s.pacY = 23 * TILE + TILE / 2;
            s.ghosts.forEach(gh => { gh.x = 13 * TILE; gh.y = 14 * TILE; });
          }
        });
      }
      if (s.powerUp > 0) s.powerUp--;

      if (s.lives <= 0) { s.gameOver = true; setGameOver(true); }
      if (s.dots.every(d => d.eaten)) { s.score += 2000; s.gameOver = true; setGameOver(true); } // WIN

      setScore(s.score); setLives(s.lives);

      // Draw
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, W, H);

      // Walls
      s.walls.forEach(w => {
        ctx.fillStyle = '#1a1a4a';
        ctx.fillRect(w.x + 1, w.y + 1, TILE - 2, TILE - 2);
        ctx.strokeStyle = '#3333aa';
        ctx.strokeRect(w.x, w.y, TILE, TILE);
      });

      // Dots
      s.dots.forEach(d => {
        if (d.eaten) return;
        const isPower = d.x > W / 2 - 30 && d.x < W / 2 + 30 && d.y > H / 2 - 30 && d.y < H / 2 + 30;
        ctx.fillStyle = isPower ? '#ffcc00' : '#ffaa44';
        ctx.beginPath();
        ctx.arc(d.x, d.y, isPower ? 4 : 2, 0, Math.PI * 2);
        ctx.fill();
      });

      // Ghosts
      s.ghosts.forEach(g => {
        ctx.fillStyle = s.powerUp > 0 ? '#4444ff' : g.color;
        ctx.beginPath();
        ctx.arc(g.x + 7, g.y + 7, 8, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(g.x + 1, g.y + 2, 12, 5);
        ctx.fillStyle = 'white';
        ctx.fillRect(g.x + 3, g.y + 4, 3, 3);
        ctx.fillRect(g.x + 8, g.y + 4, 3, 3);
      });

      // Pacman
      const mouthAngle = Math.sin(s.pacMouth * Math.PI * 2) * 0.3 + 0.3;
      ctx.fillStyle = '#ffcc00';
      ctx.beginPath();
      ctx.arc(s.pacX, s.pacY, 7, mouthAngle, Math.PI * 2 - mouthAngle);
      ctx.lineTo(s.pacX, s.pacY);
      ctx.fill();
    }, 1000 / 60);
    return () => clearInterval(loop);
  }, [started]);

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ margin: '10px 0' }}>
        <span style={{ color: '#ffcc00', fontSize: 18, fontWeight: 'bold', marginRight: 20 }}>⭐ {score}</span>
        <span style={{ color: '#ff4444' }}>{'❤️'.repeat(lives)}</span>
        {stateRef.current?.powerUp > 0 && <span style={{ color: '#4444ff', marginLeft: 15, animation: 'pulse 0.5s infinite' }}>⚡ POWER UP</span>}
      </div>
      {!started ? (
        <div style={{ padding: 60 }}>
          <h2 style={{ color: '#ffcc00' }}>🟡 PAC-MAN</h2>
          <p style={{ color: '#888', margin: '10px 0' }}>⬅️ ➡️ ⬆️ ⬇️ para mover</p>
          <button onClick={start} style={btnStyle}>▶ JUGAR</button>
        </div>
      ) : gameOver ? (
        <div style={{ padding: 30 }}>
          <h2 style={{ color: score > 2000 ? '#00ff88' : '#ff4444' }}>{score > 2000 ? '🏆 VICTORIA' : '💀 GAME OVER'}</h2>
          <p style={{ color: '#ffcc00', fontSize: 20 }}>{score} puntos</p>
          <button onClick={start} style={btnStyle}>▶ JUGAR OTRA VEZ</button>
        </div>
      ) : null}
      <canvas ref={canvasRef} width={W} height={H}
        style={{ border: '2px solid #ffcc0033', borderRadius: 8, display: started && !gameOver ? 'block' : 'none', margin: '0 auto' }}
      />
    </div>
  );
}

const btnStyle = {
  padding: '12px 36px', fontSize: 18, fontWeight: 'bold',
  background: 'linear-gradient(135deg, #ff4400, #ff8800)',
  color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer',
  marginTop: 15,
};

// ═══════════════════════════════════════════════════════
// ARCADE PAGE
// ═══════════════════════════════════════════════════════
export default function Arcade() {
  const [game, setGame] = useState('galaga');

  return (
    <div style={{ padding: '10px 20px' }}>
      <div style={{ display: 'flex', gap: 15, justifyContent: 'center', marginBottom: 15 }}>
        <button onClick={() => setGame('galaga')}
          style={{ ...tabStyle, background: game === 'galaga' ? '#00ff8822' : 'transparent', color: game === 'galaga' ? '#00ff88' : '#666' }}>
          🛸 GALAGA
        </button>
        <button onClick={() => setGame('pacman')}
          style={{ ...tabStyle, background: game === 'pacman' ? '#ffcc0022' : 'transparent', color: game === 'pacman' ? '#ffcc00' : '#666' }}>
          🟡 PAC-MAN
        </button>
      </div>
      {game === 'galaga' ? <Galaga /> : <Pacman />}
      <div style={{ textAlign: 'center', marginTop: 20, color: '#444', fontSize: 11 }}>
        ◆ CATALYST ARCADE — BELL 13450.50 — Break Time ◆
      </div>
    </div>
  );
}

const tabStyle = {
  padding: '10px 28px', fontSize: 16, fontWeight: 'bold',
  border: '1px solid #333', borderRadius: 8, cursor: 'pointer',
};
