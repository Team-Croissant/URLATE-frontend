/* eslint-disable @typescript-eslint/no-empty-function */
/* global api, url, Howl, cdn, bodymovin, getTan, calcAngleDegrees, lowerBound, upperBound, numberWithCommas, Pace, Howler, patternError, returnToEditor */
const menuContainer = document.getElementById("menuContainer");
const canvasBackground = document.getElementById("canvasBackground");
const canvasContainer = document.getElementById("canvasContainer");
const rankImg = document.getElementById("rankImg");
const floatingArrowContainer = document.getElementById("floatingArrowContainer");
const floatingResultContainer = document.getElementById("floatingResultContainer");
const scoreContainer = document.getElementById("scoreContainer");
const colorOverlayContainer = document.getElementById("colorOverlayContainer");
const floatingResumeContainer = document.getElementById("floatingResumeContainer");
const volumeMasterValue = document.getElementById("volumeMasterValue");
const volumeOverlay = document.getElementById("volumeOverlay");
const canvas = document.getElementById("componentCanvas");
const ctx = canvas.getContext("2d");
const missCanvas = document.getElementById("missPointCanvas");
const missCtx = missCanvas.getContext("2d");
let pattern = {};
let patternLength = 0;
let settings, sync, song, tracks, pixelRatio, offset, bpm, speed;
let pointingCntElement = [{ v1: "", v2: "", i: "" }];
let circleBulletAngles = [];
let destroyParticles = [];
let missParticles = [];
let destroyedBullets = new Set([]);
let destroyedNotes = new Set([]);
let mouseX = 0,
  mouseY = 0;
let score = 0,
  combo = 0,
  displayScore = 0,
  prevScore = 0,
  maxCombo = 0,
  scoreMs = 0;
let perfect = 0;
let great = 0;
let good = 0;
let bad = 0;
let miss = 0;
let bullet = 0; //miss와 bullet을 따로 처리
let mouseClicked = false;
let menuAllowed = false;
let mouseClickedMs = -1;
let frameCounterMs = Date.now();
let isMenuOpened = false;
let isResultShowing = false;
let resultMs = 0;
let frameArray = [];
let fps = 0;
let missPoint = [];
let sens = 1,
  denySkin = false,
  skin,
  cursorZoom,
  inputMode,
  judgeSkin;
let comboAlert = false,
  comboCount = 50;
let comboAlertMs = 0,
  comboAlertCount = 0;
let shiftDown = false;
let hide = {},
  frameCounter;
let load = 0;
let fileName = "";
let paceLoaded = 0;
let lottieAnim = {
  play: () => {},
  stop: () => {},
  pause: () => {},
  goToAndPlay: () => {},
  goToAndStop: () => {},
  setSpeed: () => {},
};
let overlayTime = 0;

let tick = new Howl({
  src: [`/sounds/tick.mp3`],
  autoplay: false,
  loop: false,
});
let resultEffect = new Howl({
  src: [`${cdn}/tracks/result.mp3`],
  autoplay: false,
  loop: false,
});

document.addEventListener("DOMContentLoaded", () => {
  menuContainer.style.display = "none";
  fetch(`${api}/tracks`, {
    method: "GET",
    credentials: "include",
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.result == "success") {
        tracks = data.tracks;
      } else {
        alert("Failed to load song list.");
        console.error("Failed to load song list.");
      }
    })
    .catch((error) => {
      alert(`Error occured.\n${error}`);
      console.error(`Error occured.\n${error}`);
    });
  fetch(`${api}/auth/status`, {
    method: "GET",
    credentials: "include",
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.status == "Not authorized") {
        window.location.href = `${url}/authorize`;
      } else if (data.status == "Not registered") {
        window.location.href = `${url}/join`;
      } else if (data.status == "Not logined") {
        window.location.href = url;
      } else if (data.status == "Not authenticated") {
        window.location.href = `${url}/authentication`;
      } else if (data.status == "Not authenticated(adult)") {
        window.location.href = `${url}/authentication?adult=1`;
      } else if (data.status == "Shutdowned") {
        window.location.href = `${api}/auth/logout?redirect=true&shutdowned=true`;
      } else {
        fetch(`${api}/user`, {
          method: "GET",
          credentials: "include",
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.result == "success") {
              data = data.user;
              settings = JSON.parse(data.settings);
              initialize(true);
              if (data.advanced) {
                document.getElementById("urlate").innerHTML = "<strong>URLATE</strong> Advanced";
              }
              settingApply();
            } else {
              alert(`Error occured.\n${data.description}`);
              console.error(`Error occured.\n${data.description}`);
            }
          })
          .catch(() => {
            alert(patternError);
            window.location.href = `${url}/game?initialize=0`;
          });
      }
    })
    .catch((error) => {
      alert(`Error occured.\n${error}`);
      console.error(`Error occured.\n${error}`);
    });
});

const initialize = (isFirstCalled) => {
  if (isFirstCalled) {
    pattern = JSON.parse(localStorage.pattern);
    patternLength = pattern.patterns.length;
    document.getElementById("artist").textContent = pattern.information.producer;
    document.getElementById("scoreArtist").textContent = pattern.information.producer;
    document.getElementById("authorNamespace").textContent = pattern.information.author;
    canvasBackground.style.filter = `grayscale(${pattern.background.grayscale}%) opacity(${pattern.background.opacity}%)`;
    offset = pattern.information.offset;
    bpm = pattern.information.bpm;
    speed = pattern.information.speed;
  } else {
    if (pattern.background.type) {
      lottieLoad(true);
    }
  }
  canvas.width = (window.innerWidth * pixelRatio * settings.display.canvasRes) / 100;
  canvas.height = (window.innerHeight * pixelRatio * settings.display.canvasRes) / 100;
  missCanvas.width = window.innerWidth * 0.2 * pixelRatio;
  missCanvas.height = window.innerHeight * 0.05 * pixelRatio;
};

const lottieLoad = (needToSeek) => {
  let blob = new Blob([pattern.background.lottie], {
    type: "application/json",
  });
  let path = URL.createObjectURL(blob);
  if (lottieAnim.animType) {
    lottieAnim.destroy();
  }
  lottieAnim = bodymovin.loadAnimation({
    wrapper: canvasBackground,
    animType: "canvas",
    loop: true,
    autoplay: false,
    path: path,
  });
  lottieAnim.addEventListener("DOMLoaded", () => {
    if (needToSeek) {
      if (song.playing()) {
        lottieAnim.goToAndPlay(song.seek() * 1000);
      }
    }
    lottieSet();
  });
  URL.revokeObjectURL(path);
};

const lottieSet = () => {
  switch (pattern.background.type) {
    case 0: //Image
      canvasBackground.getElementsByTagName("canvas")[0].style.display = "none";
      canvasBackground.style.backgroundImage = `url("${cdn}/albums/${settings.display.albumRes}/${fileName} (Custom).png")`;
      break;
    case 1: //Image & BGA
      canvasBackground.getElementsByTagName("canvas")[0].style.display = "initial";
      canvasBackground.style.backgroundImage = `url("${cdn}/albums/${settings.display.albumRes}/${fileName} (Custom).png")`;
      break;
    case 2: //BGA
      canvasBackground.getElementsByTagName("canvas")[0].style.display = "initial";
      canvasBackground.style.backgroundImage = "none";
      canvasBackground.style.backgroundColor = `#${pattern.background.boxColor}`;
      break;
  }
};

const settingApply = () => {
  tick.volume(settings.sound.volume.master * settings.sound.volume.hitSound);
  resultEffect.volume(settings.sound.volume.master * settings.sound.volume.effect);
  sync = parseInt(settings.sound.offset);
  document.getElementById("loadingContainer").style.opacity = 1;
  sens = settings.input.sens;
  denySkin = settings.editor.denyAtTest;
  cursorZoom = settings.game.size;
  inputMode = settings.input.keys;
  comboAlert = settings.game.comboAlert;
  comboCount = settings.game.comboCount;
  judgeSkin = settings.game.judgeSkin;
  hide.perfect = settings.game.applyJudge.Perfect;
  hide.great = settings.game.applyJudge.Great;
  hide.good = settings.game.applyJudge.Good;
  hide.bad = settings.game.applyJudge.Bad;
  hide.miss = settings.game.applyJudge.Miss;
  frameCounter = settings.game.counter;
  for (let i = 0; i <= 1; i++) {
    document.getElementsByClassName("volumeMaster")[i].value = Math.round(settings.sound.volume.master * 100);
  }
  for (let i = 0; i < tracks.length; i++) {
    if (tracks[i].name == pattern.information.track) {
      fileName = tracks[i].fileName;
      document.getElementById("scoreTitle").textContent = settings.general.detailLang == "original" ? tracks[i].originalName : tracks[i].name;
      document.getElementById("title").textContent = settings.general.detailLang == "original" ? tracks[i].originalName : tracks[i].name;
      document.getElementById("album").src = `${cdn}/albums/${settings.display.albumRes}/${fileName} (Custom).png`;
      document.getElementById("canvasBackground").style.backgroundImage = `url("${cdn}/albums/${settings.display.albumRes}/${fileName} (Custom).png")`;
      document.getElementById("scoreBackground").style.backgroundImage = `url("${cdn}/albums/${settings.display.albumRes}/${fileName} (Custom).png")`;
      document.getElementById("scoreAlbum").style.backgroundImage = `url("${cdn}/albums/${settings.display.albumRes}/${fileName} (Custom).png")`;
      break;
    }
  }
  if (pattern.background.type) {
    lottieLoad();
  }
  fetch(`${api}/skin/${settings.game.skin}`, {
    method: "GET",
    credentials: "include",
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.result == "success") {
        skin = JSON.parse(data.data);
      } else {
        alert(`Error occured.\n${data.description}`);
        console.error(`Error occured.\n${data.description}`);
      }
    })
    .catch((error) => {
      alert(`Error occured.\n${error}`);
      console.error(`Error occured.\n${error}`);
    });
  song = new Howl({
    src: `${cdn}/tracks/${settings.sound.res}/${fileName}.mp3`,
    format: ["mp3"],
    autoplay: false,
    loop: false,
    onend: () => {
      isResultShowing = true;
      menuAllowed = false;
      calculateResult();
    },
    onload: () => {
      song.volume(settings.sound.volume.master * settings.sound.volume.music);
      if (load == 1) {
        doneLoading();
      }
      load++;
    },
  });
};

const eraseCnt = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
};

const getJudgeStyle = (j, p, x, y) => {
  p = parseInt(p);
  if (p <= 0) p = 0;
  p = `${p}`.padStart(2, "0");
  if (denySkin || !judgeSkin) {
    if (j == "miss") {
      return `rgba(237, 78, 50, ${1 - p / 100})`;
    } else if (j == "perfect") {
      let grd = ctx.createLinearGradient(x - 50, y - 20, x + 50, y + 20);
      grd.addColorStop(0, `rgba(87, 209, 71, ${1 - p / 100})`);
      grd.addColorStop(1, `rgba(67, 167, 224, ${1 - p / 100})`);
      return grd;
    } else if (j == "great") {
      return `rgba(87, 209, 71, ${1 - p / 100})`;
    } else if (j == "good") {
      return `rgba(67, 167, 224, ${1 - p / 100})`;
    } else if (j == "bad") {
      return `rgba(176, 103, 90, ${1 - p / 100})`;
    } else {
      return `rgba(50, 50, 50, ${1 - p / 100})`;
    }
  } else {
    p = parseInt(255 - p * 2.55);
    if (p <= 0) p = 0;
    p = p.toString(16).padStart(2, "0");
    if (skin[j].type == "gradient") {
      let grd = ctx.createLinearGradient(x - 50, y - 20, x + 50, y + 20);
      for (let i = 0; i < skin[j].stops.length; i++) {
        grd.addColorStop(skin[j].stops[i].percentage / 100, `#${skin[j].stops[i].color}${p.toString(16)}`);
      }
      return grd;
    } else if (skin[j].type == "color") {
      return `#${skin[j].color}${p.toString(16)}`;
    }
  }
};

const drawParticle = (n, x, y, j, d) => {
  let cx = (canvas.width / 200) * (x + 100);
  let cy = (canvas.height / 200) * (y + 100);
  if (n == 0) {
    //Destroy
    const raf = (n, w) => {
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        if (skin.bullet.type == "gradient") {
          let grd = ctx.createLinearGradient(cx - w, cy - w, cx + w, cy + w);
          for (let i = 0; i < skin.bullet.stops.length; i++) {
            grd.addColorStop(skin.bullet.stops[i].percentage / 100, `#${skin.bullet.stops[i].color}`);
          }
          ctx.fillStyle = grd;
          ctx.strokeStyle = grd;
        } else if (skin.bullet.type == "color") {
          ctx.fillStyle = `#${skin.bullet.color}`;
          ctx.strokeStyle = `#${skin.bullet.color}`;
        }
        ctx.arc(cx + n * destroyParticles[j].d[i][0], cy + n * destroyParticles[j].d[i][1], w, 0, 2 * Math.PI);
        ctx.fill();
      }
    };
    raf(destroyParticles[j].n, destroyParticles[j].w);
  } else if (n == 1) {
    //Click Note
    const raf = (w, s, n) => {
      ctx.beginPath();
      let width = canvas.width / 50;
      let p = 100 - (s + 500 - Date.now()) / 5;
      let opacity = parseInt(125 - p * 1.25);
      if (opacity <= 0) opacity = "00";
      if (skin.note[n].type == "gradient") {
        let grd = ctx.createLinearGradient(cx - w, cy - w, cx + w, cy + w);
        for (let i = 0; i < skin.note[n].stops.length; i++) {
          grd.addColorStop(skin.note[n].stops[i].percentage / 100, `#${skin.note[n].stops[i].color}${opacity.toString(16).padStart(2, "0")}`);
        }
        ctx.fillStyle = grd;
        ctx.strokeStyle = grd;
      } else if (skin.note[n].type == "color") {
        ctx.fillStyle = `#${skin.note[n].color}${opacity.toString(16)}`;
        ctx.strokeStyle = `#${skin.note[n].color}${opacity.toString(16)}`;
      }
      ctx.arc(cx, cy, w, 0, 2 * Math.PI);
      ctx.stroke();
      w = canvas.width / 70 + canvas.width / 400 + width * (p / 100);
      if (p < 100) {
        requestAnimationFrame(() => {
          raf(w, s, n);
        });
      }
    };
    raf(canvas.width / 70 + canvas.width / 400, Date.now(), d);
  } else if (n == 2) {
    //Click Default
    const raf = (w, s) => {
      ctx.beginPath();
      let width = canvas.width / 60;
      let p = 100 - (s + 300 - Date.now()) / 3;
      let grd = ctx.createLinearGradient(cx - w, cy - w, cx + w, cy + w);
      grd.addColorStop(0, `rgba(174, 102, 237, ${0.5 - p / 200})`);
      grd.addColorStop(1, `rgba(102, 183, 237, ${0.5 - p / 200})`);
      ctx.strokeStyle = grd;
      ctx.arc(cx, cy, w, 0, 2 * Math.PI);
      ctx.stroke();
      w = canvas.width / 70 + canvas.width / 400 + width * (p / 100);
      if (p < 100) {
        requestAnimationFrame(() => {
          raf(w, s);
        });
      }
    };
    raf(canvas.width / 70 + canvas.width / 400, Date.now());
  } else if (n == 3) {
    //Judge
    if (!hide[j.toLowerCase()]) {
      const raf = (y, s) => {
        ctx.beginPath();
        let p = 100 - (s + 300 - Date.now()) / 3;
        let newY = cy - Math.round(p / 10);
        ctx.fillStyle = getJudgeStyle(j.toLowerCase(), p, cx, newY);
        ctx.strokeStyle = `rgba(255, 255, 255, ${1 - p / 100})`;
        ctx.font = `600 ${(window.innerHeight / 25) * pixelRatio}px Metropolis, Pretendard Variable`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 2;
        ctx.strokeText(j, cx, newY);
        ctx.fillText(j, cx, newY);
        if (p < 100) {
          requestAnimationFrame(() => {
            raf(cy, s);
          });
        }
      };
      raf(cy, Date.now());
    }
  } else if (n == 4) {
    //judge:miss
    if (!hide.miss) {
      ctx.beginPath();
      let p = 100 - (missParticles[j].s + 300 - Date.now()) / 3;
      let newY = cy - Math.round(p / 10);
      ctx.fillStyle = getJudgeStyle("miss", p);
      ctx.strokeStyle = `rgba(255, 255, 255, ${1 - p / 100})`;
      ctx.font = `600 ${(window.innerHeight / 25) * pixelRatio}px Metropolis, Pretendard Variable`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 2;
      ctx.strokeText("Miss", cx, newY);
      ctx.fillText("Miss", cx, newY);
    }
  }
};

const drawNote = (p, x, y, n, d) => {
  p = Math.max(p, 0);
  x = (canvas.width / 200) * (x + 100);
  y = (canvas.height / 200) * (y + 100);
  n = n == undefined ? 0 : n;
  let w = canvas.width / 40;
  let opacity = "FF";
  if (p > 100) {
    opacity = `${parseInt((130 - p) * 3.333)}`.padStart(2, "0");
  }
  if (opacity <= 0) opacity = "00";
  if (!denySkin) {
    if (skin.note[n].type == "gradient") {
      let grd = ctx.createLinearGradient(x - w, y - w, x + w, y + w);
      for (let i = 0; i < skin.note[n].stops.length; i++) {
        grd.addColorStop(skin.note[n].stops[i].percentage / 100, `#${skin.note[n].stops[i].color}${opacity.toString(16)}`);
      }
      ctx.fillStyle = grd;
      ctx.strokeStyle = grd;
    } else if (skin.note[n].type == "color") {
      ctx.fillStyle = `#${skin.note[n].color}${opacity.toString(16)}`;
      ctx.strokeStyle = `#${skin.note[n].color}${opacity.toString(16)}`;
    }
  } else {
    let grd = ctx.createLinearGradient(x - w, y - w, x + w, y + w);
    grd.addColorStop(0, `${["#fb4934", "#53cddb"][n]}${opacity}`);
    grd.addColorStop(1, `${["#ebd934", "#0669ff"][n]}${opacity}`);
    ctx.fillStyle = grd;
    ctx.strokeStyle = grd;
  }
  ctx.lineWidth = Math.round(canvas.width / 500);
  ctx.beginPath();
  ctx.arc(x, y, w, 0, (p / 50) * Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, (w / 100) * p, 0, 2 * Math.PI);
  ctx.fill();
  if (n == 0) return;
  ctx.beginPath();
  if (opacity != "FF") {
    ctx.strokeStyle = `#${skin.note[n].arrow}${opacity.toString(16)}`;
  } else {
    let arrowOpacity = (p * 5 > 255 ? 255 : Math.round(p) * 5).toString(16).padStart(2, "0");
    ctx.strokeStyle = `#${skin.note[n].arrow}${arrowOpacity}`;
  }
  ctx.lineWidth = Math.round(canvas.width / 400);
  let add = ((w / 2) * (-1 * d)) / 2;
  ctx.moveTo(x - add, y - add / 2);
  ctx.lineTo(x, y + add / 2);
  ctx.lineTo(x + add, y - add / 2);
  ctx.stroke();
};

const drawCursor = () => {
  ctx.beginPath();
  let w = (canvas.width / 70) * cursorZoom;
  if (mouseClickedMs == -1) {
    mouseClickedMs = Date.now() - 100;
  }
  if (mouseClicked) {
    if (mouseClickedMs + 10 > Date.now()) {
      w = w + (canvas.width / 400) * (1 - (mouseClickedMs + 10 - Date.now()) / 10);
    } else {
      w = w + (canvas.width / 400) * 1;
    }
  } else {
    if (mouseClickedMs + 100 > Date.now()) {
      w = w + ((canvas.width / 400) * (mouseClickedMs + 100 - Date.now())) / 100;
    }
  }
  let x = (canvas.width / 200) * (mouseX + 100);
  let y = (canvas.height / 200) * (mouseY + 100);
  if (!denySkin) {
    if (skin.cursor.type == "gradient") {
      let grd = ctx.createLinearGradient(x - w, y - w, x + w, y + w);
      for (let i = 0; i < skin.cursor.stops.length; i++) {
        grd.addColorStop(skin.cursor.stops[i].percentage / 100, `#${skin.cursor.stops[i].color}`);
      }
      ctx.fillStyle = grd;
    } else if (skin.cursor.type == "color") {
      ctx.fillStyle = `#${skin.cursor.color}`;
    }
  } else {
    let grd = ctx.createLinearGradient(x - w, y - w, x + w, y + w);
    grd.addColorStop(0, `rgb(174, 102, 237)`);
    grd.addColorStop(1, `rgb(102, 183, 237)`);
    ctx.fillStyle = grd;
  }
  ctx.arc(x, y, w, 0, 2 * Math.PI);
  ctx.fill();
};

const drawBullet = (n, x, y, a) => {
  x = (canvas.width / 200) * (x + 100);
  y = (canvas.height / 200) * (y + 100);
  let w = canvas.width / 80;
  if (!denySkin) {
    if (skin.bullet.type == "gradient") {
      let grd = ctx.createLinearGradient(x - w, y - w, x + w, y + w);
      for (let i = 0; i < skin.bullet.stops.length; i++) {
        grd.addColorStop(skin.bullet.stops[i].percentage / 100, `#${skin.bullet.stops[i].color}`);
      }
      ctx.fillStyle = grd;
      ctx.strokeStyle = grd;
    } else if (skin.bullet.type == "color") {
      ctx.fillStyle = `#${skin.bullet.color}`;
      ctx.strokeStyle = `#${skin.bullet.color}`;
    }
  } else {
    ctx.fillStyle = "#555";
    ctx.strokeStyle = "#555";
  }
  ctx.beginPath();
  switch (n) {
    case 0:
      a = Math.PI * (a / 180 + 0.5);
      ctx.arc(x, y, w, a, a + Math.PI);
      a = a - 0.5 * Math.PI;
      ctx.moveTo(x - w * Math.sin(a), y + w * Math.cos(a));
      ctx.lineTo(x + w * 2 * Math.cos(a), y + w * 2 * Math.sin(a));
      ctx.lineTo(x + w * Math.sin(a), y - w * Math.cos(a));
      ctx.fill();
      break;
    case 1:
      ctx.arc(x, y, w, 0, Math.PI * 2);
      ctx.fill();
      break;
    default:
      ctx.font = `500 ${(window.innerHeight / 30) * pixelRatio}px Metropolis, Pretendard Variable`;
      ctx.fillStyle = "#F55";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(`drawBullet:bullet number isn't specified.`, canvas.width / 100, canvas.height / 100);
      console.error(`drawBullet:bullet number isn't specified.`);
  }
};

const callBulletDestroy = (j) => {
  const seek = song.seek() - (offset + sync) / 1000;
  const p = ((seek * 1000 - pattern.bullets[j].ms) / ((bpm * 40) / speed / pattern.bullets[j].speed)) * 100;
  const left = pattern.bullets[j].direction == "L";
  let x = (left ? -1 : 1) * (100 - p);
  let y = 0;
  if (pattern.bullets[j].value == 0) {
    y = pattern.bullets[j].location + p * getTan(pattern.bullets[j].angle) * (left ? 1 : -1);
  } else {
    if (!circleBulletAngles[j]) circleBulletAngles[j] = calcAngleDegrees((left ? -100 : 100) - mouseX, pattern.bullets[j].location - mouseY);
    if (left) {
      if (110 > circleBulletAngles[j] && circleBulletAngles[j] > 0) circleBulletAngles[j] = 110;
      else if (0 > circleBulletAngles[j] && circleBulletAngles[j] > -110) circleBulletAngles[j] = -110;
    } else {
      if (70 < circleBulletAngles[j] && circleBulletAngles[j] > 0) circleBulletAngles[j] = 70;
      else if (0 > circleBulletAngles[j] && circleBulletAngles[j] < -70) circleBulletAngles[j] = -70;
    }
    y = pattern.bullets[j].location + p * getTan(circleBulletAngles[j]) * (left ? 1 : -1);
  }
  let randomDirection = [];
  for (let i = 0; i < 3; i++) {
    let rx = Math.floor(Math.random() * 4) - 2;
    let ry = Math.floor(Math.random() * 4) - 2;
    randomDirection[i] = [rx, ry];
  }
  destroyParticles.push({
    x: x,
    y: y,
    w: 5,
    n: 1,
    d: randomDirection,
    ms: Date.now(),
  });
  destroyedBullets.add(j);
};

const cntRender = () => {
  eraseCnt();
  if (window.devicePixelRatio != pixelRatio) {
    pixelRatio = window.devicePixelRatio;
    initialize(false);
  }
  if (isResultShowing) {
    if (resultMs == 0) {
      resultMs = Date.now();
    }
  }
  if (resultMs != 0 && resultMs + 500 <= Date.now()) return;
  try {
    if (comboAlert) {
      let comboOpacity = 0;
      let fontSize = 20;
      if (comboAlertMs + 300 > Date.now()) {
        comboOpacity = 1 - (comboAlertMs + 300 - Date.now()) / 300;
      } else if (comboAlertMs + 300 <= Date.now() && comboAlertMs + 600 > Date.now()) {
        comboOpacity = 1;
      } else if (comboAlertMs + 600 <= Date.now() && comboAlertMs + 900 > Date.now()) {
        comboOpacity = (comboAlertMs + 900 - Date.now()) / 900;
      }
      fontSize = (window.innerHeight / 100) * (30 - (comboAlertMs + 900 - Date.now()) / 90) * pixelRatio;
      ctx.beginPath();
      ctx.font = `700 ${fontSize}px Metropolis, Pretendard Variable`;
      ctx.fillStyle = `rgba(200,200,200,${comboOpacity})`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillText(comboAlertCount, canvas.width / 2, canvas.height / 2);
    }
    ctx.lineWidth = 5;
    pointingCntElement = [{ v1: "", v2: "", i: "" }];
    const seek = song.seek() - (offset + sync) / 1000;
    let start = lowerBound(pattern.triggers, 0);
    let end = upperBound(pattern.triggers, seek * 1000 + 2); //2 for floating point miss
    const renderTriggers = pattern.triggers.slice(start, end);
    for (let i = 0; i < renderTriggers.length; i++) {
      if (renderTriggers[i].value == 0) {
        if (!destroyedBullets.has(renderTriggers[i].num)) {
          callBulletDestroy(renderTriggers[i].num);
        }
      } else if (renderTriggers[i].value == 1) {
        end = upperBound(pattern.bullets, renderTriggers[i].ms);
        const renderBullets = pattern.bullets.slice(0, end);
        for (let j = 0; renderBullets.length > j; j++) {
          if (!destroyedBullets.has(j)) {
            callBulletDestroy(j);
          }
        }
      } else if (renderTriggers[i].value == 2) {
        bpm = renderTriggers[i].bpm;
      } else if (renderTriggers[i].value == 3) {
        canvas.style.opacity = renderTriggers[i].opacity;
      } else if (renderTriggers[i].value == 4) {
        speed = renderTriggers[i].speed;
      } else if (renderTriggers[i].value == 5) {
        if (renderTriggers[i].ms - 1 <= seek * 1000 && renderTriggers[i].ms + renderTriggers[i].time > seek * 1000) {
          ctx.beginPath();
          ctx.fillStyle = "#111";
          ctx.font = `${renderTriggers[i].weight} ${renderTriggers[i].size} Metropolis, Pretendard Variable`;
          if (renderTriggers[i].size.indexOf("vh") != -1)
            ctx.font = `${renderTriggers[i].weight} ${(window.innerHeight / 100) * Number(renderTriggers[i].size.split("vh")[0]) * pixelRatio}px Metropolis, Pretendard Variable`;
          ctx.textAlign = renderTriggers[i].align;
          ctx.textBaseline = renderTriggers[i].valign;
          ctx.fillText(renderTriggers[i].text, (canvas.width / 200) * (renderTriggers[i].x + 100), (canvas.height / 200) * (renderTriggers[i].y + 100));
        }
      }
    }
    for (let i = 0; i < destroyParticles.length; i++) {
      if (destroyParticles[i].w > 0) {
        drawParticle(0, destroyParticles[i].x, destroyParticles[i].y, i);
        destroyParticles[i].w = 10 - (Date.now() - destroyParticles[i].ms) / 25;
        destroyParticles[i].n++;
      }
    }
    start = lowerBound(pattern.patterns, seek * 1000 - (bpm * 4) / speed);
    end = upperBound(pattern.patterns, seek * 1000 + (bpm * 14) / speed);
    const renderNotes = pattern.patterns.slice(start, end);
    for (let i = 0; renderNotes.length > i; i++) {
      trackMouseSelection(start + i, 0, renderNotes[i].value, renderNotes[i].x, renderNotes[i].y);
    }
    for (let i = renderNotes.length - 1; i >= 0; i--) {
      const p = (((bpm * 14) / speed - (renderNotes[i].ms - seek * 1000)) / ((bpm * 14) / speed)) * 100;
      drawNote(p, renderNotes[i].x, renderNotes[i].y, renderNotes[i].value, renderNotes[i].direction);
      if (p >= 120 && !destroyedNotes.has(start + i)) {
        calculateScore("miss", start + i, true);
        missParticles.push({
          x: renderNotes[i].x,
          y: renderNotes[i].y,
          s: Date.now(),
        });
        miss++;
        missPoint.push(song.seek() * 1000);
      }
    }
    for (let i = 0; i < missParticles.length; i++) {
      if (missParticles[i].s + 300 > Date.now()) {
        drawParticle(4, missParticles[i].x, missParticles[i].y, i);
      }
    }
    start = lowerBound(pattern.bullets, seek * 1000 - bpm * 100);
    end = upperBound(pattern.bullets, seek * 1000);
    const renderBullets = pattern.bullets.slice(start, end);
    for (let i = 0; i < renderBullets.length; i++) {
      if (!destroyedBullets.has(start + i)) {
        const p = ((seek * 1000 - renderBullets[i].ms) / ((bpm * 40) / speed / renderBullets[i].speed)) * 100;
        const left = renderBullets[i].direction == "L";
        let x = (left ? -1 : 1) * (100 - p);
        let y = 0;
        if (renderBullets[i].value == 0) {
          y = renderBullets[i].location + p * getTan(renderBullets[i].angle) * (left ? 1 : -1);
          trackMouseSelection(start + i, 1, renderBullets[i].value, x, y);
          drawBullet(renderBullets[i].value, x, y, renderBullets[i].angle + (left ? 0 : 180));
        } else {
          if (!circleBulletAngles[start + i]) circleBulletAngles[start + i] = calcAngleDegrees((left ? -100 : 100) - mouseX, renderBullets[i].location - mouseY);
          if (left) {
            if (110 > circleBulletAngles[start + i] && circleBulletAngles[start + i] > 0) circleBulletAngles[start + i] = 110;
            else if (0 > circleBulletAngles[start + i] && circleBulletAngles[start + i] > -110) circleBulletAngles[start + i] = -110;
          } else {
            if (70 < circleBulletAngles[start + i] && circleBulletAngles[start + i] > 0) circleBulletAngles[start + i] = 70;
            else if (0 > circleBulletAngles[start + i] && circleBulletAngles[start + i] < -70) circleBulletAngles[start + i] = -70;
          }
          y = renderBullets[i].location + p * getTan(circleBulletAngles[start + i]) * (left ? 1 : -1);
          trackMouseSelection(start + i, 1, renderBullets[i].value, x, y);
          drawBullet(renderBullets[i].value, x, y, "");
        }
      }
    }
  } catch (e) {
    if (e) {
      ctx.font = `500 ${(window.innerHeight / 30) * pixelRatio}px Metropolis, Pretendard Variable`;
      ctx.fillStyle = "#F55";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(e, canvas.width / 100, canvas.height / 100);
      console.error(e);
    }
  }
  if (Date.now() - scoreMs < 500) {
    displayScore += ((score - prevScore) / 500) * (Date.now() - scoreMs);
    prevScore = displayScore;
  } else {
    displayScore = score;
  }
  ctx.font = `700 ${(window.innerHeight / 30) * pixelRatio}px Metropolis, Pretendard Variable`;
  ctx.fillStyle = "#333";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(numberWithCommas(`${Math.round(displayScore)}`.padStart(9, 0)), canvas.width / 2, canvas.height / 80);
  ctx.font = `${(window.innerHeight / 40) * pixelRatio}px Metropolis, Pretendard Variable`;
  ctx.fillStyle = "#555";
  ctx.fillText(`${combo}x`, canvas.width / 2, canvas.height / 70 + canvas.height / 25);
  drawCursor();

  //fps counter
  if (frameCounter) {
    frameArray.push(1000 / (Date.now() - frameCounterMs));
    if (frameArray.length == 5) {
      fps = (frameArray[0] + frameArray[1] + frameArray[2] + frameArray[3] + frameArray[4]) / 5;
      frameArray = [];
    }
    // ctx.font = "2.5vh Heebo";
    // ctx.fillStyle = "#555";
    // ctx.textBaseline = "bottom";
    // ctx.fillText(fps.toFixed(), canvas.width / 2, canvas.height - canvas.height / 70);
    frameCounterMs = Date.now();
  }
  drawCursor();
  requestAnimationFrame(cntRender);
};

const trackMousePos = () => {
  let x = (event.clientX / canvasContainer.offsetWidth) * 200 - 100;
  let y = (event.clientY / canvasContainer.offsetHeight) * 200 - 100;
  mouseX = x * sens >= 100 ? 100 : x * sens <= -100 ? -100 : x * sens;
  mouseY = y * sens >= 100 ? 100 : y * sens <= -100 ? -100 : y * sens;
};

const calculateResult = () => {
  lottieAnim.stop();
  document.getElementById("wallLeft").style.left = "-10vw";
  document.getElementById("wallRight").style.right = "-10vw";
  resultEffect.play();
  document.getElementById("perfectResult").textContent = perfect;
  document.getElementById("greatResult").textContent = great;
  document.getElementById("goodResult").textContent = good;
  document.getElementById("badResult").textContent = bad;
  document.getElementById("missResult").textContent = miss;
  document.getElementById("bulletResult").textContent = bullet;
  document.getElementById("scoreText").textContent = numberWithCommas(`${score}`);
  document.getElementById("comboText").textContent = `${maxCombo}x`;
  let accuracy = (((perfect + (great / 10) * 7 + good / 2 + (bad / 10) * 3) / (perfect + great + good + bad + miss + bullet)) * 100).toFixed(1);
  document.getElementById("accuracyText").textContent = `${accuracy}%`;
  let rank = "";
  if (accuracy >= 98 && bad == 0 && miss == 0 && bullet == 0) {
    rankImg.style.animationName = "rainbow";
    rank = "SS";
  } else if (accuracy >= 95) {
    rank = "S";
  } else if (accuracy >= 90) {
    rank = "A";
  } else if (accuracy >= 80) {
    rank = "B";
  } else if (accuracy >= 70) {
    rank = "C";
  } else {
    rank = "F";
  }
  rankImg.src = `/images/parts/elements/${rank}.png`;
  document.getElementById("scoreInfoRank").style.setProperty("--background", `url('/images/parts/elements/${rank}back.png')`);
  setTimeout(() => {
    document.getElementById("componentCanvas").style.opacity = "0";
  }, 500);
  setTimeout(() => {
    floatingArrowContainer.style.display = "flex";
    floatingArrowContainer.classList.toggle("arrowFade");
  }, 1000);
  setTimeout(() => {
    floatingResultContainer.style.display = "flex";
    floatingResultContainer.classList.toggle("resultFade");
  }, 1300);
  setTimeout(() => {
    scoreContainer.style.opacity = "1";
    scoreContainer.style.pointerEvents = "all";
  }, 2000);
  missCtx.beginPath();
  missCtx.fillStyle = "#FFF";
  missCtx.strokeStyle = "#FFF";
  missCtx.lineWidth = 5;
  missCtx.moveTo(0, missCanvas.height * 0.8);
  missCtx.lineTo(missCanvas.width, missCanvas.height * 0.8);
  missCtx.stroke();
  let length = song.duration() * 1000;
  missCtx.fillStyle = "#F00";
  missCtx.strokeStyle = "#FFF";
  missCtx.lineWidth = 2;
  for (let i = 0; i < missPoint.length; i++) {
    missCtx.beginPath();
    missCtx.arc(missCanvas.width * (missPoint[i] / length), missCanvas.height * 0.8, missCanvas.height * 0.1, 0, 2 * Math.PI);
    missCtx.fill();
    missCtx.stroke();
  }
  if (missPoint.length == 0) {
    missCtx.fillStyle = "#FFF";
    missCtx.font = `500 ${(window.innerHeight / 30) * pixelRatio}px Metropolis, Pretendard Variable`;
    missCtx.textAlign = "right";
    missCtx.textBaseline = "bottom";
    missCtx.fillText("Perfect!", missCanvas.width - 10, missCanvas.height * 0.8 - 10);
  }
};

const trackMouseSelection = (i, v1, v2, x, y) => {
  if (song.playing()) {
    const powX = ((((mouseX - x) * canvasContainer.offsetWidth) / 200) * pixelRatio * settings.display.canvasRes) / 100;
    const powY = ((((mouseY - y) * canvasContainer.offsetHeight) / 200) * pixelRatio * settings.display.canvasRes) / 100;
    switch (v1) {
      case 0:
        if (Math.sqrt(Math.pow(powX, 2) + Math.pow(powY, 2)) <= canvas.width / 40 + canvas.width / 70) {
          pointingCntElement.push({ v1: v1, v2: v2, i: i });
        }
        break;
      case 1:
        if (Math.sqrt(Math.pow(powX, 2) + Math.pow(powY, 2)) <= canvas.width / 80) {
          if (!destroyedBullets.has(i)) {
            bullet++;
            missPoint.push(song.seek() * 1000);
            combo = 0;
            callBulletDestroy(i);
            colorOverlayContainer.classList.add("show");
            setTimeout(() => {
              colorOverlayContainer.classList.remove("show");
            }, 100);
          }
        }
        break;
      default:
        ctx.font = `500 ${(window.innerHeight / 30) * pixelRatio}px Metropolis, Pretendard Variable`;
        ctx.fillStyle = "#F55";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(`trackMouseSelection:Undefined element.`, canvas.width / 100, canvas.height / 100);
        console.error(`trackMouseSelection:Undefined element.`);
    }
  }
};

const compClicked = (isTyped, key, isWheel) => {
  if ((!isTyped && !settings.input.mouse && !isWheel) || isMenuOpened || !menuAllowed || mouseClicked == key) {
    return;
  }
  if (!song.playing()) {
    floatingResumeContainer.style.opacity = 0;
    setTimeout(() => {
      floatingResumeContainer.style.display = "none";
    }, 300);
    song.play();
    lottieAnim.play();
  }
  if (key && !isWheel) mouseClicked = key;
  else if (!isWheel) mouseClicked = true;
  mouseClickedMs = Date.now();
  for (let i = 0; i < pointingCntElement.length; i++) {
    if (pointingCntElement[i].v1 === 0 && !destroyedNotes.has(pointingCntElement[i].i) && (pointingCntElement[i].v2 === 0) == !isWheel) {
      if (pointingCntElement[i].v2 == 1 && pattern.patterns[pointingCntElement[i].i].direction != key) return;
      drawParticle(1, mouseX, mouseY, 0, pointingCntElement[i].v2);
      let seek = song.seek() * 1000 - (offset + sync);
      let ms = pattern.patterns[pointingCntElement[i].i].ms;
      let perfectJudge = 60000 / bpm / 8;
      let greatJudge = 60000 / bpm / 5;
      let goodJudge = 60000 / bpm / 3;
      let badJudge = 60000 / bpm / 2;
      let x = pattern.patterns[pointingCntElement[i].i].x;
      let y = pattern.patterns[pointingCntElement[i].i].y;
      if (seek < ms + perfectJudge && seek > ms - perfectJudge) {
        calculateScore("perfect", pointingCntElement[i].i);
        drawParticle(3, x, y, "Perfect");
        perfect++;
      } else if (seek < ms + greatJudge && seek > ms - greatJudge) {
        calculateScore("great", pointingCntElement[i].i);
        drawParticle(3, x, y, "Great");
        great++;
      } else if (seek > ms - goodJudge && seek < ms) {
        calculateScore("good", pointingCntElement[i].i);
        drawParticle(3, x, y, "Good");
        good++;
      } else if ((seek > ms - badJudge && seek < ms) || ms < seek) {
        calculateScore("bad", pointingCntElement[i].i);
        drawParticle(3, x, y, "Bad");
        bad++;
      } else {
        calculateScore("miss", pointingCntElement[i].i);
        drawParticle(3, x, y, "Miss");
        miss++;
      }
      return;
    }
  }
  drawParticle(2, mouseX, mouseY);
};

const compReleased = () => {
  mouseClicked = false;
  mouseClickedMs = Date.now();
};

const calculateScore = (judge, i, isMissed) => {
  scoreMs = Date.now();
  prevScore = displayScore;
  destroyedNotes.add(i);
  if (!isMissed) {
    pattern.patterns[i].ms = song.seek() * 1000 - (offset + sync);
  }
  if (judge == "miss") {
    combo = 0;
    return;
  }
  tick.play();
  combo++;
  if (maxCombo < combo) {
    maxCombo = combo;
  }
  if (judge == "perfect") {
    score += Math.round(100000000 / patternLength) + combo * 5;
  } else if (judge == "great") {
    score += Math.round((100000000 / patternLength) * 0.5) + combo * 5;
  } else if (judge == "good") {
    score += Math.round((100000000 / patternLength) * 0.2) + combo * 3;
  } else {
    combo = 0;
    score += Math.round((100000000 / patternLength) * 0.05);
  }
  if (combo % comboCount == 0 && combo != 0) {
    comboAlertMs = Date.now();
    comboAlertCount = combo;
  }
};

Pace.on("done", () => {
  if (paceLoaded) return;
  if (load == 1) {
    doneLoading();
  }
  paceLoaded++;
  load++;
});

const doneLoading = () => {
  setTimeout(() => {
    cntRender();
    document.getElementById("componentCanvas").style.opacity = "1";
    document.getElementById("loadingContainer").style.opacity = "0";
    document.getElementById("wallLeft").style.left = "0vw";
    document.getElementById("wallRight").style.right = "0vw";
    setTimeout(() => {
      document.getElementById("loadingContainer").style.display = "none";
      document.getElementById("componentCanvas").style.transitionDuration = "0s";
    }, 1000);
    setTimeout(songPlayPause, 4000);
  }, 1000);
};

const songPlayPause = () => {
  if (song.playing()) {
    song.pause();
    lottieAnim.pause();
    menuAllowed = false;
  } else {
    song.play();
    lottieAnim.play();
    menuAllowed = true;
  }
};

const resume = () => {
  fetch(`${api}/settings`, {
    method: "PUT",
    credentials: "include",
    body: JSON.stringify({
      settings: settings,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.result != "success") {
        alert(`Error occured.\n${data.error}`);
      }
    })
    .catch((error) => {
      alert(`Error occured.\n${error}`);
    });
  menuContainer.style.display = "none";
  isMenuOpened = false;
  floatingResumeContainer.style.display = "flex";
  floatingResumeContainer.style.opacity = 1;
};

const retry = () => {
  location.reload();
};

const editor = () => {
  window.location.href = `${url}/editor`;
};

const home = () => {
  window.location.href = `${url}/game?initialize=0`;
};

const settingChanged = (e, v) => {
  if (v == "volumeMaster") {
    settings.sound.volume.master = e.value / 100;
    volumeMasterValue.textContent = e.value + "%";
    for (let i = 0; i <= 1; i++) {
      document.getElementsByClassName("volumeMaster")[i].value = Math.round(settings.sound.volume.master * 100);
    }
    overlayTime = new Date().getTime();
    setTimeout(() => {
      overlayClose("volume");
    }, 1500);
    Howler.volume(settings.sound.volume.master);
  }
};

const overlayClose = (s) => {
  if (s == "volume") {
    if (overlayTime + 1400 <= new Date().getTime()) {
      volumeOverlay.classList.remove("overlayOpen");
    }
  }
};

const globalScrollEvent = (e) => {
  if (shiftDown) {
    e = window.event || e;
    let delta = Math.max(-1, Math.min(1, e.wheelDelta || -e.detail));
    if (delta == 1) {
      //UP
      if (settings.sound.volume.master <= 0.95) {
        settings.sound.volume.master = Math.round((settings.sound.volume.master + 0.05) * 100) / 100;
      } else {
        settings.sound.volume.master = 1;
      }
    } else {
      //DOWN
      if (settings.sound.volume.master >= 0.05) {
        settings.sound.volume.master = Math.round((settings.sound.volume.master - 0.05) * 100) / 100;
      } else {
        settings.sound.volume.master = 0;
      }
    }
    for (let i = 0; i <= 1; i++) {
      document.getElementsByClassName("volumeMaster")[i].value = Math.round(settings.sound.volume.master * 100);
    }
    volumeMasterValue.textContent = `${Math.round(settings.sound.volume.master * 100)}%`;
    Howler.volume(settings.sound.volume.master);
    volumeOverlay.classList.add("overlayOpen");
    overlayTime = new Date().getTime();
    setTimeout(() => {
      overlayClose("volume");
    }, 1500);
    fetch(`${api}/settings`, {
      method: "PUT",
      credentials: "include",
      body: JSON.stringify({
        settings: settings,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.result != "success") {
          alert(`Error occured.\n${data.error}`);
        }
      })
      .catch((error) => {
        alert(`Error occured.\n${error}`);
        console.error(`Error occured.\n${error}`);
      });
  } else {
    e = window.event || e;
    let delta = Math.max(-1, Math.min(1, e.wheelDelta || -e.detail));
    if (delta == 1) {
      //UP
      compClicked(false, 1, true);
    } else {
      //DOWN
      compClicked(false, -1, true);
    }
  }
};

document.onkeydown = (e) => {
  e = e || window.event;
  if (e.key == "Shift") {
    shiftDown = true;
  }
  if (!isResultShowing) {
    if (e.key == "Escape") {
      e.preventDefault();
      if (menuAllowed) {
        if (menuContainer.style.display == "none") {
          floatingResumeContainer.style.opacity = 0;
          floatingResumeContainer.style.display = "none";
          isMenuOpened = true;
          menuContainer.style.display = "flex";
          song.pause();
          lottieAnim.pause();
        } else {
          resume();
        }
      }
      return;
    }
    if (inputMode == 1 && !/^[a-z]{1}$/i.test(e.key)) {
      return;
    } else if (inputMode == 2 && !/^[zx]{1}$/i.test(e.key)) {
      return;
    }
    compClicked(true, e.key, false);
  }
};

document.onkeyup = (e) => {
  e = e || window.event;
  if (e.key == "Escape") {
    return;
  } else if (e.key == "Shift") {
    shiftDown = false;
  }
  mouseClicked = false;
  mouseClickedMs = Date.now();
};

window.addEventListener("resize", () => {
  initialize(false);
});

window.addEventListener("mousewheel", globalScrollEvent);
window.addEventListener("DOMMouseScroll", globalScrollEvent);
