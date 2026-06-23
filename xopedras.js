/* XôPedras — controle de água
   Tudo roda no dispositivo. Nenhum dado sai do seu navegador. */
"use strict";

(() => {
  const STORAGE_KEY = "xopedras.v1";
  const MAX_TRIGGER_SLOTS = 24; // limite de notificações agendadas de uma vez
  const TITLE = "Hora de beber água 💧";

  const DEFAULTS = {
    settings: {
      goalMl: 5000,
      bottleMl: 800,
      reminder: { enabled: false, intervalMin: 90, start: "07:00", end: "23:00", lastFired: 0 },
    },
    days: {}, // "YYYY-MM-DD": [ { t: epochMs, ml: number } ]
  };

  // ---------- estado ----------
  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(DEFAULTS);
      const parsed = JSON.parse(raw);
      return {
        settings: { ...DEFAULTS.settings, ...(parsed.settings || {}),
          reminder: { ...DEFAULTS.settings.reminder, ...((parsed.settings || {}).reminder || {}) } },
        days: parsed.days || {},
      };
    } catch {
      return structuredClone(DEFAULTS);
    }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch { toast("Não consegui salvar — verifique o espaço do navegador."); }
  }

  // ---------- datas ----------
  function dayKey(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  function todaysEntries() {
    const k = dayKey();
    if (!Array.isArray(state.days[k])) state.days[k] = [];
    return state.days[k];
  }

  // ---------- formatação ----------
  const fmtL = (ml) => (ml / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  // ---------- elementos ----------
  const $ = (id) => document.getElementById(id);
  const el = {
    app: $("app"), date: $("dateLabel"),
    water: document.querySelector(".water"), vessel: document.querySelector(".vessel"),
    litersNow: $("litersNow"), litersGoal: $("litersGoal"),
    bottles: $("bottles"), remaining: $("remaining"),
    logBtn: $("logBtn"), logSub: $("logSub"), undoBtn: $("undoBtn"),
    history: $("historyBars"),
    openSettings: $("openSettings"), closeSettings: $("closeSettings"),
    sheet: $("settingsSheet"), backdrop: $("sheetBackdrop"),
    goalInput: $("goalInput"), bottleInput: $("bottleInput"),
    notifSwitch: $("notifSwitch"), notifHint: $("notifHint"),
    reminderConfig: $("reminderConfig"),
    intervalInput: $("intervalInput"), startInput: $("startInput"), endInput: $("endInput"),
    testNotif: $("testNotif"), bgNote: $("bgNote"),
    resetToday: $("resetToday"), toast: $("toast"),
    installBar: $("installBar"), installBtn: $("installBtn"),
    installDismiss: $("installDismiss"), installBtn2: $("installBtn2"),
  };

  // ---------- render ----------
  let lastDone = 0;
  function render(animateLast = false) {
    const s = state.settings;
    const entries = todaysEntries();
    const total = entries.reduce((a, e) => a + (e.ml || 0), 0);
    const goal = s.goalMl;
    const p = Math.max(0, Math.min(1, goal > 0 ? total / goal : 0));

    el.water.style.transform = `translateY(${(1 - p) * 240}px)`;
    el.litersNow.textContent = fmtL(total);
    el.litersGoal.textContent = fmtL(goal);
    el.vessel.classList.toggle("is-complete", total >= goal && goal > 0);

    el.date.textContent = new Date().toLocaleDateString("pt-BR",
      { weekday: "long", day: "2-digit", month: "long" });

    // pips
    const done = entries.length;
    const needed = Math.max(1, Math.ceil(goal / Math.max(1, s.bottleMl)));
    const totalPips = Math.max(needed, done);
    el.bottles.innerHTML = "";
    for (let i = 0; i < totalPips; i++) {
      const pip = document.createElement("span");
      pip.className = "pip" + (i < done ? " full" : "");
      if (animateLast && i === done - 1 && done > lastDone) pip.classList.add("pop");
      el.bottles.appendChild(pip);
    }
    if (animateLast) setTimeout(() => el.bottles.querySelector(".pop")?.classList.remove("pop"), 260);
    lastDone = done;

    // texto de restante
    const remMl = Math.max(0, goal - total);
    if (remMl <= 0) {
      el.remaining.innerHTML = "Meta de hoje atingida 🎉";
    } else {
      const remB = Math.ceil(remMl / Math.max(1, s.bottleMl));
      const word = remB === 1 ? "garrafa" : "garrafas";
      el.remaining.innerHTML = `Faltam <strong>${remB} ${word}</strong> · ${fmtL(remMl)} L`;
    }

    el.logSub.textContent = `${s.bottleMl} ml`;
    el.undoBtn.disabled = done === 0;

    renderHistory(goal);
  }

  function renderHistory(goal) {
    const names = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
    el.history.innerHTML = "";
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const entries = state.days[dayKey(d)] || [];
      const total = entries.reduce((a, e) => a + (e.ml || 0), 0);
      const pct = goal > 0 ? Math.min(100, Math.round((total / goal) * 100)) : 0;
      const met = total >= goal && goal > 0;

      const col = document.createElement("div");
      col.className = "hbar" + (i === 0 ? " today" : "");
      const track = document.createElement("div"); track.className = "hbar__track";
      const fill = document.createElement("div");
      fill.className = "hbar__fill" + (met ? " met" : "");
      fill.style.height = pct + "%";
      track.appendChild(fill);
      const lbl = document.createElement("div"); lbl.className = "hbar__day"; lbl.textContent = names[d.getDay()];
      const lbl2 = lbl;
      col.appendChild(track); col.appendChild(lbl2);
      col.title = `${fmtL(total)} L`;
      el.history.appendChild(col);
    }
  }

  // ---------- ações ----------
  function logBottle() {
    const s = state.settings;
    const entries = todaysEntries();
    const before = entries.reduce((a, e) => a + (e.ml || 0), 0);
    entries.push({ t: Date.now(), ml: s.bottleMl });
    save();
    render(true);
    navigator.vibrate?.(15);

    const after = before + s.bottleMl;
    if (before < s.goalMl && after >= s.goalMl) {
      navigator.vibrate?.([20, 60, 30]);
      toast("Meta de hoje batida! Mandou muito bem 💧");
      clearReminders().catch(() => {}); // não precisa nagar mais hoje
    }
  }

  function undo() {
    const entries = todaysEntries();
    if (!entries.length) return;
    entries.pop();
    save();
    render();
    navigator.vibrate?.(10);
  }

  // ---------- toast ----------
  let toastTimer;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.hidden = false;
    requestAnimationFrame(() => el.toast.classList.add("show"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.toast.classList.remove("show");
      setTimeout(() => (el.toast.hidden = true), 220);
    }, 2600);
  }

  // ---------- ajustes ----------
  function openSheet() {
    const s = state.settings;
    el.installBtn2.hidden = !(deferredPrompt && !isStandalone());
    el.goalInput.value = (s.goalMl / 1000).toString().replace(".", ",");
    el.bottleInput.value = s.bottleMl;
    el.intervalInput.value = s.reminder.intervalMin;
    el.startInput.value = s.reminder.start;
    el.endInput.value = s.reminder.end;
    el.notifSwitch.setAttribute("aria-checked", String(s.reminder.enabled && notifGranted()));
    el.reminderConfig.hidden = !(s.reminder.enabled && notifGranted());
    updateBgNote();
    updateNotifHint();
    el.sheet.hidden = false;
  }
  function closeSheet() { el.sheet.hidden = true; }

  function parseNum(v) { return parseFloat(String(v).replace(",", ".")); }

  function commitSettings() {
    const s = state.settings;
    const goalL = parseNum(el.goalInput.value);
    if (!isNaN(goalL) && goalL > 0) s.goalMl = Math.round(goalL * 1000);
    const bottle = parseInt(el.bottleInput.value, 10);
    if (!isNaN(bottle) && bottle >= 50) s.bottleMl = bottle;
    const iv = parseInt(el.intervalInput.value, 10);
    if (!isNaN(iv) && iv >= 15) s.reminder.intervalMin = iv;
    if (el.startInput.value) s.reminder.start = el.startInput.value;
    if (el.endInput.value) s.reminder.end = el.endInput.value;
    save();
    render();
    if (s.reminder.enabled) scheduleReminders().catch(() => {});
  }

  // ---------- notificações ----------
  const notifSupported = "Notification" in window && "serviceWorker" in navigator;
  const triggersSupported = notifSupported && "showTrigger" in Notification.prototype;
  const notifGranted = () => notifSupported && Notification.permission === "granted";

  async function ensurePermission() {
    if (!notifSupported) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const r = await Notification.requestPermission();
    return r === "granted";
  }

  function updateNotifHint() {
    if (!notifSupported) { el.notifHint.textContent = "Seu navegador não suporta notificações."; return; }
    if (Notification.permission === "denied") {
      el.notifHint.textContent = "As notificações estão bloqueadas. Libere nas permissões do site no Android.";
    } else {
      el.notifHint.textContent = "Avisos para você não esquecer de beber. O app funciona normalmente sem eles.";
    }
  }
  function updateBgNote() {
    el.bgNote.textContent = triggersSupported
      ? "Os lembretes funcionam mesmo com o app fechado. Se algum não chegar, libere a execução em segundo plano do navegador nos ajustes de bateria do Android."
      : "Neste aparelho, os lembretes só disparam com o app aberto (mesmo em segundo plano). Instale o XôPedras na tela inicial e, em aparelhos com economia de bateria agressiva (Xiaomi, Oppo, Realme, Samsung), libere a execução em segundo plano do navegador.";
  }

  async function getReg() { return navigator.serviceWorker.ready; }

  async function clearReminders() {
    if (!notifSupported) return;
    try {
      const reg = await getReg();
      let list = [];
      try { list = await reg.getNotifications({ includeTriggered: true }); }
      catch { list = await reg.getNotifications(); }
      for (const n of list) if (n.tag && n.tag.startsWith("xopedras-rem-")) n.close();
    } catch {}
  }

  function hmToMin(hm) { const [h, m] = hm.split(":").map(Number); return h * 60 + (m || 0); }

  function buildSlots() {
    const s = state.settings.reminder;
    const startM = hmToMin(s.start), endM = hmToMin(s.end), step = Math.max(15, s.intervalMin);
    const now = Date.now();
    const slots = [];
    for (let off = 0; off <= 1 && slots.length < MAX_TRIGGER_SLOTS; off++) {
      const base = new Date(); base.setHours(0, 0, 0, 0); base.setDate(base.getDate() + off);
      for (let m = startM; m <= endM && slots.length < MAX_TRIGGER_SLOTS; m += step) {
        const ts = base.getTime() + m * 60000;
        if (ts > now + 30000) slots.push(ts);
      }
    }
    return slots;
  }

  let fallbackTimer = null;
  async function scheduleReminders() {
    const s = state.settings.reminder;
    if (!s.enabled || !notifGranted()) { await clearReminders(); stopFallback(); return; }

    if (triggersSupported) {
      stopFallback();
      const reg = await getReg();
      await clearReminders();
      const slots = buildSlots();
      const body = `Mais uma garrafa de ${state.settings.bottleMl} ml. Você consegue!`;
      for (const ts of slots) {
        try {
          await reg.showNotification(TITLE, {
            tag: `xopedras-rem-${ts}`,
            body,
            icon: "./xopedras-icon-192.png",
            badge: "./xopedras-icon-192.png",
            showTrigger: new TimestampTrigger(ts),
            data: { type: "reminder" },
            renotify: false,
            requireInteraction: false,
          });
        } catch {}
      }
    } else {
      startFallback();
    }
  }

  function withinWindow(d = new Date()) {
    const s = state.settings.reminder;
    const cur = d.getHours() * 60 + d.getMinutes();
    return cur >= hmToMin(s.start) && cur <= hmToMin(s.end);
  }

  function startFallback() {
    stopFallback();
    fallbackTimer = setInterval(async () => {
      const s = state.settings.reminder;
      if (!s.enabled || !notifGranted()) return stopFallback();
      if (document.visibilityState !== "visible" && !navigator.serviceWorker.controller) return;
      const now = Date.now();
      const due = now - (s.lastFired || 0) >= s.intervalMin * 60000;
      if (due && withinWindow()) {
        try {
          const reg = await getReg();
          await reg.showNotification(TITLE, {
            tag: `xopedras-rem-${now}`,
            body: `Mais uma garrafa de ${state.settings.bottleMl} ml.`,
            icon: "./xopedras-icon-192.png", badge: "./xopedras-icon-192.png", data: { type: "reminder" },
          });
          s.lastFired = now; save();
        } catch {}
      }
    }, 30000);
  }
  function stopFallback() { if (fallbackTimer) { clearInterval(fallbackTimer); fallbackTimer = null; } }

  async function toggleNotifications() {
    const s = state.settings.reminder;
    if (s.enabled && notifGranted()) {
      s.enabled = false; save();
      el.notifSwitch.setAttribute("aria-checked", "false");
      el.reminderConfig.hidden = true;
      await clearReminders(); stopFallback();
      return;
    }
    const ok = await ensurePermission();
    updateNotifHint();
    if (!ok) {
      el.notifSwitch.setAttribute("aria-checked", "false");
      el.reminderConfig.hidden = true;
      toast("Permissão de notificação não concedida.");
      return;
    }
    s.enabled = true; save();
    el.notifSwitch.setAttribute("aria-checked", "true");
    el.reminderConfig.hidden = false;
    updateBgNote();
    await scheduleReminders();
    toast("Lembretes ativados.");
  }

  async function sendTest() {
    const ok = await ensurePermission();
    updateNotifHint();
    if (!ok) { toast("Permissão de notificação não concedida."); return; }
    try {
      const reg = await getReg();
      await reg.showNotification("XôPedras 💧", {
        tag: "xopedras-test",
        body: "É assim que seus lembretes vão chegar. Bora beber!",
        icon: "./xopedras-icon-192.png", badge: "./xopedras-icon-192.png",
      });
    } catch { toast("Não consegui enviar o teste."); }
  }

  // ---------- eventos ----------
  el.logBtn.addEventListener("click", logBottle);
  el.undoBtn.addEventListener("click", undo);
  el.openSettings.addEventListener("click", openSheet);
  el.closeSettings.addEventListener("click", () => { commitSettings(); closeSheet(); });
  el.backdrop.addEventListener("click", () => { commitSettings(); closeSheet(); });
  el.notifSwitch.addEventListener("click", toggleNotifications);
  el.testNotif.addEventListener("click", sendTest);
  [el.goalInput, el.bottleInput, el.intervalInput, el.startInput, el.endInput]
    .forEach((node) => node.addEventListener("change", commitSettings));
  el.resetToday.addEventListener("click", () => {
    if (confirm("Zerar todas as garrafas de hoje?")) {
      state.days[dayKey()] = [];
      state.settings.reminder.lastFired = 0;
      save(); render();
      toast("Dia zerado.");
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      render();
      if (state.settings.reminder.enabled) scheduleReminders().catch(() => {});
    }
  });
  // vira o dia mesmo com app aberto
  setInterval(render, 60000);

  // ---------- instalação (PWA) ----------
  let deferredPrompt = null;
  const isStandalone = () =>
    window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

  function showInstallUI() {
    if (!deferredPrompt || isStandalone()) return;
    let dismissed = false;
    try { dismissed = localStorage.getItem("xopedras.installDismissed") === "1"; } catch {}
    if (!dismissed) el.installBar.hidden = false;
    el.installBtn2.hidden = false; // atalho permanente nos ajustes
  }
  function hideInstallUI() { el.installBar.hidden = true; el.installBtn2.hidden = true; }

  async function runInstall() {
    if (!deferredPrompt) return;
    el.installBar.hidden = true;
    deferredPrompt.prompt();
    try { await deferredPrompt.userChoice; } catch {}
    deferredPrompt = null;
    el.installBtn2.hidden = true;
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallUI();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    hideInstallUI();
    toast("XôPedras instalado 🎉");
  });
  el.installBtn.addEventListener("click", runInstall);
  el.installBtn2.addEventListener("click", runInstall);
  el.installDismiss.addEventListener("click", () => {
    el.installBar.hidden = true;
    try { localStorage.setItem("xopedras.installDismissed", "1"); } catch {}
  });

  // ---------- service worker ----------
  // Escopo isolado em "./xopedras" para NÃO interferir no seu index.html / outro projeto.
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./xopedras-sw.js", { scope: "./xopedras" }).then(() => {
        if (state.settings.reminder.enabled && notifGranted()) scheduleReminders().catch(() => {});
        else if (state.settings.reminder.enabled && !triggersSupported) startFallback();
      }).catch(() => {});
    });
  }

  // primeira pintura
  render();
})();
