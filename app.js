
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const els = {
    blackClock: $("blackClock"),
    whiteClock: $("whiteClock"),
    blackTime: $("blackTime"),
    whiteTime: $("whiteTime"),
    blackHint: $("blackHint"),
    whiteHint: $("whiteHint"),
    status: $("gameStatus"),
    statusDot: $("statusDot"),
    mode: $("modeLabel"),
    reset: $("resetButton"),
    pause: $("pauseButton"),
    pauseIcon: $("pauseIcon"),
    pauseText: $("pauseText"),
    flip: $("flipButton"),
    settingsButton: $("settingsButton"),
    settingsPanel: $("settingsPanel"),
    closeSettings: $("closeSettings"),
    presets: [...document.querySelectorAll(".preset")],
    customMinutes: $("customMinutes"),
    customIncrement: $("customIncrement"),
    applyCustom: $("applyCustom"),
    sound: $("soundToggle"),
    vibration: $("vibrationToggle"),
    newGame: $("newGameButton"),
    overlay: $("resultOverlay"),
    resultSymbol: $("resultSymbol"),
    resultTitle: $("resultTitle"),
    resultMessage: $("resultMessage"),
    resultReset: $("resultReset")
  };

  const initial = {
    minutes: 5,
    increment: 0
  };

  let config = { ...initial };
  let times = { white: 300000, black: 300000 };
  let active = null;
  let running = false;
  let paused = false;
  let finished = false;
  let flipped = false;
  let lastTick = 0;
  let timerId = null;
  let audioContext = null;

  function formatTime(ms) {
    const totalSeconds = Math.ceil(Math.max(0, ms) / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes >= 100) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${String(hours).padStart(2, "0")}:${String(remainingMinutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function updateDisplay() {
    els.whiteTime.textContent = formatTime(times.white);
    els.blackTime.textContent = formatTime(times.black);

    els.whiteClock.classList.toggle("active", running && active === "white");
    els.blackClock.classList.toggle("active", running && active === "black");

    els.whiteClock.classList.toggle("low-time", times.white <= 10000);
    els.blackClock.classList.toggle("low-time", times.black <= 10000);

    els.whiteHint.textContent =
      finished && times.white <= 0 ? "ВРЕМЯ ВЫШЛО" :
      running && active === "white" ? "ВАШ ХОД" :
      paused ? "ПАУЗА" : "НАЖМИ, ЧТОБЫ СДЕЛАТЬ ХОД";

    els.blackHint.textContent =
      finished && times.black <= 0 ? "ВРЕМЯ ВЫШЛО" :
      running && active === "black" ? "ХОД СОПЕРНИКА" :
      paused ? "ПАУЗА" : "НАЖМИ, ЧТОБЫ СДЕЛАТЬ ХОД";

    els.status.textContent = finished
      ? "ПАРТИЯ ЗАВЕРШЕНА"
      : paused
        ? "ПАУЗА"
        : running
          ? (active === "white" ? "ХОД БЕЛЫХ" : "ХОД ЧЁРНЫХ")
          : "ГОТОВ К ИГРЕ";

    els.statusDot.classList.toggle("running", running && !paused);

    els.pauseIcon.textContent = paused || !running ? "▶" : "Ⅱ";
    els.pauseText.textContent = paused || !running ? "ПРОДОЛЖИТЬ" : "ПАУЗА";

    els.mode.textContent = `${config.minutes} МИН · +${config.increment} СЕК`;
  }

  function playSound(frequency = 650, duration = 0.07) {
    if (!els.sound.checked) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioContext) audioContext = new AudioCtx();
      if (audioContext.state === "suspended") audioContext.resume();

      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.08, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + duration
      );

      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch (_) {
      // Звук недоступен — часы продолжают работать.
    }
  }

  function vibrate(pattern = 20) {
    if (els.vibration.checked && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  }

  function stopTimer() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function finishGame(loser) {
    stopTimer();
    times[loser] = 0;
    running = false;
    paused = false;
    finished = true;

    const winner = loser === "white" ? "чёрные" : "белые";

    els.resultSymbol.textContent = loser === "white" ? "♚" : "♔";
    els.resultTitle.textContent = "Время вышло";
    els.resultMessage.textContent = `Победили ${winner}`;
    els.overlay.hidden = false;

    playSound(300, 0.3);
    vibrate([100, 60, 100]);
    updateDisplay();
  }

  function tick() {
    if (!running || paused || finished || !active) return;

    const now = performance.now();
    const elapsed = now - lastTick;
    lastTick = now;

    times[active] -= elapsed;

    if (times[active] <= 0) {
      finishGame(active);
      return;
    }

    updateDisplay();
  }

  function startClock(player) {
    if (finished) return;

    if (!running) {
      active = player;
      running = true;
      paused = false;
      lastTick = performance.now();
      stopTimer();
      timerId = setInterval(tick, 50);
      playSound();
      vibrate();
      updateDisplay();
      return;
    }

    if (paused || player !== active) return;

    // Добавление времени после завершения хода.
    times[player] += config.increment * 1000;

    active = player === "white" ? "black" : "white";
    lastTick = performance.now();

    playSound();
    vibrate();
    updateDisplay();
  }

  function resetGame() {
    stopTimer();

    times = {
      white: config.minutes * 60000,
      black: config.minutes * 60000
    };

    active = null;
    running = false;
    paused = false;
    finished = false;
    lastTick = 0;

    els.overlay.hidden = true;
    updateDisplay();
  }

  function togglePause() {
    if (finished) return;

    if (!running) {
      startClock("white");
      return;
    }

    if (paused) {
      paused = false;
      lastTick = performance.now();
      timerId = setInterval(tick, 50);
      playSound();
    } else {
      paused = true;
      stopTimer();
      playSound(450);
    }

    updateDisplay();
  }

  function setMode(minutes, increment) {
    config = { minutes, increment };

    els.presets.forEach((button) => {
      const matches =
        Number(button.dataset.minutes) === minutes &&
        Number(button.dataset.increment) === increment;

      button.classList.toggle("active", matches);
    });

    els.customMinutes.value = minutes;
    els.customIncrement.value = increment;

    resetGame();
    updateDisplay();
  }

  function toggleFlip() {
    flipped = !flipped;

    const area = document.querySelector(".clock-area");
    const black = els.blackClock;
    const white = els.whiteClock;

    if (flipped) {
      area.insertBefore(white, black);
    } else {
      area.insertBefore(black, white);
    }

    els.flip.setAttribute("aria-pressed", String(flipped));
  }

  els.whiteClock.addEventListener("click", () => startClock("white"));
  els.blackClock.addEventListener("click", () => startClock("black"));

  els.reset.addEventListener("click", resetGame);
  els.pause.addEventListener("click", togglePause);
  els.flip.addEventListener("click", toggleFlip);

  els.settingsButton.addEventListener("click", () => {
    els.settingsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  els.closeSettings.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  els.presets.forEach((button) => {
    button.addEventListener("click", () => {
      setMode(
        Number(button.dataset.minutes),
        Number(button.dataset.increment)
      );
    });
  });

  els.applyCustom.addEventListener("click", () => {
    const minutes = Number(els.customMinutes.value);
    const increment = Number(els.customIncrement.value);

    if (
      !Number.isInteger(minutes) ||
      minutes < 1 ||
      minutes > 180 ||
      !Number.isInteger(increment) ||
      increment < 0 ||
      increment > 180
    ) {
      alert("Укажи от 1 до 180 минут и от 0 до 180 секунд добавления.");
      return;
    }

    setMode(minutes, increment);
  });

  els.newGame.addEventListener("click", resetGame);
  els.resultReset.addEventListener("click", resetGame);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && running && !paused && !finished) {
      // Сохраняем корректный отсчёт времени при возвращении в приложение.
      tick();
      lastTick = performance.now();
    }
  });

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }

  updateDisplay();
})();
