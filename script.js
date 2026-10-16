'use strict';
/* ===== أدوات عامة ===== */
const KEY = 'restaurant_pos_v1', $ = s => document.querySelector(s), uid = () => Math.random().toString(36).slice(2, 9);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ph = e => 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#eef2ff"/><text x="50" y="66" font-size="46" text-anchor="middle">${e}</text></svg>`);
const CUR = ['DA', '€', '$', 'MAD', 'TND', 'SAR'];
const fd = iso => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
const dk = d => new Date(d).toLocaleDateString('en-CA');
const m = n => (Math.round(n * 100) / 100).toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g, ' ') + ' ' + S.settings.cur;
const stT = { pending: 'غير مسلّم', done: 'تم الاستلام', canceled: 'ملغى' };
const typeT = t => t == 'in' ? '🍽️ داخل المطعم' : '🛍️ سفري';

/* ===== البيانات ===== */
function seed() {
  const cats = [['c1', 'الوجبات', '🍽️'], ['c2', 'البيتزا', '🍕'], ['c3', 'البرغر', '🍔'], ['c4', 'السندويتشات', '🥪'], ['c5', 'المشروبات', '🥤'], ['c6', 'الحلويات', '🍰'], ['c7', 'إضافات أخرى', '🍟']].map(([id, name, icon]) => ({ id, name, icon }));
  const products = [['طاجين دجاج', 850, 'c1', '🍲'], ['كسكسي', 700, 'c1', '🥘'], ['بيتزا مارغريتا', 600, 'c2', '🍕'], ['بيتزا أربعة أجبان', 900, 'c2', '🧀'], ['برغر لحم', 550, 'c3', '🍔'], ['تشيز برغر', 650, 'c3', '🍔'], ['شاورما', 400, 'c4', '🌯'], ['بانيني', 350, 'c4', '🥪'], ['عصير برتقال', 200, 'c5', '🧃'], ['مشروب غازي', 120, 'c5', '🥤'], ['تيراميسو', 350, 'c6', '🍰'], ['بطاطس مقلية', 200, 'c7', '🍟']].map(([name, price, cat, e]) => ({ id: uid(), name, price, cat, e, img: '', hidden: false }));
  return { settings: { name: 'مطعمي', logo: '', phone: '', address: '', cur: 'DA', header: '', footer: 'شكرًا لزيارتكم', showPrices: true, paper: '80' }, cats, products, orders: [], counter: 0 };
}
function load() { try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && d.products && d.settings) return d; } catch (e) { } return seed(); }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); return true; } catch (e) { toast('تعذّر الحفظ: مساحة التخزين ممتلئة. صغّر الصور أو احذف بعضها.', 'err'); return false; } }
let S = load(), cart = { items: [], note: '', type: 'in' }, q = '', cat = 'all', busy = false, view = 'dash', cb = null, tmpImg = '', tmpLogo, pf = { q: '', t: '' }, hf = { q: '', d: '' }, prq = '';
const pimg = p => p.img || ph(p.e || (S.cats.find(c => c.id == p.cat) || {}).icon || '🍽️');
const ctotal = () => cart.items.reduce((s, i) => s + i.p * i.q, 0);

/* ===== واجهة عامة ===== */
function toast(t, k = '') { const d = document.createElement('div'); d.className = k; d.textContent = t; $('#toast').append(d); setTimeout(() => d.remove(), 2800); }
function show(h) { $('#modal').hidden = false; $('#modal').innerHTML = `<div class="mb">${h}</div>`; }
function closeM() { $('#modal').hidden = true; $('#modal').innerHTML = ''; render(); }
function ask(msg, fn, label = 'تأكيد') { cb = fn; show(`<h3>${msg}</h3><div class="acts"><button class="pri" data-a="yes">${label}</button><button data-a="x">رجوع</button></div>`); }
function compress(file, max, done) {
  if (!file) return; const r = new FileReader();
  r.onload = () => { const i = new Image(); i.onload = () => { const k = Math.min(1, max / Math.max(i.width, i.height)), c = document.createElement('canvas'); c.width = Math.round(i.width * k); c.height = Math.round(i.height * k); const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(i, 0, 0, c.width, c.height); done(c.toDataURL('image/jpeg', .75)); }; i.onerror = () => toast('ملف الصورة غير صالح', 'err'); i.src = r.result; };
  r.readAsDataURL(file);
}

/* ===== التنقل ===== */
const NAV = [['dash', '🏠', 'الرئيسية'], ['pos', '🧾', 'الكاشي'], ['pending', '⏳', 'غير المسلّمة'], ['history', '📜', 'السجل'], ['products', '🍔', 'المنتجات'], ['settings', '⚙️', 'الإعدادات']];
function render() {
  const n = S.orders.filter(o => o.status == 'pending').length;
  $('#nav').innerHTML = `<div class="brand">${S.settings.logo ? `<img src="${S.settings.logo}" alt="">` : '🍴'}<span>${esc(S.settings.name)}</span></div>` + NAV.map(([k, i, t]) => `<a href="#${k}" class="${k == view ? 'on' : ''}"><b>${i}</b>${t}${k == 'pending' && n ? `<span class="bd">${n}</span>` : ''}</a>`).join('');
  document.title = S.settings.name;
  ({ dash: vDash, pos: vPos, pending: vPending, history: vHistory, products: vProducts, settings: vSettings }[view] || vDash)();
}
window.addEventListener('hashchange', () => { view = location.hash.slice(1) || 'dash'; render(); window.scrollTo(0, 0); });

/* ===== الرئيسية ===== */
function vDash() {
  const today = S.orders.filter(o => dk(o.at) == dk(new Date())), ok = today.filter(o => o.status != 'canceled'), done = today.filter(o => o.status == 'done');
  const pend = S.orders.filter(o => o.status == 'pending').length, sum = a => a.reduce((s, o) => s + o.total, 0);
  const st = [['🧾', 'طلبات اليوم', ok.length], ['⏳', 'غير مسلّمة', pend], ['✅', 'مستلمة اليوم', done.length], ['📋', 'قيمة الطلبات المؤكدة', m(sum(ok))], ['💰', 'مبيعات المستلمة', m(sum(done))]];
  const last = S.orders.slice(-5).reverse();
  $('#app').innerHTML = `<h1>مرحبًا في ${esc(S.settings.name)} 👋</h1><div class="stats">${st.map(([i, t, v]) => `<div class="st"><span>${i} ${t}</span><b>${v}</b></div>`).join('')}</div><h3>أحدث الطلبات</h3>${last.length ? last.map(o => oc(o, `<button data-a="det" data-id="${o.id}">عرض التفاصيل</button>`)).join('') : empty('🧾', 'لا توجد طلبات بعد. ابدأ من «الكاشي».')}`;
}
const empty = (e, t) => `<div class="empty"><div class="e">${e}</div>${t}</div>`;
function oc(o, acts) { return `<div class="card oc ${o.status}"><div class="oh"><span class="no">#${o.no}</span><span class="tag ${o.status}">${stT[o.status]}</span></div><div class="mu">${fd(o.at)} • ${typeT(o.type)}</div><div style="margin:8px 0">${o.items.map(i => `${i.q}× ${esc(i.n)}`).join('، ')}</div>${o.note ? `<div class="mu">📝 ${esc(o.note)}</div>` : ''}<b>${m(o.total)}</b><div class="acts">${acts}</div></div>`; }

/* ===== الكاشي ===== */
function vPos() {
  $('#app').innerHTML = `<h1>🧾 الكاشي</h1><div class="pos"><div><input placeholder="🔍 ابحث عن منتج..." value="${esc(q)}" data-i="q"><div class="cats" id="cats" style="margin-top:10px"></div><div class="grid" id="grid"></div></div><div class="card cart" id="cart"></div></div><button class="pri fab" id="fab" data-a="ct"></button>`;
  drawCats(); drawGrid(); drawCart();
}
function drawCats() { $('#cats').innerHTML = [{ id: 'all', icon: '⭐', name: 'الكل' }, ...S.cats].map(c => `<button class="${cat == c.id ? 'on' : ''}" data-a="cat" data-id="${c.id}">${c.icon} ${esc(c.name)}</button>`).join(''); }
function drawGrid() {
  const l = S.products.filter(p => !p.hidden && (cat == 'all' || p.cat == cat) && p.name.toLowerCase().includes(q.trim().toLowerCase()));
  $('#grid').innerHTML = l.length ? l.map(p => { const c = cart.items.find(i => i.pid == p.id); return `<div class="pc" data-a="add" data-id="${p.id}">${c ? `<span class="q">${c.q}</span>` : ''}<img src="${pimg(p)}" alt=""><div class="i"><div>${esc(p.name)}</div><div class="pr">${m(p.price)}</div></div></div>`; }).join('') : empty('🔎', 'لا توجد منتجات مطابقة');
}
function drawCart() {
  const n = cart.items.reduce((s, i) => s + i.q, 0);
  $('#fab').textContent = `🛒 السلة (${n}) • ${m(ctotal())}`;
  $('#cart').innerHTML = `<h3><span>🛒 الطلب الحالي</span><button class="sm" data-a="ct">✖ إغلاق</button></h3><div class="seg"><button class="${cart.type == 'in' ? 'on' : ''}" data-a="type" data-id="in">🍽️ داخل المطعم</button><button class="${cart.type == 'out' ? 'on' : ''}" data-a="type" data-id="out">🛍️ سفري</button></div>` +
    (cart.items.length ? cart.items.map(i => `<div class="ln"><div class="r"><b>${esc(i.n)}</b><button class="dan sm" data-a="rm" data-id="${i.pid}">🗑</button></div><div class="r"><span class="mu">${m(i.p)} للوحدة</span><div class="qt"><button data-a="dec" data-id="${i.pid}">−</button><input type="number" min="1" inputmode="numeric" value="${i.q}" data-c="qty" data-id="${i.pid}"><button data-a="inc" data-id="${i.pid}">+</button></div></div><div class="r"><input class="nt" placeholder="ملاحظة (بدون بصل...)" value="${esc(i.note)}" data-c="inote" data-id="${i.pid}"><b style="padding-inline:8px">${m(i.p * i.q)}</b></div></div>`).join('') : empty('🛒', 'السلة فارغة، اضغط على منتج لإضافته')) +
    `<textarea rows="2" placeholder="ملاحظة عامة على الطلب" data-i="cnote">${esc(cart.note)}</textarea><div class="tot"><span>المجموع</span><span>${m(ctotal())}</span></div><div class="acts"><button class="pri" data-a="ask" style="flex:2">✔ تأكيد الطلب</button><button class="dan" data-a="clear">إلغاء الطلب الحالي</button></div>`;
}

/* ===== الطلبات غير المسلّمة ===== */
function vPending() {
  $('#app').innerHTML = `<h1>⏳ الطلبات غير المسلّمة</h1><div class="bar"><input placeholder="🔍 رقم الطلب" inputmode="numeric" value="${esc(pf.q)}" data-i="pq"><select data-i="pt"><option value="">كل الأنواع</option><option value="in" ${pf.t == 'in' ? 'selected' : ''}>داخل المطعم</option><option value="out" ${pf.t == 'out' ? 'selected' : ''}>سفري</option></select></div><div id="plist"></div>`; drawPending();
}
function drawPending() {
  const l = S.orders.filter(o => o.status == 'pending' && (!pf.t || o.type == pf.t) && String(o.no).includes(pf.q.trim().replace('#', ''))).reverse();
  $('#plist').innerHTML = l.length ? l.map(o => oc(o, `<button data-a="det" data-id="${o.id}">عرض التفاصيل</button><button data-a="rep" data-id="${o.id}">🖨 إعادة طباعة التذكرة</button><button class="suc" data-a="done" data-id="${o.id}">✔ تم الاستلام</button>`)).join('') : empty('🎉', 'لا توجد طلبات غير مسلّمة حاليًا');
}

/* ===== السجل ===== */
function vHistory() {
  const today = S.orders.filter(o => dk(o.at) == dk(new Date()) && o.status != 'canceled');
  $('#app').innerHTML = `<h1>📜 سجل الطلبات</h1><div class="card">اليوم: <b>${today.length}</b> طلب • مبيعات المستلمة: <b>${m(today.filter(o => o.status == 'done').reduce((s, o) => s + o.total, 0))}</b></div><div class="bar"><input placeholder="🔍 رقم الطلب" inputmode="numeric" value="${esc(hf.q)}" data-i="hq"><input type="date" value="${hf.d}" data-i="hd"></div><div id="hlist"></div>`; drawHistory();
}
function drawHistory() {
  const l = S.orders.filter(o => String(o.no).includes(hf.q.trim().replace('#', '')) && (!hf.d || dk(o.at) == hf.d)).reverse();
  $('#hlist').innerHTML = l.length ? l.map(o => oc(o, `<button data-a="det" data-id="${o.id}">عرض التفاصيل</button><button data-a="rep" data-id="${o.id}">🖨 إعادة طباعة التذكرة</button>`)).join('') : empty('📭', 'لا توجد طلبات');
}

/* ===== المنتجات ===== */
function vProducts() {
  const l = S.products.filter(p => p.name.toLowerCase().includes(prq.toLowerCase()));
  $('#app').innerHTML = `<h1>🍔 المنتجات</h1><div class="bar"><input placeholder="🔍 ابحث بالاسم" value="${esc(prq)}" data-i="prq"><button class="pri" data-a="padd">＋ منتج جديد</button><button data-a="cats">🗂 التصنيفات</button></div><div class="grid">${l.map(p => `<div class="card pc ${p.hidden ? 'off' : ''}" style="padding:0;cursor:default"><img src="${pimg(p)}" alt=""><div class="i"><b>${esc(p.name)}</b><div class="pr">${m(p.price)}</div><div class="mu">${esc((S.cats.find(c => c.id == p.cat) || { name: 'بدون تصنيف' }).name)}${p.hidden ? ' • مخفي' : ''}</div><div class="acts"><button class="sm" data-a="pedit" data-id="${p.id}">✏️</button><button class="sm" data-a="ptog" data-id="${p.id}">${p.hidden ? '👁' : '🙈'}</button><button class="dan sm" data-a="pdel" data-id="${p.id}">🗑</button></div></div></div>`).join('') || empty('📦', 'لا توجد منتجات')}</div>`;
}
function pform(p) {
  tmpImg = p ? p.img : '';
  show(`<h3>${p ? 'تعديل المنتج' : 'إضافة منتج'}</h3><label>الاسم</label><input id="pn" value="${esc(p ? p.name : '')}"><label>السعر (${esc(S.settings.cur)})</label><input id="pp" type="number" min="0" inputmode="decimal" value="${p ? p.price : ''}"><label>التصنيف</label><select id="pcat">${S.cats.map(c => `<option value="${c.id}" ${p && p.cat == c.id ? 'selected' : ''}>${c.icon} ${esc(c.name)}</option>`).join('')}</select><label>الصورة</label><div class="row"><img class="pv" id="pv" src="${tmpImg || ph('🍽️')}" alt=""><input type="file" accept="image/*" data-c="pfile"><button class="dan sm" data-a="pimgrm">حذف</button></div><div class="acts"><button class="pri" data-a="psave" data-id="${p ? p.id : ''}">حفظ</button><button data-a="x">إلغاء</button></div>`);
}
function catsModal() {
  show(`<h3>🗂 التصنيفات</h3>${S.cats.map(c => `<div class="row" style="margin-bottom:8px"><span>${c.icon}</span><input value="${esc(c.name)}" data-c="cren" data-id="${c.id}"><button class="dan sm" data-a="cdel" data-id="${c.id}">🗑</button></div>`).join('')}<label>تصنيف جديد</label><div class="row"><input id="cn" placeholder="اسم التصنيف"><button class="pri" data-a="cadd">إضافة</button></div><div class="acts"><button data-a="x">تم</button></div>`);
}

/* ===== الإعدادات ===== */
function vSettings() {
  const s = S.settings; tmpLogo = undefined;
  $('#app').innerHTML = `<h1>⚙️ إعدادات المطعم</h1><div class="card"><label>اسم المطعم *</label><input id="sn" value="${esc(s.name)}"><label>اللوغو</label><div class="row"><img class="pv" id="lv" src="${s.logo || ph('🍴')}" alt=""><input type="file" accept="image/*" data-c="lfile"><button class="dan sm" data-a="logorm">حذف</button></div><label>الهاتف (اختياري)</label><input id="sph" value="${esc(s.phone)}" inputmode="tel"><label>العنوان (اختياري)</label><input id="sad" value="${esc(s.address)}"><label>العملة</label><select id="scur">${CUR.map(c => `<option ${c == s.cur ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
  <div class="card"><h3>🖨 التذاكر</h3><label>ترويسة التذكرة</label><input id="shd" value="${esc(s.header)}"><label>تذييل التذكرة</label><input id="sft" value="${esc(s.footer)}"><label>عرض الورق</label><select id="spp"><option value="80" ${s.paper == '80' ? 'selected' : ''}>80 مم</option><option value="58" ${s.paper == '58' ? 'selected' : ''}>58 مم</option></select><label><input type="checkbox" id="ssp" style="width:auto;min-height:0" ${s.showPrices ? 'checked' : ''}> إظهار الأسعار في تذكرة المطبخ</label><p class="mu">الطباعة تتم عبر نافذة الطباعة في المتصفح (لا توجد طباعة صامتة مضمونة). للطباعة الحرارية المباشرة قد تحتاج إعدادًا إضافيًا أو تطبيقًا وسيطًا متوافقًا مع طابعتك.</p></div>
  <button class="pri" data-a="sv" style="width:100%">💾 حفظ الإعدادات</button>
  <div class="card" style="margin-top:12px"><h3>ℹ️ ملاحظات</h3><p class="mu">هذه نسخة تجريبية: البيانات محفوظة في متصفح هذا الجهاز فقط، ولا تتزامن بين الأجهزة، وقد تُفقد عند مسح بيانات المتصفح أو تغيير الجهاز. ليست نظام إنتاج متكاملًا.</p><button class="dan" data-a="reset" style="margin-top:10px">♻️ إعادة تعيين البيانات التجريبية</button></div>`;
}

/* ===== الطباعة ===== */
function ticket(o, kind) {
  const s = S.settings, k = kind == 'k', sp = k ? s.showPrices : true;
  return `<div class="tk">${s.logo ? `<img src="${s.logo}" alt="">` : ''}<div class="c"><b>${esc(s.name)}</b>${s.phone ? `<br>${esc(s.phone)}` : ''}${s.address ? `<br>${esc(s.address)}` : ''}${s.header ? `<br>${esc(s.header)}` : ''}</div><h2>${k ? 'تذكرة المطبخ' : 'وصل الزبون'}</h2><div class="big">#${o.no}</div><div class="c">${fd(o.at)}<br><b>${o.type == 'in' ? 'داخل المطعم' : 'سفري'}</b></div><hr>${o.items.map(i => `<div class="it"><span>${i.q} × ${esc(i.n)}</span>${sp ? `<span>${m(i.p * i.q)}</span>` : ''}</div>${sp && i.q > 1 ? `<div class="n">${m(i.p)} للوحدة</div>` : ''}${i.note ? `<div class="n">↳ ${esc(i.note)}</div>` : ''}`).join('')}<hr>${o.note ? `<div><b>ملاحظة:</b> ${esc(o.note)}</div><hr>` : ''}${sp ? `<div class="it" style="font-size:16px"><span>المجموع</span><span>${m(o.total)}</span></div>` : ''}${s.footer ? `<div class="c" style="margin-top:8px">${esc(s.footer)}</div>` : ''}</div>`;
}
function doPrint(o, kind) {
  const w = +S.settings.paper;
  $('#pg').textContent = `@media print{@page{size:${w}mm auto;margin:0}#print .tk{width:${w - 4}mm}}`;
  $('#print').innerHTML = ticket(o, kind); setTimeout(() => window.print(), 80);
}
const byId = id => S.orders.find(o => o.id == id);

/* ===== الأحداث ===== */
const A = {
  x: closeM, yes() { const f = cb; cb = null; $('#modal').hidden = true; $('#modal').innerHTML = ''; f && f(); },
  q(v) { q = v; drawGrid(); }, cat(id) { cat = id; drawCats(); drawGrid(); }, ct() { $('#cart').classList.toggle('open'); },
  add(id) { const p = S.products.find(p => p.id == id); if (!p) return; const c = cart.items.find(i => i.pid == id); c ? c.q++ : cart.items.push({ pid: id, n: p.name, p: p.price, q: 1, note: '' }); drawGrid(); drawCart(); },
  inc(id) { cart.items.find(i => i.pid == id).q++; drawGrid(); drawCart(); },
  dec(id) { const c = cart.items.find(i => i.pid == id); c.q > 1 ? c.q-- : cart.items = cart.items.filter(i => i.pid != id); drawGrid(); drawCart(); },
  rm(id) { cart.items = cart.items.filter(i => i.pid != id); drawGrid(); drawCart(); },
  qty(id, el) { const v = Math.floor(+el.value); if (v >= 1) cart.items.find(i => i.pid == id).q = v; drawGrid(); drawCart(); },
  inote(id, el) { cart.items.find(i => i.pid == id).note = el.value.trim(); },
  cnote(v) { cart.note = v; }, type(id) { cart.type = id; drawCart(); },
  clear() { if (!cart.items.length && !cart.note) return toast('الطلب الحالي فارغ'); ask('إلغاء الطلب الحالي وتفريغ السلة؟', () => { cart = { items: [], note: '', type: cart.type }; render(); }, 'نعم، إلغاء'); },
  ask() {
    if (!cart.items.length) return toast('السلة فارغة، أضف منتجًا أولًا', 'err');
    show(`<h3>ملخص الطلب • ${typeT(cart.type)}</h3>${cart.items.map(i => `<div class="r row" style="justify-content:space-between;padding:6px 0"><span>${i.q}× ${esc(i.n)}${i.note ? `<br><small class="mu">↳ ${esc(i.note)}</small>` : ''}</span><b>${m(i.p * i.q)}</b></div>`).join('')}${cart.note ? `<p class="mu">📝 ${esc(cart.note)}</p>` : ''}<div class="tot"><span>المجموع النهائي</span><span>${m(ctotal())}</span></div><div class="acts"><button class="pri" data-a="ok">✔ تأكيد وإنشاء الطلب</button><button data-a="x">رجوع</button></div>`);
  },
  ok() {
    if (busy) return; busy = true;
    if (!cart.items.length) { busy = false; return toast('السلة فارغة', 'err'); }
    const o = { id: uid(), no: ++S.counter, at: new Date().toISOString(), type: cart.type, items: cart.items.map(i => ({ n: i.n, p: i.p, q: i.q, note: i.note })), note: cart.note, total: ctotal(), status: 'pending' };
    S.orders.push(o); cart = { items: [], note: '', type: cart.type }; save();
    show(`<div class="empty"><div class="e">✅</div><h3>تم تسجيل الطلب</h3><div class="no">#${o.no}</div></div><div class="acts"><button class="pri" data-a="rep" data-id="${o.id}">🖨 طباعة تذكرة المطبخ</button><button data-a="rec" data-id="${o.id}">🧾 وصل الزبون</button><button data-a="x">طلب جديد</button></div>`);
    busy = false;
  },
  rep(id) { const o = byId(id); o && doPrint(o, 'k'); }, rec(id) { const o = byId(id); o && doPrint(o, 'r'); },
  det(id) {
    const o = byId(id); if (!o) return;
    show(`<div class="oh"><span class="no">#${o.no}</span><span class="tag ${o.status}">${stT[o.status]}</span></div><p class="mu">${fd(o.at)} • ${typeT(o.type)}</p>${o.items.map(i => `<div class="row" style="justify-content:space-between;padding:6px 0"><span>${i.q}× ${esc(i.n)} <small class="mu">(${m(i.p)})</small>${i.note ? `<br><small class="mu">↳ ${esc(i.note)}</small>` : ''}</span><b>${m(i.p * i.q)}</b></div>`).join('')}${o.note ? `<p class="mu">📝 ${esc(o.note)}</p>` : ''}<div class="tot"><span>المجموع</span><span>${m(o.total)}</span></div><div class="acts"><button data-a="rep" data-id="${o.id}">🖨 تذكرة المطبخ</button><button data-a="rec" data-id="${o.id}">🧾 وصل الزبون</button>${o.status == 'pending' ? `<button class="suc" data-a="done" data-id="${o.id}">✔ تم الاستلام</button><button class="dan" data-a="cancel" data-id="${o.id}">إلغاء الطلب</button>` : ''}<button data-a="x">إغلاق</button></div>`);
  },
  done(id) { const o = byId(id); if (!o || o.status != 'pending') return; ask(`تأكيد استلام الطلب #${o.no}؟`, () => { o.status = 'done'; o.doneAt = new Date().toISOString(); save(); toast(`تم استلام الطلب #${o.no}`, 'ok'); render(); }, '✔ تم الاستلام'); },
  cancel(id) { const o = byId(id); if (!o || o.status != 'pending') return; ask(`إلغاء الطلب #${o.no}؟ سيبقى في السجل كطلب ملغى.`, () => { o.status = 'canceled'; save(); toast('تم إلغاء الطلب'); render(); }, 'نعم، إلغاء'); },
  pq(v) { pf.q = v; drawPending(); }, pt(v) { pf.t = v; drawPending(); }, hq(v) { hf.q = v; drawHistory(); }, hd(v) { hf.d = v; drawHistory(); }, prq(v) { prq = v; vProducts(); $('[data-i=prq]').focus(); },
  padd() { if (!S.cats.length) return toast('أنشئ تصنيفًا أولًا', 'err'); pform(); }, pedit(id) { pform(S.products.find(p => p.id == id)); },
  pfile(id, el) { compress(el.files[0], 480, d => { tmpImg = d; $('#pv').src = d; }); }, pimgrm() { tmpImg = ''; $('#pv').src = ph('🍽️'); },
  psave(id) {
    const name = $('#pn').value.trim(), price = parseFloat($('#pp').value);
    if (!name) return toast('أدخل اسم المنتج', 'err'); if (isNaN(price) || price < 0) return toast('أدخل سعرًا صحيحًا', 'err');
    const bak = JSON.stringify(S);
    if (id) Object.assign(S.products.find(p => p.id == id), { name, price, cat: $('#pcat').value, img: tmpImg, e: undefined }); else S.products.push({ id: uid(), name, price, cat: $('#pcat').value, img: tmpImg, hidden: false });
    if (!save()) { S = JSON.parse(bak); return; } toast('تم حفظ المنتج', 'ok'); closeM();
  },
  ptog(id) { const p = S.products.find(p => p.id == id); p.hidden = !p.hidden; save(); render(); },
  pdel(id) { const p = S.products.find(p => p.id == id); ask(`حذف «${esc(p.name)}» نهائيًا؟ (يمكنك إخفاءه بدل ذلك)`, () => { S.products = S.products.filter(x => x.id != id); cart.items = cart.items.filter(i => i.pid != id); save(); render(); }, 'حذف'); },
  cats: catsModal, cadd() { const n = $('#cn').value.trim(); if (!n) return toast('أدخل اسم التصنيف', 'err'); S.cats.push({ id: uid(), name: n, icon: '📦' }); save(); catsModal(); },
  cren(id, el) { const n = el.value.trim(); if (!n) { toast('الاسم مطلوب', 'err'); return catsModal(); } S.cats.find(c => c.id == id).name = n; save(); },
  cdel(id) { if (S.products.some(p => p.cat == id)) return toast('لا يمكن حذف تصنيف يحتوي منتجات. انقل منتجاته أو احذفها أولًا', 'err'); S.cats = S.cats.filter(c => c.id != id); if (cat == id) cat = 'all'; save(); catsModal(); },
  lfile(id, el) { compress(el.files[0], 300, d => { tmpLogo = d; $('#lv').src = d; }); }, logorm() { tmpLogo = ''; $('#lv').src = ph('🍴'); },
  sv() {
    const name = $('#sn').value.trim(); if (!name) return toast('اسم المطعم مطلوب', 'err');
    const bak = JSON.stringify(S.settings), s = S.settings;
    Object.assign(s, { name, phone: $('#sph').value.trim(), address: $('#sad').value.trim(), cur: $('#scur').value, header: $('#shd').value.trim(), footer: $('#sft').value.trim(), paper: $('#spp').value, showPrices: $('#ssp').checked });
    if (tmpLogo !== undefined) s.logo = tmpLogo;
    if (!save()) { S.settings = JSON.parse(bak); return; } toast('تم حفظ الإعدادات', 'ok'); render();
  },
  reset() { ask('سيتم حذف كل المنتجات والطلبات والإعدادات واستعادة البيانات التجريبية. لا يمكن التراجع!', () => { localStorage.removeItem(KEY); S = seed(); cart = { items: [], note: '', type: 'in' }; cat = 'all'; toast('تمت إعادة التعيين', 'ok'); render(); }, 'نعم، احذف كل شيء'); }
};
document.addEventListener('click', e => { if (e.target.id == 'modal') return closeM(); const b = e.target.closest('[data-a]'); if (b && A[b.dataset.a]) A[b.dataset.a](b.dataset.id, b); });
document.addEventListener('change', e => { const t = e.target.closest('[data-c]'); if (t && A[t.dataset.c]) A[t.dataset.c](t.dataset.id, t); });
document.addEventListener('input', e => { const t = e.target.closest('[data-i]'); if (t && A[t.dataset.i]) A[t.dataset.i](t.value); });
view = location.hash.slice(1) || 'dash'; render();
