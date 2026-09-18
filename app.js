(() => {
  "use strict";
  const lib = window.CHARACTER_LIBRARY;
  const chars = lib.characters;
  const $ = (id) => document.getElementById(id);
  const els = {
    charId: $("charId"), positionText: $("positionText"), charInfoBtn: $("charInfoBtn"),
    fullscreenBtn: $("fullscreenBtn"), menuBtn: $("menuBtn"), cropStage: $("cropStage"), sourceImage: $("sourceImage"),
    imageFallback: $("imageFallback"), gridOverlay: $("gridOverlay"), reinforceBtn: $("reinforceBtn"),
    prevBtn: $("prevBtn"), doneBtn: $("doneBtn"), nextBtn: $("nextBtn"), charDialog: $("charDialog"),
    dialogTitle: $("dialogTitle"), detailChar: $("detailChar"), detailSource: $("detailSource"), detailCount: $("detailCount"),
    detailLast: $("detailLast"), noteInput: $("noteInput"), saveNoteBtn: $("saveNoteBtn"), sourceNote: $("sourceNote"),
    menuDialog: $("menuDialog"), menuCloseBtn: $("menuCloseBtn"), jumpInput: $("jumpInput"), jumpBtn: $("jumpBtn"), jumpMessage: $("jumpMessage"),
    gridToggle: $("gridToggle"), invertToggle: $("invertToggle"), wakeToggle: $("wakeToggle"),
    historyList: $("historyList"), practiceTotal: $("practiceTotal"), exportBtn: $("exportBtn"), importInput: $("importInput"), backupMessage: $("backupMessage"), toast: $("toast")
  };

  const state = { index: 0, grid: false, invert: false, wake: false, wakeLock: null, lastDoneTap: 0 };
  let toastTimer;
  let resizeTimer;
  let touchStartX = null;
  let touchStartY = null;

  function current() { return chars[state.index]; }
  function sourceFor(ch) { return lib.sourceImages[ch.source]; }
  function formatDate(iso) {
    if (!iso) return "尚未練習";
    try { return new Intl.DateTimeFormat("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso)); }
    catch { return iso; }
  }
  function showToast(text) {
    clearTimeout(toastTimer); els.toast.textContent = text; els.toast.classList.add("show");
    toastTimer = setTimeout(() => els.toast.classList.remove("show"), 1700);
  }

  async function persistPosition() { await YanDB.setSetting("lastCharId", current().id); }

  function fitCrop() {
    const ch = current(); const source = sourceFor(ch); const crop = ch.crop;
    const stageW = els.cropStage.clientWidth; const stageH = els.cropStage.clientHeight;
    if (!stageW || !stageH) return;
    const scale = Math.min(stageW / crop.w, stageH / crop.h);
    const renderedW = source.width * scale; const renderedH = source.height * scale;
    const cropW = crop.w * scale; const cropH = crop.h * scale;
    const left = -crop.x * scale + (stageW - cropW) / 2;
    const top = -crop.y * scale + (stageH - cropH) / 2;
    Object.assign(els.sourceImage.style, {
      width: `${renderedW}px`, height: `${renderedH}px`, left: `${left}px`, top: `${top}px`
    });
  }

  async function render({ persist = true } = {}) {
    const ch = current(); const source = sourceFor(ch);
    els.charId.textContent = ch.id;
    els.positionText.textContent = `${state.index + 1} / ${chars.length}`;
    els.sourceImage.classList.toggle("invert", state.invert);
    els.gridOverlay.classList.toggle("hidden", !state.grid);
    els.sourceImage.dataset.sourceKey = ch.source;
    if (els.sourceImage.src !== source.url) els.sourceImage.src = source.url;
    requestAnimationFrame(fitCrop);
    const charState = await YanDB.getCharState(ch.id);
    els.reinforceBtn.setAttribute("aria-pressed", String(Boolean(charState.reinforce)));
    els.reinforceBtn.textContent = charState.reinforce ? "★ 待加強" : "☆ 待加強";
    if (persist) await persistPosition();
  }

  async function go(delta) {
    state.index = (state.index + delta + chars.length) % chars.length;
    await render();
  }

  async function markDone() {
    const now = Date.now();
    if (now - state.lastDoneTap < 900) return;
    state.lastDoneTap = now;
    await YanDB.addPractice(current().id);
    showToast(`${current().id} 已記錄本次練習`);
  }

  async function toggleReinforce() {
    const ch = current(); const existing = await YanDB.getCharState(ch.id);
    const next = await YanDB.setCharState(ch.id, { reinforce: !existing.reinforce });
    els.reinforceBtn.setAttribute("aria-pressed", String(next.reinforce));
    els.reinforceBtn.textContent = next.reinforce ? "★ 待加強" : "☆ 待加強";
    showToast(next.reinforce ? "已加入待加強" : "已移除待加強");
  }

  async function openCharDialog() {
    const ch = current(); const source = sourceFor(ch);
    const [records, charState] = await Promise.all([YanDB.getPracticeForChar(ch.id), YanDB.getCharState(ch.id)]);
    els.dialogTitle.textContent = ch.id;
    els.detailChar.textContent = ch.char || "—";
    els.detailSource.textContent = "顏勤禮碑";
    els.detailCount.textContent = `${records.length} 次`;
    els.detailLast.textContent = records.length ? formatDate(records[0].createdAt) : "尚未練習";
    els.noteInput.value = charState.note || "";
    els.sourceNote.textContent = `來源：${source.note}｜授權：${source.license}`;
    els.charDialog.showModal();
  }

  async function saveNote() {
    await YanDB.setCharState(current().id, { note: els.noteInput.value.trim() });
    showToast("備註已儲存");
  }

  async function openMenu() {
    els.gridToggle.checked = state.grid;
    els.invertToggle.checked = state.invert;
    els.wakeToggle.checked = state.wake;
    els.jumpMessage.textContent = "";
    await renderHistory();
    els.menuDialog.showModal();
  }

  async function renderHistory() {
    const rows = await YanDB.listPractice(20);
    const allRows = await YanDB.listPractice(100000);
    els.practiceTotal.textContent = `${allRows.length} 次`;
    if (!rows.length) {
      els.historyList.innerHTML = '<div class="empty-state">還沒有練習紀錄。</div>';
      return;
    }
    els.historyList.innerHTML = rows.map(row => {
      const ch = chars.find(c => c.id === row.charId);
      return `<div class="history-item"><span class="history-id">${escapeHtml(row.charId)}</span><span class="history-char">${escapeHtml(ch?.char || "")}</span><span class="history-time">${escapeHtml(formatDate(row.createdAt))}</span></div>`;
    }).join("");
  }

  function escapeHtml(v) { return String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

  async function jumpTo() {
    const q = els.jumpInput.value.trim().toUpperCase();
    if (!q) { els.jumpMessage.textContent = "請輸入固定編號或單字。"; return; }
    let idx = chars.findIndex(c => c.id.toUpperCase() === q);
    if (idx < 0) idx = chars.findIndex(c => c.char === els.jumpInput.value.trim());
    if (idx < 0) { els.jumpMessage.textContent = "目前字庫找不到這個編號或單字。"; return; }
    state.index = idx; await render(); els.menuDialog.close();
  }

  async function updateSetting(key, value) { state[key] = value; await YanDB.setSetting(key, value); await render({ persist: false }); }

  async function requestWakeLock() {
    if (!("wakeLock" in navigator)) { state.wake = false; els.wakeToggle.checked = false; showToast("這台瀏覽器不支援螢幕常亮"); return false; }
    try {
      state.wakeLock = await navigator.wakeLock.request("screen");
      state.wakeLock.addEventListener("release", () => { state.wakeLock = null; });
      return true;
    } catch (err) { showToast("無法啟用螢幕常亮"); return false; }
  }

  async function setWake(enabled) {
    if (enabled) {
      const ok = await requestWakeLock();
      state.wake = ok;
    } else {
      if (state.wakeLock) await state.wakeLock.release().catch(() => {});
      state.wakeLock = null; state.wake = false;
    }
    els.wakeToggle.checked = state.wake;
    await YanDB.setSetting("wake", state.wake);
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen();
    } catch { showToast("此環境無法切換全螢幕"); }
  }

  async function exportBackup() {
    const data = await YanDB.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `yan-practice-backup-${stamp}.json`;
    const file = new File([blob], filename, { type: "application/json" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ title: "顏真卿原帖習字備份", files: [file] }); els.backupMessage.textContent = "已開啟手機分享／儲存介面。"; return; }
      catch (err) { if (err.name === "AbortError") return; }
    }
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    els.backupMessage.textContent = "備份檔已輸出。";
  }

  async function importBackup(file) {
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      await YanDB.importAll(payload);
      els.backupMessage.textContent = "備份已還原。";
      await loadSettings(); await render({ persist: false }); await renderHistory();
      showToast("備份還原完成");
    } catch (err) { els.backupMessage.textContent = `匯入失敗：${err.message || "格式錯誤"}`; }
    finally { els.importInput.value = ""; }
  }

  async function loadSettings() {
    const [lastId, grid, invert, wake] = await Promise.all([
      YanDB.getSetting("lastCharId", chars[0]?.id), YanDB.getSetting("grid", false), YanDB.getSetting("invert", false), YanDB.getSetting("wake", false)
    ]);
    const found = chars.findIndex(c => c.id === lastId); state.index = found >= 0 ? found : 0;
    state.grid = Boolean(grid); state.invert = Boolean(invert); state.wake = Boolean(wake);
    if (state.wake && document.visibilityState === "visible") await requestWakeLock();
  }

  function bindEvents() {
    els.prevBtn.addEventListener("click", () => go(-1));
    els.nextBtn.addEventListener("click", () => go(1));
    els.doneBtn.addEventListener("click", markDone);
    els.reinforceBtn.addEventListener("click", toggleReinforce);
    els.charInfoBtn.addEventListener("click", openCharDialog);
    els.saveNoteBtn.addEventListener("click", saveNote);
    els.menuBtn.addEventListener("click", openMenu);
    els.menuCloseBtn.addEventListener("click", () => els.menuDialog.close());
    els.fullscreenBtn.addEventListener("click", toggleFullscreen);
    els.jumpBtn.addEventListener("click", jumpTo);
    els.jumpInput.addEventListener("keydown", e => { if (e.key === "Enter") jumpTo(); });
    els.gridToggle.addEventListener("change", e => updateSetting("grid", e.target.checked));
    els.invertToggle.addEventListener("change", e => updateSetting("invert", e.target.checked));
    els.wakeToggle.addEventListener("change", e => setWake(e.target.checked));
    els.exportBtn.addEventListener("click", exportBackup);
    els.importInput.addEventListener("change", e => importBackup(e.target.files?.[0]));
    els.sourceImage.addEventListener("load", () => { els.imageFallback.classList.add("hidden"); fitCrop(); });
    els.sourceImage.addEventListener("error", () => els.imageFallback.classList.remove("hidden"));
    window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(fitCrop, 80); });
    document.addEventListener("visibilitychange", async () => { if (document.visibilityState === "visible" && state.wake && !state.wakeLock) await requestWakeLock(); });
    document.addEventListener("keydown", e => { if (e.key === "ArrowLeft") go(-1); if (e.key === "ArrowRight") go(1); });
    els.cropStage.addEventListener("touchstart", e => { const t = e.changedTouches[0]; touchStartX = t.clientX; touchStartY = t.clientY; }, { passive: true });
    els.cropStage.addEventListener("touchend", e => {
      if (touchStartX == null) return;
      const t = e.changedTouches[0]; const dx = t.clientX - touchStartX; const dy = t.clientY - touchStartY;
      touchStartX = touchStartY = null;
      if (Math.abs(dx) > 64 && Math.abs(dx) > Math.abs(dy) * 1.35) go(dx > 0 ? -1 : 1);
    }, { passive: true });
  }

  async function registerServiceWorker() {
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      try { await navigator.serviceWorker.register("./sw.js"); }
      catch (err) { console.warn("Service worker registration failed", err); }
    }
  }

  async function init() {
    if (!chars.length) return;
    bindEvents(); await loadSettings(); await render({ persist: false }); await registerServiceWorker();
  }

  init().catch(err => { console.error(err); showToast("初始化失敗，請重新開啟"); });
})();
