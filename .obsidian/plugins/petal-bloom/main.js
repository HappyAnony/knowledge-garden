const { Plugin, MarkdownView, PluginSettingTab, Setting } = require("obsidian");

/** @typedef {"sakura"|"neon"|"gold"|"shape"} PresetName */
/** @typedef {"heart"|"swirl"} ShapePattern */

class PetalBloomPlugin extends Plugin {
  async onload() {
    this.settings = Object.assign({ preset: "sakura", shapePattern: "heart" }, await this.loadData());
    this.addCommand({
      id: "petal-bloom-run",
      name: "花瓣散开动画",
      callback: () => this.runBloom(),
    });

    this.addSettingTab(new PetalBloomSettingTab(this.app, this));
  }

  onunload() {
    document.querySelectorAll(".petal-bloom-overlay").forEach((el) => el.remove());
  }

  runBloom() {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) return;

    const container = view.containerEl;
    const contentRoot = container.querySelector(".markdown-reading-view .markdown-preview-view, .markdown-reading-view, .markdown-preview-view, .cm-editor");
    if (!contentRoot) return;

    const rect = contentRoot.getBoundingClientRect();

    const overlay = document.createElement("div");
    overlay.className = "petal-bloom-overlay";
    overlay.style.position = "fixed";
    overlay.style.left = `${rect.left}px`;
    overlay.style.top = `${rect.top}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = 9999;
    overlay.style.overflow = "hidden";

    document.body.appendChild(overlay);

    const previousVisibility = contentRoot.style.visibility;
    contentRoot.style.visibility = "hidden";

    const params = this.getPresetParams(this.settings);
    const maxChars = params.charCap;
    const pieces = this.collectCharPieces(contentRoot, rect, maxChars);
    const totalDuration = params.durationMs;

    pieces.forEach((p, idx) => {
      const box = document.createElement("div");
      box.className = "petal-bloom-char";
      box.style.left = `${p.left - rect.left}px`;
      box.style.top = `${p.top - rect.top}px`;
      box.style.width = `${p.width}px`;
      box.style.height = `${p.height}px`;

      const leftHalf = document.createElement("span");
      leftHalf.className = "petal-bloom-half left";
      leftHalf.textContent = p.ch;
      const hue = this.randomInRange(params.hueRange[0], params.hueRange[1]);
      const sat = this.randomInRange(params.satRange[0], params.satRange[1]);
      const lum = this.randomInRange(params.lumRange[0], params.lumRange[1]);
      const gradAngle = this.randomInRange(params.gradAngleRange[0], params.gradAngleRange[1]);
      leftHalf.style.setProperty("--h", `${Math.round(hue)}`);
      leftHalf.style.setProperty("--s", `${Math.round(sat)}%`);
      leftHalf.style.setProperty("--l", `${Math.round(lum)}%`);
      leftHalf.style.setProperty("--grad-angle", `${Math.round(gradAngle)}deg`);
      leftHalf.style.fontFamily = p.style.fontFamily;
      leftHalf.style.fontSize = p.style.fontSize;
      leftHalf.style.fontWeight = p.style.fontWeight;
      leftHalf.style.fontStyle = p.style.fontStyle;
      leftHalf.style.lineHeight = `${p.height}px`;

      const rightHalf = document.createElement("span");
      rightHalf.className = "petal-bloom-half right";
      rightHalf.textContent = p.ch;
      rightHalf.style.setProperty("--h", `${Math.round(hue)}`);
      rightHalf.style.setProperty("--s", `${Math.round(sat)}%`);
      rightHalf.style.setProperty("--l", `${Math.round(lum)}%`);
      rightHalf.style.setProperty("--grad-angle", `${Math.round(gradAngle)}deg`);
      rightHalf.style.fontFamily = p.style.fontFamily;
      rightHalf.style.fontSize = p.style.fontSize;
      rightHalf.style.fontWeight = p.style.fontWeight;
      rightHalf.style.fontStyle = p.style.fontStyle;
      rightHalf.style.lineHeight = `${p.height}px`;

      box.appendChild(leftHalf);
      box.appendChild(rightHalf);
      overlay.appendChild(box);

      const angle = Math.random() * Math.PI * 2;
      const base = Math.min(rect.width, rect.height);
      const radius = params.baseRadius + Math.random() * (base * params.radiusFactor);
      const dx = Math.cos(angle) * radius;
      const dy = Math.sin(angle) * radius;
      const split = this.randomInRange(params.splitRange[0], params.splitRange[1]);
      const delay = this.randomInRange(params.delayRange[0], params.delayRange[1]) + (idx % params.delayCadenceMod) * params.delayCadenceStep;

      const swayX = dx * (0.6 + Math.random()*0.4);
      const swayY = dy * (0.6 + Math.random()*0.4);
      const rzL = -this.randomInRange(params.rotateZRange[0], params.rotateZRange[1]);
      const rzR = this.randomInRange(params.rotateZRange[0], params.rotateZRange[1]);
      const rx = this.randomInRange(-params.rotateXRange, params.rotateXRange);
      const ry = this.randomInRange(-params.rotateYRange, params.rotateYRange);

      const charCenterX = (p.left - rect.left) + p.width/2;
      const charCenterY = (p.top - rect.top) + p.height/2;
      let finalDX = 0;
      let finalDY = 0;
      if (params.returnMode !== "original") {
        const target = this.getConvergeTarget(idx, pieces.length, rect, params);
        finalDX = target.x - charCenterX;
        finalDY = target.y - charCenterY;
      }

      leftHalf.animate(
        this.buildKeyframes({ split: -split, swayX, swayY, rz: rzL, rx, ry, finalDX, finalDY, returnMode: params.returnMode, depthZ: params.depthZ }),
        { duration: totalDuration, easing: params.easing, fill: "forwards", delay }
      );

      rightHalf.animate(
        this.buildKeyframes({ split: split, swayX, swayY, rz: rzR, rx, ry, finalDX, finalDY, returnMode: params.returnMode, depthZ: params.depthZ }),
        { duration: totalDuration, easing: params.easing, fill: "forwards", delay }
      );

      if (Math.random() < params.dustProbability) {
        const dust = document.createElement("div");
        dust.className = "petal-dust";
        const d = 2 + Math.random()*3;
        dust.style.setProperty("--d", `${d}px`);
        dust.style.left = `${p.left - rect.left + p.width/2}px`;
        dust.style.top = `${p.top - rect.top + p.height/2}px`;
        overlay.appendChild(dust);
        const ddx = dx * (0.5 + Math.random()*0.4);
        const ddy = dy * (0.5 + Math.random()*0.4);
        if (params.dustColor) dust.style.background = params.dustColor;
        dust.animate([
          { transform: `translate(0,0) scale(0.6)`, opacity: 0.9 },
          { transform: `translate(${ddx}px, ${ddy}px) scale(1.1)`, opacity: 0 },
        ], { duration: totalDuration * 0.7, easing: params.easing, fill: "forwards", delay });
      }
    });

    window.setTimeout(() => {
      overlay.remove();
      contentRoot.style.visibility = previousVisibility;
    }, totalDuration + 200);
  }

  collectCharPieces(root, containerRect, maxChars) {
    const pieces = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_SKIP;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const seg = Intl?.Segmenter ? new Intl.Segmenter("zh-Hans", { granularity: "grapheme" }) : null;

    while (pieces.length < maxChars) {
      const n = walker.nextNode();
      if (!n) break;
      const text = n.nodeValue || "";
      if (!text) continue;
      const parentEl = n.parentElement || root;
      const cs = getComputedStyle(parentEl);

      const segments = [];
      if (seg) {
        const it = seg.segment(text);
        for (const s of it) {
          const start = s.index;
          const ch = s.segment;
          segments.push({ start, end: start + ch.length, ch });
        }
      } else {
        let offset = 0;
        for (const ch of Array.from(text)) {
          const len = ch.length;
          segments.push({ start: offset, end: offset + len, ch });
          offset += len;
        }
      }

      for (const segm of segments) {
        if (pieces.length >= maxChars) break;
        const r = document.createRange();
        r.setStart(n, segm.start);
        r.setEnd(n, segm.end);
        const rects = r.getClientRects();
        if (!rects || rects.length === 0) continue;
        const rc = rects[0];
        if (!rc || rc.width < 1 || rc.height < 1) continue;
        if (rc.bottom < containerRect.top || rc.top > containerRect.bottom || rc.right < containerRect.left || rc.left > containerRect.right) continue;

        pieces.push({
          ch: segm.ch,
          left: rc.left,
          top: rc.top,
          width: rc.width,
          height: rc.height,
          style: {
            color: cs.color,
            fontFamily: cs.fontFamily,
            fontSize: cs.fontSize,
            fontWeight: cs.fontWeight,
            fontStyle: cs.fontStyle,
          },
        });
        r.detach();
      }
    }
    return pieces;
  }

  extractVisibleText(root) {
    const preview = root.querySelector(".markdown-preview-view");
    if (preview) return preview.innerText || "";
    const cm = root.closest(".cm-editor");
    if (cm) {
      const cmContent = cm.querySelector(".cm-content");
      if (cmContent) return cmContent.innerText || "";
    }
    return root.innerText || "";
  }

  randomInRange(min, max) { return min + Math.random() * (max - min); }

  getPresetParams(settings) {
    if (settings.preset === "sakura") {
      return { label: "樱花梦幻", hueRange: [328, 350], satRange: [70, 90], lumRange: [68, 86], gradAngleRange: [40, 100], durationMs: 2400, charCap: 2200, baseRadius: 50, radiusFactor: 0.25, rotateZRange: [10, 28], rotateXRange: 12, rotateYRange: 28, splitRange: [6, 12], delayRange: [0, 140], delayCadenceMod: 16, delayCadenceStep: 8, dustProbability: 0.35, dustColor: "radial-gradient(circle at 30% 30%, hsla(335, 85%, 78%, 0.9), hsla(335, 85%, 60%, 0.2) 60%, transparent 70%)", returnMode: "original", easing: "cubic-bezier(0.22, 1, 0.36, 1)", depthZ: 30 };
    }
    if (settings.preset === "neon") {
      return { label: "霓虹赛博", hueRange: [180, 320], satRange: [90, 100], lumRange: [50, 65], gradAngleRange: [0, 180], durationMs: 1800, charCap: 2000, baseRadius: 70, radiusFactor: 0.35, rotateZRange: [20, 40], rotateXRange: 22, rotateYRange: 40, splitRange: [8, 16], delayRange: [20, 160], delayCadenceMod: 14, delayCadenceStep: 10, dustProbability: 0.3, dustColor: "radial-gradient(circle at 30% 30%, hsla(200, 100%, 60%, 0.9), hsla(280, 100%, 60%, 0.2) 60%, transparent 70%)", returnMode: "original", easing: "cubic-bezier(0.16, 1, 0.3, 1)", depthZ: 40 };
    }
    if (settings.preset === "gold") {
      return { label: "金色典雅", hueRange: [42, 55], satRange: [75, 90], lumRange: [55, 72], gradAngleRange: [20, 60], durationMs: 1700, charCap: 1800, baseRadius: 40, radiusFactor: 0.22, rotateZRange: [6, 14], rotateXRange: 8, rotateYRange: 18, splitRange: [4, 10], delayRange: [0, 120], delayCadenceMod: 18, delayCadenceStep: 6, dustProbability: 0.18, dustColor: "radial-gradient(circle at 30% 30%, hsla(45, 95%, 62%, 0.9), hsla(45, 95%, 45%, 0.2) 60%, transparent 70%)", returnMode: "original", easing: "cubic-bezier(0.25, 1, 0.5, 1)", depthZ: 24 };
    }
    return { label: "收束形状", hueRange: [320, 340], satRange: [70, 95], lumRange: [60, 80], gradAngleRange: [30, 90], durationMs: 2200, charCap: 2000, baseRadius: 60, radiusFactor: 0.28, rotateZRange: [10, 26], rotateXRange: 14, rotateYRange: 30, splitRange: [6, 12], delayRange: [0, 150], delayCadenceMod: 16, delayCadenceStep: 8, dustProbability: 0.28, dustColor: undefined, returnMode: "convergeShape", easing: "cubic-bezier(0.22, 1, 0.36, 1)", shapePattern: settings.shapePattern, shapeScale: 0.42, depthZ: 30 };
  }

  buildKeyframes(opts) {
    const { split, swayX, swayY, rz, rx, ry, finalDX, finalDY, returnMode, depthZ } = opts;
    const mid = { transform: `translate3d(${swayX}px, ${swayY}px, ${depthZ}px) rotate(${rz}deg) rotateX(${rx}deg) rotateY(${ry}deg)`, opacity: 0.6, offset: 0.55 };
    const start = { transform: `translate3d(0px, 0px, 0px) rotate(0deg) rotateX(0deg) rotateY(0deg)`, opacity: 1, offset: 0 };
    const splitKf = { transform: `translate3d(${split}px, ${split > 0 ? 1 : -1}px, 0px) rotate(${split > 0 ? 8 : -8}deg) rotateX(${rx/2}deg) rotateY(${ry/2}deg)`, opacity: 1, offset: 0.15 };
    if (returnMode === "original") {
      const end = { transform: `translate3d(0px, 0px, 0px) rotate(0deg) rotateX(0deg) rotateY(0deg)`, opacity: 1, offset: 1 };
      return [start, splitKf, mid, end];
    }
    const end = { transform: `translate3d(${finalDX}px, ${finalDY}px, 0px) rotate(0deg) rotateX(0deg) rotateY(0deg)`, opacity: 0.85, offset: 1 };
    return [start, splitKf, mid, end];
  }

  getConvergeTarget(idx, total, rect, params) {
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    if (params.returnMode === "convergeCenter") {
      return { x: cx, y: cy };
    }
    const t = (idx / total) * Math.PI * 2;
    if (params.shapePattern === "heart") {
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      const scale = Math.min(rect.width, rect.height) * params.shapeScale * 0.03;
      return { x: cx + x * scale, y: cy - y * scale };
    } else {
      const turns = 1.5;
      const angle = t * turns;
      const maxR = Math.min(rect.width, rect.height) * params.shapeScale;
      const r = maxR * (1 - idx / total);
      return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
    }
  }
}

class PetalBloomSettingTab extends PluginSettingTab {
  constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }
  display() {
    const { containerEl } = this; containerEl.empty();
    new Setting(containerEl)
      .setName("风格预设")
      .setDesc("一键切换动画风格")
      .addDropdown((dd) => dd
        .addOption("sakura", "樱花梦幻")
        .addOption("neon", "霓虹赛博")
        .addOption("gold", "金色典雅")
        .addOption("shape", "收束形状")
        .setValue(this.plugin.settings.preset)
        .onChange(async (v) => { this.plugin.settings.preset = v; await this.plugin.saveData(this.plugin.settings); this.display(); })
      );

    const shapeSetting = new Setting(containerEl)
      .setName("收束形状类型")
      .setDesc("选择心形或漩涡")
      .addDropdown((dd) => dd
        .addOption("heart", "心形")
        .addOption("swirl", "漩涡")
        .setValue(this.plugin.settings.shapePattern)
        .onChange(async (v) => { this.plugin.settings.shapePattern = v; await this.plugin.saveData(this.plugin.settings); })
      );
    shapeSetting.settingEl.toggle(this.plugin.settings.preset === "shape");
  }
}

module.exports = PetalBloomPlugin;
exports.default = PetalBloomPlugin;


