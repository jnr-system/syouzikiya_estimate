// ===== データ読み込み =====
let OPTIONS = [];
let DISCOUNTS = [];

async function loadData() {
  const res = await fetch('/data/options.json');
  const data = await res.json();
  OPTIONS = data.options;
  DISCOUNTS = data.discounts;
  initSelects();
}

// ===== セレクト初期化 =====
function initSelects() {
  [1, 2, 3].forEach(n => {
    // オプション
    const sel = document.getElementById(`p${n}_optSelect`);
    sel.innerHTML = '<option value="">── 追加項目を選択 ──</option>';
    OPTIONS.forEach(opt => {
      const o = document.createElement('option');
      o.value = JSON.stringify(opt);
      o.textContent = `${opt.name}　¥${opt.price.toLocaleString()}`;
      sel.appendChild(o);
    });

    // 割引
    const dsel = document.getElementById(`p${n}_discount`);
    dsel.innerHTML = '<option value="0">なし</option>';
    DISCOUNTS.forEach(d => {
      const o = document.createElement('option');
      o.value = d.price;
      o.textContent = `${d.name}　¥${Math.abs(d.price).toLocaleString()}`;
      dsel.appendChild(o);
    });
  });
}

// ===== タブ切替 =====
function switchTab(n) {
  document.querySelectorAll('.tab-btn').forEach((b, i) => b.classList.toggle('active', i + 1 === n));
  document.querySelectorAll('.proposal-panel').forEach((p, i) => p.classList.toggle('active', i + 1 === n));
}

// ===== 価格表貼り付け解析 =====
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('pasteInput').addEventListener('input', function () {
    const val = this.value.trim();
    if (!val) { document.getElementById('parsedResult').classList.remove('show'); return; }

    const parts = val.split(/\t/);
    if (parts.length >= 3) {
      const productName = parts[0].trim();
      const modelCode  = parts[1].trim();
      const priceRaw   = parts[2].trim().replace(/[,，円¥\\]/g, '');

      document.getElementById('parsedName').value  = productName;
      document.getElementById('parsedModel').value = modelCode;
      document.getElementById('parsedPrice').value = priceRaw;

      // 提案1に自動反映
      document.getElementById('p1_model').value = modelCode;
      document.getElementById('p1_price').value = priceRaw;
      // 提案1の品名も保持
      document.getElementById('p1_productName').value = productName;
      calcSubtotal(1);

      document.getElementById('parsedResult').classList.add('show');
    }
  });

  loadData();
});

// ===== 選択済みオプション管理 =====
const selectedOptions = { 1: [], 2: [], 3: [] };

function addOption(n) {
  const sel = document.getElementById(`p${n}_optSelect`);
  if (!sel.value) return;
  const opt = JSON.parse(sel.value);

  // 重複チェック
  if (selectedOptions[n].some(o => o.name === opt.name)) {
    sel.value = '';
    return;
  }

  selectedOptions[n].push(opt);
  renderOptions(n);
  sel.value = '';
  calcSubtotal(n);
}

function removeOption(n, idx) {
  selectedOptions[n].splice(idx, 1);
  renderOptions(n);
  calcSubtotal(n);
}

function renderOptions(n) {
  const list = document.getElementById(`p${n}_options`);
  list.innerHTML = '';
  selectedOptions[n].forEach((opt, idx) => {
    const row = document.createElement('div');
    row.className = 'option-row';
    row.innerHTML = `
      <span class="option-name">${opt.name}</span>
      <span class="option-price">¥${opt.price.toLocaleString()}</span>
      <button class="btn-remove" onclick="removeOption(${n},${idx})">×</button>
    `;
    list.appendChild(row);
  });
}

// ===== 小計計算 =====
function calcSubtotal(n) {
  const priceRaw = document.getElementById(`p${n}_price`).value.replace(/[,，円¥\\]/g, '');
  const base     = parseInt(priceRaw) || 0;
  const optTotal = selectedOptions[n].reduce((s, o) => s + o.price, 0);
  const discount = parseInt(document.getElementById(`p${n}_discount`).value) || 0;
  const total    = base + optTotal + discount;

  document.getElementById(`p${n}_total`).textContent = `¥${total.toLocaleString()}`;

  // 提案1は詳細も更新
  if (n === 1) {
    const sb = document.getElementById('p1_subtotal');
    if (sb) {
      sb.innerHTML = `
        <div class="subtotal-row"><span>本体</span><span>¥${base.toLocaleString()}</span></div>
        <div class="subtotal-row"><span>追加合計</span><span>¥${optTotal.toLocaleString()}</span></div>
        ${discount !== 0 ? `<div class="subtotal-row discount-line"><span>割引</span><span>¥${discount.toLocaleString()}</span></div>` : ''}
        <div class="subtotal-row total"><span>合計金額（税込）</span><span>¥${total.toLocaleString()}</span></div>
      `;
    }
  }
  return { base, optTotal, discount, total };
}

// ===== 結果タブ切替 =====
function switchResult(tab) {
  document.querySelectorAll('.result-tab').forEach((t, i) =>
    t.classList.toggle('active', (i === 0 && tab === 'mail') || (i === 1 && tab === 'pdf'))
  );
  document.querySelectorAll('.result-panel').forEach((p, i) =>
    p.classList.toggle('active', (i === 0 && tab === 'mail') || (i === 1 && tab === 'pdf'))
  );
}

// ===== メール本文コピー =====
function copyMail() {
  navigator.clipboard.writeText(document.getElementById('mailBody').textContent)
    .then(() => alert('メール本文をコピーしました'));
}

// ===== 印刷 =====
function printEstimate() {
  const iframe = document.getElementById('pdfPreview');
  iframe.contentWindow.focus();
  iframe.contentWindow.print();
}

// ===== 見積書生成 =====
function generate() {
  const name     = document.getElementById('recipientName').value.trim() || '　';
  const staff    = document.getElementById('staffName').value.trim() || '　';
  const existing = document.getElementById('existingModel').value.trim() || '　';

  // 日付
  const today  = new Date();
  const expire = new Date(today);
  expire.setDate(expire.getDate() + 7);
  const fmt = d => `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;

  // 提案データ収集
  const proposals = [1, 2, 3].map(n => {
    const model = document.getElementById(`p${n}_model`).value.trim();
    if (!model) return null;
    const productName = document.getElementById(`p${n}_productName`)?.value.trim() || '';
    const { base, optTotal, discount, total } = calcSubtotal(n);
    const opts    = [...selectedOptions[n]];
    const comment = document.getElementById(`p${n}_comment`).value.trim();
    return { n, model, productName, base, optTotal, discount, total, opts, comment };
  }).filter(Boolean);

  if (!proposals.length) {
    alert('少なくとも提案１の型式と金額を入力してください。');
    return;
  }

  // メール本文
  let mail = `${name} 様\n\nいつもお世話になっております。\n正直屋の${staff}でございます。\n\nこの度はお問い合わせいただきまして、誠にありがとうございます。\n下記の通りお見積りをご案内申し上げます。\n\n`;
  mail += `【既設機種】${existing}\n\n`;
  mail += `━━━━━━━━━━━━━━━━━━━━━━\n`;

  proposals.forEach(p => {
    mail += `\n【ご提案${p.n}】\n`;
    mail += `型式　　：${p.model}\n`;
    mail += `本体金額：¥${p.base.toLocaleString()}（税込）\n`;
    p.opts.forEach(o => { mail += `${o.name}：¥${o.price.toLocaleString()}\n`; });
    if (p.discount !== 0) mail += `割引　　：¥${p.discount.toLocaleString()}\n`;
    mail += `合計金額：¥${p.total.toLocaleString()}（税込）\n`;
    if (p.comment) mail += `※${p.comment}\n`;
    mail += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  });

  mail += `\n【交換工事に含まれるもの】\n・給湯器本体\n・施工費\n・撤去・引取込み\n・交通費\n・消費税\n・施工10年保証\n\n詳しくは添付の見積書をご確認ください。\nご不明な点がございましたら、お気軽にお問い合わせください。\n\nどうぞよろしくお願いいたします。\n\n──────────────────\n正直屋　${staff}\nTEL：0800-123-9100\n──────────────────`;

  document.getElementById('mailBody').textContent = mail;

  // 見積書プレビュー（テンプレートをfetchして差し込む）
  buildEstimatePreviews(proposals, name, staff, existing, fmt(today), fmt(expire));

  document.getElementById('resultCard').classList.add('show');
  document.getElementById('resultCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===== 見積書プレビュー構築 =====
async function buildEstimatePreviews(proposals, name, staff, existing, issueDate, expireDate) {
  let res;
  try {
    res = await fetch('/templates/estimate.html');
  } catch {
    document.getElementById('pdfPreview').srcdoc = '<p style="padding:20px;">テンプレートを読み込めませんでした。</p>';
    return;
  }
  const templateHtml = await res.text();

  const pages = proposals.map((p, i) => {
    const noNum = `No.MTM${String(i + 1).padStart(4, '0')}`;
    let html = templateHtml;

    // 変数置換
    html = html.replace(/<!-- {{発行日}} -->[\s\S]*?(?=<)/, issueDate);
    html = html.replace(/No\.MTM\d+/, noNum);
    html = html.replace(/<!-- {{担当者}} -->[\s\S]*?(?=<)/, staff);
    html = html.replace(/<!-- {{宛名}} -->[\s\S]*?(?=<)/, name);
    html = html.replace(/<!-- {{有効期限}} -->[\s\S]*?(?=<)/, expireDate);
    html = html.replace(/<!-- {{件名}} -->[\s\S]*?(?=<)/, `${existing}交換工事のお見積り`);
    html = html.replace(/<!-- {{合計金額}} -->[\s\S]*?(?=<)/, `¥${p.total.toLocaleString()}-`);
    html = html.replace(/<!-- {{型式}} -->[\s\S]*?(?=<)/, p.model);
    html = html.replace(/<!-- {{提案金額}} -->[\s\S]*?(?=<)/, `¥${p.base.toLocaleString()}`);

    return html;
  }).join('<div style="page-break-after:always;"></div>');

  document.getElementById('pdfPreview').srcdoc = pages;
}
