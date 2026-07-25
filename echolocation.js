import { default as $ } from "https://www.tsujio.org/gamelib-js/gamelib.v1.js";

const SCREEN_WIDTH = 640;
const SCREEN_HEIGHT = 480;

function Bat() {
  this.x = 60;
  this.y = SCREEN_HEIGHT / 3;
  this.vy = 0;

  this.update = function () {
    this.y += this.vy;
    if (this.y < 0) {
      this.y = 0;
    }
    if (this.y > SCREEN_HEIGHT) {
      this.y = SCREEN_HEIGHT;
    }

    this.vy += 0.1;
    if (this.vy > 5) {
      this.vy = 5;
    }

    if (game.gamePlay.ticks % 10 === 0) {
      for (let i = 0; i < 512; i++) {
        const ang = ((2 * Math.PI) / 512) * i;
        game.gamePlay.echoParticles.push(
          new EchoParticle({
            x: this.x,
            y: this.y,
            vx: 10 * Math.cos(ang),
            vy: 10 * Math.sin(ang),
          }),
        );
      }
    }
  };

  this.draw = function (ctx) {
    const src =
      Math.floor(game.gamePlay.ticks / 30) % 2 === 0
        ? { left: 0, top: 0, right: 17, bottom: 12 }
        : { left: 0, top: 13, right: 17, bottom: 25 };
    $.drawImage(ctx, {
      src,
      dest: { x: this.x, y: this.y },
      scale: 2.5,
    });
  };
}

function EchoParticle({ x, y, vx, vy }) {
  this.x = this.px = x;
  this.y = this.py = y;
  this.vx = vx;
  this.vy = vy;
  this.reflect = 0;

  this.update = function () {
    this.px = this.x;
    this.py = this.y;
    this.x += this.vx;
    this.y += this.vy;
  };

  this.draw = function (ctx) {
    $.drawCircle(ctx, { x: this.x, y: this.y, radius: 2, color: `rgb(255 255 0 / ${this.reflect < 1 ? 0.7 : 0.2})` });
  };
}

function Enemy({ x, y, vx, width, height }) {
  this.x = this.px = x;
  this.y = this.py = y;
  this.width = width;
  this.height = height;

  this.update = function () {
    this.px = this.x;
    this.x += vx;
  };

  this.draw = function (ctx) {
    for (let i = 0; i < this.height / this.width; i++) {
      const src =
        Math.floor(game.gamePlay.ticks / 30) % 2 === 0
          ? { left: 26, top: 0, right: 34, bottom: 8 }
          : { left: 26, top: 9, right: 34, bottom: 17 };
      $.drawImage(ctx, {
        src,
        dest: { x: this.x, y: this.y + this.width * i },
        scale: 4.0,
        origin: "topLeft",
      });
    }
  };
}

function Coin({ x, y }) {
  this.x = x;
  this.y = y;
  this.hit = false;

  this.update = function () {
    this.x += -2;
  };

  this.draw = function (ctx) {
    $.drawImage(ctx, {
      src: { left: 19, top: 0, right: 25, bottom: 9 },
      dest: { x: this.x, y: this.y },
      scale: 2.5,
    });
  };
}

function GainEffect({ x, y, gain }) {
  this.x = x;
  this.y = y;
  this.ticks = 0;

  this.update = function () {
    this.ticks++;
  };

  this.draw = function (ctx) {
    $.drawText(ctx, {
      text: `+${gain}`,
      x: this.x,
      y: this.y + -20 * Math.sin((Math.PI * this.ticks) / 60),
      size: 24,
      color: "rgb(255 255 0)",
    });
  };
}

function GamePlay({ game, demo }) {
  this.ticks = 0;
  this.gameOver = false;
  this.score = 0;
  this.bat = new Bat();
  this.echoParticles = [];
  this.enemies = [];
  this.coins = [];
  this.gainEffects = [];
  if (demo) {
    this.touchSimulation = new $.TouchSimulation().wait(30).touch().release().wait(125).touch().release();
  }

  this.update = function (touches) {
    if (this.gameOver) {
      return;
    }

    this.ticks++;

    if (demo) {
      touches = this.touchSimulation.next();
    }

    if ($.firstTouchStarted(touches)) {
      this.bat.vy = -5;
      if (!demo) {
        $.playAudio("flap");
      }
    }

    const freq = this.ticks < 60 * 30 ? 120 : this.ticks < 60 * 60 ? 90 : 60;
    if (this.ticks % freq === 0) {
      this.enemies.push(
        new Enemy({
          x: SCREEN_WIDTH,
          y: game.rand.nextFloat(SCREEN_HEIGHT - 32, -32),
          vx: -game.rand.nextFloat(5.0, 1.0),
          width: 32,
          height: 32 * game.rand.nextInt(7, 1),
        }),
      );
    }

    if (this.ticks % 150 === 0) {
      this.coins.push(
        new Coin({
          x: SCREEN_WIDTH,
          y: game.rand.next() * SCREEN_HEIGHT,
        }),
      );
    }

    this.bat.update();
    this.echoParticles.forEach((p) => p.update());
    this.enemies.forEach((e) => e.update());
    this.coins.forEach((c) => c.update());
    this.gainEffects.forEach((e) => e.update());

    this.echoParticles.forEach((p) => {
      this.enemies.forEach((e) => {
        if (e.x <= p.x && p.x <= e.x + e.width && e.y <= p.y && p.y <= e.y + e.height) {
          if (p.reflect < 1) {
            if (p.px < e.px || e.px + e.width < p.px) {
              p.vx *= -1;
            }
            if (p.py < e.py || e.py + e.height < p.py) {
              p.vy *= -1;
            }
            p.x = p.px;
            p.y = p.py;
          }
          p.reflect++;
        }
      });
    });

    this.enemies.forEach((e) => {
      if (e.x <= this.bat.x && this.bat.x <= e.x + e.width && e.y <= this.bat.y && this.bat.y <= e.y + e.height) {
        this.gameOver = true;
        if (!demo) {
          $.playAudio("gameOver");
        }
      }
    });

    this.coins.forEach((c) => {
      if (Math.abs(c.x - this.bat.x) < 10 && Math.abs(c.y - this.bat.y) < 10) {
        c.hit = true;
        this.gainEffects.push(
          new GainEffect({
            x: c.x,
            y: c.y,
            gain: 1,
          }),
        );
        this.score += 1;
        if (!demo) {
          $.playAudio("gain");
        }
      }
    });

    this.echoParticles = this.echoParticles.filter(
      (p) => -10 < p.x && p.x < SCREEN_WIDTH + 10 && -10 < p.y && p.y < SCREEN_HEIGHT + 10 && p.reflect <= 1,
    );
    this.enemies = this.enemies.filter((e) => -e.width < e.x);
    this.coins = this.coins.filter((c) => -10 < c.x && !c.hit);
    this.gainEffects = this.gainEffects.filter((e) => e.ticks < 60);
  };

  const drawDarkness = (ctx) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    ctx.arc(this.bat.x, this.bat.y, 50, 0, Math.PI * 2);
    ctx.clip("evenodd");
    ctx.fillStyle = "rgba(0, 0, 0, 0.95)";
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    ctx.restore();
  };

  this.draw = function (ctx) {
    this.bat.draw(ctx);
    this.enemies.forEach((e) => e.draw(ctx));
    drawDarkness(ctx);
    this.echoParticles.forEach((p) => p.draw(ctx));
    this.coins.forEach((c) => c.draw(ctx));
    this.gainEffects.forEach((e) => e.draw(ctx));
  };
}

const drawScore = (ctx, score) => {
  $.drawText(ctx, { text: score, x: SCREEN_WIDTH, y: 0, size: 24, align: "right", color: "white" });
};

const game = new $.Game({
  title: "echolocation",
  screen: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  GamePlay,

  drawMode: {
    title: function (ctx) {
      $.drawText(ctx, { text: "ECHOLOCATION", x: SCREEN_WIDTH / 2, y: 80, size: 36, align: "center", color: "white" });
      $.drawText(ctx, { text: "[TAP] Flap", x: SCREEN_WIDTH / 2, y: 180, size: 14, align: "center", color: "white" });
      ["CREATOR: NAOKI TSUJIO", "FONT: Press Start 2P by CodeMan38", "SOUND EFFECT: MaouDamashii"].forEach((s, i) => {
        $.drawText(ctx, { text: s, x: SCREEN_WIDTH / 2, y: 300 + 18 * i, size: 12, align: "center", color: "white" });
      });
    },

    playing: function (ctx) {
      drawScore(ctx, this.gamePlay.score);
    },

    gameOver: function (ctx) {
      drawScore(ctx, this.gamePlay.score);
      $.drawText(ctx, { text: "GAME OVER", x: SCREEN_WIDTH / 2, y: 80, size: 36, align: "center", color: "white" });
      ["YOUR SCORE IS", `${this.gamePlay.score}!`]?.forEach((s, i) => {
        $.drawText(ctx, { text: s, x: SCREEN_WIDTH / 2, y: 160 + 42 * i, size: 18, align: "center", color: "white" });
      });
    },

    ranking: function (ctx) {
      drawScore(ctx, this.gamePlay.score);
      this.drawRanking(ctx, {
        backgroundColor: "rgb(255 255 255 / 0.7)",
        textColor: "black",
      });
    },
  },
});

$.register({
  game,
  audios: {
    gameStart: new URL("resources/魔王魂 効果音 システム49.mp3", self.location.href),
    gameOver: new URL("resources/魔王魂 効果音 システム32.mp3", self.location.href),
    flap: new URL("resources/maou_se_sound17.mp3", self.location.href),
    gain: new URL("resources/魔王魂 効果音 物音15.mp3", self.location.href),
    ranking: new URL("resources/魔王魂 効果音 システム46.mp3", self.location.href),
  },
  font: new URL("resources/PressStart2P-Regular.ttf", self.location.href).href,
  image: new URL("resources/echolocation.png", self.location.href),
  key: ((r) =>
    Array(32)
      .fill(0)
      .map(() => r.nextInt(0xff).toString(16).padStart(2, "0"))
      .join(""))(new $.Random(game.title)),
});
