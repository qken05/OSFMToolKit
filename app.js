// app.js (FULL) — slider zoom + ctrl zoom, NO drag-to-pan, preview has its own scrollbar
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// -------------------------
// LocalStorage sanity check
// -------------------------
const STORAGE_KEY_TEXT = "apbgen:text:v1";

function storageWorks(){
  try{
    const k = "__apb_test__";
    sessionStorage.setItem(k, "1");
    sessionStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

const CAN_SAVE = storageWorks();
if (!CAN_SAVE) {
  console.warn("sessionStorage is blocked (private mode / browser settings / embedded context). Autosave disabled.");
}

function saveTextLocal(){
  if (!CAN_SAVE) return;

  const data = {
    headerText: els.headerText?.value ?? "",
    name: els.name?.value ?? "",
    description: els.description?.value ?? "",
    clothing: els.clothing?.value ?? "",
    notes: els.notes?.value ?? "",
    dateTime: els.dateTime?.value ?? "",
    location: els.location?.value ?? "",
    reportNo: els.reportNo?.value ?? "",
    summary: els.summary?.value ?? "",
    contactLine: els.contactLine?.value ?? "",
    preparedBy: els.preparedBy?.value ?? "",
    footerDate: els.footerDate?.value ?? "",
    footerReport: els.footerReport?.value ?? "",
  };

  try{
    sessionStorage.setItem(STORAGE_KEY_TEXT, JSON.stringify(data));
    // quick debug proof:
    // console.log("Saved", data);
  } catch (e){
    console.warn("Save failed:", e);
  }
}

function loadTextLocal(){
  if (!CAN_SAVE) return;

  let data = null;
  try{
    data = JSON.parse(sessionStorage.getItem(STORAGE_KEY_TEXT) || "null");
  } catch (e){
    console.warn("Load parse failed:", e);
    return;
  }
  if (!data) return;

  // Apply values
  if (els.headerText) els.headerText.value = data.headerText ?? "";
  if (els.name) els.name.value = data.name ?? "";
  if (els.description) els.description.value = data.description ?? "";
  if (els.clothing) els.clothing.value = data.clothing ?? "";
  if (els.notes) els.notes.value = data.notes ?? "";
  if (els.dateTime) els.dateTime.value = data.dateTime ?? "";
  if (els.location) els.location.value = data.location ?? "";
  if (els.reportNo) els.reportNo.value = data.reportNo ?? "";
  if (els.summary) els.summary.value = data.summary ?? "";
  if (els.contactLine) els.contactLine.value = data.contactLine ?? "";
  if (els.preparedBy) els.preparedBy.value = data.preparedBy ?? "";
  if (els.footerDate) els.footerDate.value = data.footerDate ?? "";
  if (els.footerReport) els.footerReport.value = data.footerReport ?? "";
}


const els = {
  mugshot: document.getElementById('mugshot'),
  mugshotUrl: document.getElementById('mugshotUrl'),
  btnLoadMugshotUrl: document.getElementById('btnLoadMugshotUrl'),

  headerText: document.getElementById('headerText'),
  name: document.getElementById('name'),

  description: document.getElementById('description'),
  clothing: document.getElementById('clothing'),
  notes: document.getElementById('notes'),

  countDescription: document.getElementById('countDescription'),
  countClothing: document.getElementById('countClothing'),
  countNotes: document.getElementById('countNotes'),

  dateTime: document.getElementById('dateTime'),
  location: document.getElementById('location'),
  reportNo: document.getElementById('reportNo'),

  summary: document.getElementById('summary'),
  contactLine: document.getElementById('contactLine'),

  preparedBy: document.getElementById('preparedBy'),
  footerDate: document.getElementById('footerDate'),
  footerReport: document.getElementById('footerReport'),

  btnDownload: document.getElementById('btnDownload'),

  // Viewer
  canvasWrap: document.getElementById('canvasWrap'),
  zoom: document.getElementById('zoom'),
  zoomLabel: document.getElementById('zoomLabel'),
};

const MAX_PAGES = 1;

// Template
const templateImg = new Image();
templateImg.src = './template.png';

let mugshotImg = null;

// Layout coordinates (keep these as your template coords)
const layout = {
  canvas: { w: 1187, h: 1593 },

  mugshot: { x: 48, y: 348, w: 383, h: 472 },

  header: { x: 103, y: 265, w: 980, h: 52, font: 'bold 40px Times New Roman', color: '#000', align: 'center', valign: 'center' },
  name:   { x: 450, y: 386, w: 670, h: 60, font: 'bold 34px Arial',           color: '#000', align: 'center', valign: 'center' },

  description: { x: 450, y: 455, w: 670, h: 112,  font: 'bold 22px Arial', color: '#000', align: 'left', valign: 'top', prefix: 'Description: ', stable: true, minFontPx: 18 },
  clothing:    { x: 450, y: 0,   w: 670, h: 112,  font: 'bold 22px Arial', color: '#000', align: 'left', valign: 'top', prefix: 'Clothing: ',    stable: true, minFontPx: 18 },
  notes:       { x: 450, y: 0,   w: 670, h: 136, font: 'bold 22px Arial', color: '#000', align: 'left', valign: 'top', prefix: 'Notes: ',       stable: true, minFontPx: 18 },

  stackBottomLimitY: 930,

  tableDate:   { x: 85, y: 970, w: 235, h: 26, font: '22px Arial', color: '#000', align: 'center', valign: 'center' },
  tableLoc:    { x: 373, y: 970, w: 457, h: 26, font: '22px Arial', color: '#000', align: 'center', valign: 'center' },
  tableReport: { x: 930, y: 970, w: 120, h: 26, font: '22px Arial', color: '#000', align: 'center', valign: 'center' },

  summary: { x: 120, y: 1050, w: 950, h: 240, font: '22px Arial', color: '#000', align: 'left', valign: 'top', stable: true, minFontPx: 22, lineCut:2 },
  contact: { x: 105, y: 1300, w: 980, h: 46,  font: '20px Arial', color: '#000', align: 'center', valign: 'top', stable: false },

  footerPrepared: { x: 45, y: 1480, w: 360, h: 20, font: 'bold 20px Arial', color: '#000', align: 'center', valign: 'center', prefix: 'PREPARED BY: ' },
  footerDate:     { x: 420, y: 1480, w: 360, h: 20, font: 'bold 20px Arial', color: '#000', align: 'center', valign: 'center', prefix: 'DATE: ' },
  footerReport:   { x: 790, y: 1480, w: 360, h: 20, font: 'bold 20px Arial', color: '#000', align: 'center', valign: 'center', prefix: 'REPORT #: ' },
};

function parsePx(font){ const m = font.match(/(\d+)px/); return m ? parseInt(m[1], 10) : 16; }
function setFontPx(font, px){ return font.replace(/\d+px/, `${px}px`); }
function lineHeightForFont(font){ return Math.round(parsePx(font) * 1.2); }

function drawImageCover(img, x, y, w, h){
  const iw = img.width, ih = img.height;
  const scale = Math.max(w / iw, h / ih);
  const sw = w / scale, sh = h / scale;
  const sx = (iw - sw) / 2;
  const sy = (ih - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// Fix long unbroken strings
function breakLongToken(token, font, maxWidth){
  ctx.font = font;
  const parts = [];
  let chunk = '';
  for (const ch of token){
    const test = chunk + ch;
    if (ctx.measureText(test).width <= maxWidth || !chunk) chunk = test;
    else { parts.push(chunk); chunk = ch; }
  }
  if (chunk) parts.push(chunk);
  return parts;
}

function drawTextCappedInBox({ text, x, y, w, h, font, color, align, prefix='' }){
  const full = (prefix || '') + (text || '');
  const lines = wrapLines(full, font, w);
  const lh = lineHeightForFont(font);
  const maxLines = Math.max(1, Math.floor(h / lh));
  const slice = lines.slice(0, maxLines);
  drawLinesInBox({ lines: slice, x, y, w, h, font, color, align });
}




function wrapLines(text, font, maxWidth){
  ctx.font = font;
  const raw = (text ?? '').toString().replace(/\r/g, '');
  const paragraphs = raw.split('\n');
  const lines = [];

  for (const p of paragraphs){
    if (p.trim() === '') { lines.push(''); continue; }
    const tokens = p.replace(/[ \t]+/g, ' ').trim().split(' ');
    let line = '';

    for (const token of tokens){
      if (ctx.measureText(token).width > maxWidth){
        if (line) { lines.push(line); line = ''; }
        const parts = breakLongToken(token, font, maxWidth);
        for (let i = 0; i < parts.length - 1; i++) lines.push(parts[i]);
        line = parts[parts.length - 1];
        continue;
      }

      const test = line ? `${line} ${token}` : token;
      if (ctx.measureText(test).width <= maxWidth || !line) line = test;
      else { lines.push(line); line = token; }
    }

    if (line) lines.push(line);
  }

  return lines;
}

function fitAndDrawTextBox({ text, x, y, w, h, font, color, align, prefix='', valign='center', stable=false, minFontPx=12 }){
  const fullText = (prefix || '') + (text || '');
  const baseSize = parsePx(font);

  let chosenFont = font;
  let chosenLines = [];

  if (!stable){
    for (let s = baseSize; s >= 12; s--){
      const f = setFontPx(font, s);
      const lines = wrapLines(fullText, f, w);
      const lh = Math.round(s * 1.2);
      if (lines.length * lh <= h){ chosenFont = f; chosenLines = lines; break; }
    }
    if (!chosenLines.length){
      chosenFont = setFontPx(font, 12);
      chosenLines = wrapLines(fullText, chosenFont, w);
    }
  } else {
    const s = Math.max(minFontPx, baseSize);
    chosenFont = setFontPx(font, s);
    chosenLines = wrapLines(fullText, chosenFont, w);
  }

  ctx.font = chosenFont;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';

  const s = parsePx(chosenFont);
  const lh = Math.round(s * 1.2);
  const totalH = chosenLines.length * lh;

  let drawY = y;
  if (valign === 'center') drawY = y + Math.max(0, (h - totalH) / 2);
  if (valign === 'bottom') drawY = y + Math.max(0, (h - totalH));

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  for (const line of chosenLines){
    const drawX = align === 'left' ? x : align === 'right' ? (x + w) : (x + w/2);
    ctx.fillText(line, drawX, drawY);
    drawY += lh;
  }
  ctx.restore();
}

function drawLinesInBox({ lines, x, y, w, h, font, color, align }){
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  const lh = lineHeightForFont(font);

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  let yy = y;
  for (const line of lines){
    const xx = align === 'left' ? x : align === 'right' ? (x + w) : (x + w/2);
    ctx.fillText(line, xx, yy);
    yy += lh;
  }
  ctx.restore();
}

function isReallyEmpty(str){ return !str || str.replace(/\s/g, '') === ''; }
function valOrPlaceholder(el){ const v = (el?.value || ''); return v.length ? v : (el?.placeholder || ''); }

function getValues(){
  return {
    headerText: valOrPlaceholder(els.headerText),
    name: valOrPlaceholder(els.name),

    description: valOrPlaceholder(els.description),
    clothing: valOrPlaceholder(els.clothing),
    notes: valOrPlaceholder(els.notes),

    dateTime: valOrPlaceholder(els.dateTime),
    location: valOrPlaceholder(els.location),
    reportNo: valOrPlaceholder(els.reportNo),

    summary: valOrPlaceholder(els.summary),
    contactLine: valOrPlaceholder(els.contactLine),

    preparedBy: valOrPlaceholder(els.preparedBy),
    footerDate: valOrPlaceholder(els.footerDate),
    footerReport: valOrPlaceholder(els.footerReport),
  };
}

function drawBasePage(offsetY){
  ctx.drawImage(templateImg, 0, offsetY);
  if (mugshotImg){
    const b = layout.mugshot;
    drawImageCover(mugshotImg, b.x, b.y + offsetY, b.w, b.h);
  }
}

function paginateStackedBlocks(v){
  const blocks = [
    { key: 'description', box: layout.description, text: v.description, spacingAfter: 18 },
    { key: 'clothing',    box: layout.clothing,    text: v.clothing,    spacingAfter: 24 },
    { key: 'notes',       box: layout.notes,       text: v.notes,       spacingAfter: 0  },
  ];

  const prepared = blocks.map(b => {
    if (isReallyEmpty(b.text)) return { ...b, lines: [], empty: true };
    const px = Math.max(b.box.minFontPx ?? 12, parsePx(b.box.font));
    const stableFont = setFontPx(b.box.font, px);
    const full = (b.box.prefix || '') + (b.text || '');
    return { ...b, empty: false, stableFont, lines: wrapLines(full, stableFont, b.box.w) };
  });

  const ptr = Object.fromEntries(prepared.map(p => [p.key, 0]));
  const pages = [];
  const done = () => prepared.every(p => p.empty || ptr[p.key] >= p.lines.length);

  while (!done()){
    const page = { draws: [] };
    let y = layout.description.y;

    for (const b of prepared){
      if (b.empty) continue;
      if (ptr[b.key] >= b.lines.length) continue;
      if (y >= layout.stackBottomLimitY) break;

      const lh = lineHeightForFont(b.stableFont);
      const maxLines = Math.max(1, Math.floor(b.box.h / lh));
      if (y + b.box.h > layout.stackBottomLimitY) break;

      const start = ptr[b.key];
      const end = Math.min(b.lines.length, start + maxLines);
      const slice = b.lines.slice(start, end);

      page.draws.push({ ...b.box, y, font: b.stableFont, lines: slice });
      ptr[b.key] = end;

      if (slice.length) y += b.box.h + (b.spacingAfter || 0);
    }

    pages.push(page);
    if (pages.length >= MAX_PAGES) break;
  }

  return pages;
}

function maxLinesForBox(box){
  const px = Math.max(box.minFontPx ?? 12, parsePx(box.font));
  const stableFont = setFontPx(box.font, px);
  const lh = lineHeightForFont(stableFont);
  const perBox = Math.max(1, Math.floor(box.h / lh));
  return perBox * MAX_PAGES;
}

function currentLineCount(box, value){
  const px = Math.max(box.minFontPx ?? 12, parsePx(box.font));
  const stableFont = setFontPx(box.font, px);
  const full = (box.prefix || '') + (value || '');
  return wrapLines(full, stableFont, box.w).length;
}

function enforceMaxRenderedLines(textareaEl, box){
  if (!textareaEl) return;

  const cut = box.lineCut || 0;

  const px = Math.max(box.minFontPx ?? 12, parsePx(box.font));
  const stableFont = setFontPx(box.font, px);
  const lh = lineHeightForFont(stableFont);

  // how many lines fit in THIS box (minus cut)
  const perBoxLines = Math.max(1, Math.floor(box.h / lh) - cut);

  // for summary, MAX_PAGES should be 1 anyway, but keep consistent:
  const maxLines = perBoxLines * MAX_PAGES;

  const full = (box.prefix || '') + (textareaEl.value || '');
  const lines = wrapLines(full, stableFont, box.w);

  if (lines.length <= maxLines) return;

  // trim chars until it fits
  let v = textareaEl.value;
  while (v.length > 0){
    v = v.slice(0, -1);
    const testLines = wrapLines((box.prefix || '') + v, stableFont, box.w);
    if (testLines.length <= maxLines){
      textareaEl.value = v;
      break;
    }
  }
}


function updateCounters(){
  const dMax = maxLinesForBox(layout.description);
  const cMax = maxLinesForBox(layout.clothing);
  const nMax = maxLinesForBox(layout.notes);

  const dNow = currentLineCount(layout.description, els.description?.value || '');
  const cNow = currentLineCount(layout.clothing, els.clothing?.value || '');
  const nNow = currentLineCount(layout.notes, els.notes?.value || '');

  if (els.countDescription) els.countDescription.textContent = `${dNow} / ${dMax} lines`;
  if (els.countClothing) els.countClothing.textContent = `${cNow} / ${cMax} lines`;
  if (els.countNotes) els.countNotes.textContent = `${nNow} / ${nMax} lines`;
}

function enforceInputCapsAndCounters(){
  enforceMaxRenderedLines(els.description, layout.description);
  enforceMaxRenderedLines(els.clothing, layout.clothing);
  enforceMaxRenderedLines(els.notes, layout.notes);
  enforceMaxRenderedLines(els.summary, layout.summary);
  updateCounters();
}

function render(){
  const v = getValues();
  const stackPages = paginateStackedBlocks(v);
  const pageCount = Math.max(1, stackPages.length);

  canvas.width = layout.canvas.w;
  canvas.height = layout.canvas.h * pageCount;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let p = 0; p < pageCount; p++){
    const offsetY = p * layout.canvas.h;
    drawBasePage(offsetY);

    fitAndDrawTextBox({ text: v.headerText, ...layout.header, y: layout.header.y + offsetY });
    fitAndDrawTextBox({ text: v.name,       ...layout.name,   y: layout.name.y   + offsetY });

    const page = stackPages[p];
    if (page){
      for (const d of page.draws){
        drawLinesInBox({
          lines: d.lines,
          x: d.x,
          y: d.y + offsetY,
          w: d.w,
          h: d.h,
          font: d.font,
          color: d.color,
          align: d.align,
        });
      }
    }

    if (p === 0){
      fitAndDrawTextBox({ text: v.dateTime, ...layout.tableDate });
      fitAndDrawTextBox({ text: v.location, ...layout.tableLoc });
      fitAndDrawTextBox({ text: v.reportNo, ...layout.tableReport });

      if (!isReallyEmpty(v.summary)) {
        drawTextCappedInBox({
          text: v.summary,
          x: layout.summary.x,
          y: layout.summary.y,
          w: layout.summary.w,
          h: layout.summary.h,
          font: layout.summary.font,
          color: layout.summary.color,
          align: layout.summary.align,
          prefix: ''
        });
      }
      if (!isReallyEmpty(v.contactLine)) fitAndDrawTextBox({ text: v.contactLine, ...layout.contact, prefix: '' });

      if (!isReallyEmpty(v.preparedBy))  fitAndDrawTextBox({ text: v.preparedBy,  ...layout.footerPrepared });
      if (!isReallyEmpty(v.footerDate))  fitAndDrawTextBox({ text: v.footerDate,  ...layout.footerDate });
      if (!isReallyEmpty(v.footerReport))fitAndDrawTextBox({ text: v.footerReport,...layout.footerReport });
    }
  }
}

function downloadPng(){
  enforceInputCapsAndCounters();
  render();
  const a = document.createElement('a');
  a.download = 'crime-alert.png';
  a.href = canvas.toDataURL('image/png');
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/* ---- Zoom slider + Ctrl/⌘ wheel ---- */
function sliderMinMax(){
  const minPct = els.zoom ? parseInt(els.zoom.min || '40', 10) : 40;
  const maxPct = els.zoom ? parseInt(els.zoom.max || '160', 10) : 160;
  return { min: minPct / 100, max: maxPct / 100 };
}

function setZoom(z){
  if (!els.canvasWrap) return;
  const { min, max } = sliderMinMax();
  const clamped = Math.max(min, Math.min(max, z));
  els.canvasWrap.style.setProperty('--zoom', String(clamped));
  if (els.zoom) els.zoom.value = String(Math.round(clamped * 100));
  if (els.zoomLabel) els.zoomLabel.textContent = `${Math.round(clamped * 100)}%`;
}

els.zoom?.addEventListener('input', () => setZoom(parseInt(els.zoom.value, 10) / 100));

els.canvasWrap?.addEventListener('wheel', (e) => {
  if (!(e.ctrlKey || e.metaKey)) return;
  e.preventDefault();

  const stepPct = els.zoom ? parseInt(els.zoom.step || '5', 10) : 5;
  const current = parseFloat(getComputedStyle(els.canvasWrap).getPropertyValue('--zoom')) || 1;
  const currentPct = Math.round(current * 100);
  const dir = Math.sign(e.deltaY);
  const nextPct = currentPct + (dir > 0 ? -stepPct : stepPct);

  if (els.zoom) els.zoom.value = String(nextPct);
  setZoom(nextPct / 100);
}, { passive: false });

/* ---- Mugshot load ---- */
async function loadFileAsImage(file){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

async function loadUrlAsImage(url){
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(String(url).trim());
    } catch {
      reject(new Error('Invalid URL.'));
      return;
    }

    // ✅ Only allow HTTPS image URLs
    if (parsed.protocol !== 'https:') {
      reject(new Error('Only https:// image URLs are allowed.'));
      return;
    }

    const img = new Image();

    // Helps when the remote host provides proper CORS headers.
    // (Without CORS, the image may still load but the canvas can become "tainted" and PNG export can fail.)

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image URL failed to load.'));

    // Use the normalized URL
    img.src = parsed.href;
  });
}


/* ---- Mobile tabs ---- */
const tabButtons = document.querySelectorAll('.tabBtn');
tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    tabButtons.forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');

    const tab = btn.getAttribute('data-tab');
    const inputs = document.getElementById('panelInputs');
    const preview = document.getElementById('panelPreview');
    if (!inputs || !preview) return;

    if (tab === 'inputs'){
      inputs.style.display = '';
      preview.style.display = 'none';
    } else {
      preview.style.display = '';
      inputs.style.display = 'none';
    }
  });
});

function syncMobileDefault(){
  if (window.matchMedia('(max-width: 1100px)').matches){
    const active = document.querySelector('.tabBtn.is-active')?.getAttribute('data-tab') || 'inputs';
    const inputs = document.getElementById('panelInputs');
    const preview = document.getElementById('panelPreview');
    if (!inputs || !preview) return;
    preview.style.display = (active === 'preview') ? '' : 'none';
    inputs.style.display = (active === 'inputs') ? '' : 'none';
  } else {
    const inputs = document.getElementById('panelInputs');
    const preview = document.getElementById('panelPreview');
    if (inputs) inputs.style.display = '';
    if (preview) preview.style.display = '';
  }
}
window.addEventListener('resize', syncMobileDefault);

/* ---- Events ---- */
els.btnDownload?.addEventListener('click', downloadPng);

els.mugshot?.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  mugshotImg = await loadFileAsImage(file);
  render();
});

els.btnLoadMugshotUrl?.addEventListener('click', async () => {
  const url = (els.mugshotUrl?.value || '').trim();
  if (!url) return;
  try{
    mugshotImg = await loadUrlAsImage(url);
    render();
  } catch(err){
    alert(err.message || String(err));
  }
});

[
  'headerText','name','description','clothing','notes',
  'dateTime','location','reportNo','summary','contactLine',
  'preparedBy','footerDate','footerReport'
].forEach(id => {
  document.getElementById(id)?.addEventListener('input', () => {
    if (id === 'description' || id === 'clothing' || id === 'notes' || id === 'summary'){
      enforceInputCapsAndCounters();
    } else {
      updateCounters();
    }
    render();
  });
});

templateImg.onload = () => {
  syncMobileDefault();
  setZoom(parseInt(els.zoom?.value || '100', 10) / 100);
  loadTextLocal();
  hookAutosave();
  enforceInputCapsAndCounters();
  render();
};

templateImg.onerror = () => alert('template.png failed to load. Make sure it is next to index.html and named exactly "template.png".');

function hookAutosave(){
  const ids = [
    'headerText','name','description','clothing','notes',
    'dateTime','location','reportNo',
    'summary','contactLine',
    'preparedBy','footerDate','footerReport'
  ];

  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) {
      console.warn("Autosave missing element:", id);
      return;
    }
    el.addEventListener('input', () => {
      saveTextLocal();
    });
  });

  // extra safety: save on refresh/close too
  window.addEventListener('beforeunload', () => saveTextLocal());
}
function clearAllInputs(){
  // text inputs
  [
    els.headerText,
    els.name,
    els.description,
    els.clothing,
    els.notes,
    els.dateTime,
    els.location,
    els.reportNo,
    els.summary,
    els.contactLine,
    els.preparedBy,
    els.footerDate,
    els.footerReport,
  ].forEach(el => {
    if (el) el.value = '';
  });

  // clear mugshot
  mugshotImg = null;
  if (els.mugshot) els.mugshot.value = '';
  if (els.mugshotUrl) els.mugshotUrl.value = '';

  // clear saved text
  try{
    sessionStorage.removeItem("apbgen:text:v1");
  } catch {}

  // reset counters + re-render
  enforceInputCapsAndCounters();
  render();
}

document.getElementById('btnClear')?.addEventListener('click', () => {
  const ok = confirm('Start a new APB? This will clear all current entries.');
  if (!ok) return;
  clearAllInputs();
});

