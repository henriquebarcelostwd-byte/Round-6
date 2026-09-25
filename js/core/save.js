/* ROUND 6 — save.js : settings, meta progression (shop/gallery/endings) and campaign checkpoints in localStorage */
'use strict';
(function () {
  const KEY_SAVE = 'r6_save_v1', KEY_META = 'r6_meta_v1', KEY_SET = 'r6_settings_v1';
  function read(k) { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function del(k) { try { localStorage.removeItem(k); } catch (e) { } }

  const defaultsSettings = { master: 0.8, music: 0.55, sfx: 0.8, difficulty: 'normal', textSpeed: 1, shake: true, hints: true, fullscreen: false, subtitles: true };
  const defaultsMeta = {
    chips: 0, totalEarned: 0,
    owned: { outfit_default: true, title_none: true, ui_default: true, fx_default: true, emote_wave: true, track_menu: true, anim_default: true },
    equipped: { outfit: 'outfit_default', title: 'title_none', ui: 'ui_default', fx: 'fx_default', track: 'track_menu', anim: 'anim_default', number: null },
    endings: {}, gallery: {}, scenes: {}, seasonsUnlocked: 1, gamesUnlocked: { ddakji: true },
    best: {}, stats: { eliminatedSeen: 0, gamesWon: 0, deaths: 0, playTime: 0 },
  };

  const Save = {
    settings: Object.assign({}, defaultsSettings, read(KEY_SET) || {}),
    meta: null,
    saveSettings() { write(KEY_SET, Save.settings); R6.Audio && R6.Audio.setVolumes({ master: Save.settings.master, music: Save.settings.music, sfx: Save.settings.sfx }); },
    loadMeta() {
      const m = read(KEY_META) || {};
      const d = JSON.parse(JSON.stringify(defaultsMeta));
      Save.meta = Object.assign(d, m);
      Save.meta.owned = Object.assign(d.owned, m.owned || {});
      Save.meta.equipped = Object.assign(JSON.parse(JSON.stringify(defaultsMeta.equipped)), m.equipped || {});
      Save.meta.stats = Object.assign(JSON.parse(JSON.stringify(defaultsMeta.stats)), m.stats || {});
      Save.meta.gamesUnlocked = Object.assign({ ddakji: true }, m.gamesUnlocked || {});
      return Save.meta;
    },
    saveMeta() { write(KEY_META, Save.meta); },
    hasCampaign() { const s = read(KEY_SAVE); return !!(s && s.state); },
    readCampaign() { return read(KEY_SAVE); },
    writeCampaign(data) { data.savedAt = Date.now(); return write(KEY_SAVE, data); },
    clearCampaign() { del(KEY_SAVE); },
    resetAll() { del(KEY_SAVE); del(KEY_META); Save.loadMeta(); },
    unlockGame(id) { if (!Save.meta.gamesUnlocked[id]) { Save.meta.gamesUnlocked[id] = true; Save.saveMeta(); } },
    unlockScene(id, title) { if (!Save.meta.scenes[id]) { Save.meta.scenes[id] = title || id; Save.saveMeta(); } },
    unlockGallery(id) { if (!Save.meta.gallery[id]) { Save.meta.gallery[id] = true; Save.saveMeta(); } },
    unlockEnding(id) { Save.meta.endings[id] = (Save.meta.endings[id] || 0) + 1; Save.saveMeta(); },
    addChips(n) { n = Math.max(0, Math.floor(n)); Save.meta.chips += n; Save.meta.totalEarned += n; Save.saveMeta(); return n; },
    best(id, score, higherBetter = true) {
      const b = Save.meta.best[id];
      if (b == null || (higherBetter ? score > b : score < b)) { Save.meta.best[id] = score; Save.saveMeta(); return true; }
      return false;
    },
    diff() { return Save.settings.difficulty || 'normal'; },
    // difficulty multiplier helper: pick(normal, hard, extreme)
    D(n, h, x) { const d = Save.diff(); return d === 'extreme' ? x : d === 'hard' ? h : n; },
  };
  Save.loadMeta();
  R6.Save = Save;
})();
