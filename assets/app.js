// ===== データ読み込み =====
let OPTIONS = [];
let DISCOUNTS = [];

async function loadData() {
  const res = await fetch('data/options.json');
  const data = await res.json();
  OPTIONS = data.options;
  DISCOUNTS = data.discounts;
  initSelects();
}

// ===== セレクト初期化 =====
function initSelects() {
  [1, 2, 3, 4, 5].forEach(n => {
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
const selectedOptions = { 1: [], 2: [], 3: [], 4: [], 5: [] };

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

  // 提案1は詳細も更新
  if (n === 1) {
    const sb = document.getElementById('p1_subtotal');
    if (sb) {
      sb.innerHTML = `
        <div class="subtotal-row"><span>本体</span><span>¥${base.toLocaleString()}</span></div>
        <div class="subtotal-row"><span>追加合計</span><span>¥${optTotal.toLocaleString()}</span></div>
        ${discount !== 0 ? `<div class="subtotal-row discount-line"><span>割引</span><span>¥${discount.toLocaleString()}</span></div>` : ''}
        <div class="subtotal-row total"><span>合計金額（税込）</span><span id="p1_total">¥${total.toLocaleString()}</span></div>
      `;
      return { base, optTotal, discount, total };
    }
  }
  document.getElementById(`p${n}_total`).textContent = `¥${total.toLocaleString()}`;
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

// ===== PDF直接保存 =====
async function savePdf() {
  const iframe = document.getElementById('pdfPreview');
  const doc = iframe.contentDocument || iframe.contentWindow.document;

  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`;
  const name = document.getElementById('recipientName').value.trim() || '';
  const fileName = `【正直屋　お見積書】${dateStr}${name}様.pdf`;

  const { jsPDF } = window.jspdf;
  const pages = doc.querySelectorAll('.page');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const margin = 10; // mm
  const pageW = 210;
  const pageH = 297;
  const imgW = pageW - margin * 2;

  for (let i = 0; i < pages.length; i++) {
    if (i > 0) pdf.addPage();
    const canvas = await html2canvas(pages[i], { scale: 2, useCORS: true, backgroundColor: '#fff' });
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    // キャンバスのアスペクト比を保ってmmに変換
    const imgH = (canvas.height / canvas.width) * imgW;
    const topMargin = (pageH - imgH) / 2;
    pdf.addImage(imgData, 'JPEG', margin, topMargin > 0 ? topMargin : margin, imgW, imgH);
  }

  pdf.save(fileName);
}

// ===== 印刷 =====
function printEstimate() {
  const iframe = document.getElementById('pdfPreview');
  const doc = iframe.contentDocument || iframe.contentWindow.document;

  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`;
  const name = document.getElementById('recipientName').value.trim() || '';
  const fileName = `【正直屋　お見積書】${dateStr}${name}様`;

  // 親ページのtitleを一時変更（Chromeはこれをファイル名に使う）
  const originalTitle = document.title;
  document.title = fileName;
  doc.title = fileName;

  const style = doc.createElement('style');
  style.textContent = '@page { margin: 12mm 10mm; }';
  doc.head.appendChild(style);

  iframe.contentWindow.focus();
  iframe.contentWindow.print();

  // 印刷ダイアログが閉じた後にtitleを戻す
  setTimeout(() => { document.title = originalTitle; }, 1000);
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
  const proposals = [1, 2, 3, 4, 5].map(n => {
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
  let mail = `${name} 様\n\nこの度は正直屋へお問い合わせをいただき、\n誠にありがとうございます。\n\n以下の通りお見積りおよびご提案をさせていただきます。\nご不明点がございましたらお気軽にご相談ください。\n\n`;
  const numToCircle = n => ['①','②','③','④','⑤'][n-1];

  proposals.forEach((p, i) => {
    mail += `新設商品${numToCircle(i+1)}\n`;
    mail += `${p.productName}\n`;
    mail += `${p.model}\n\n`;
  });

  mail += `【交換費用：税込】\n`;
  proposals.forEach((p, i) => {
    if (p.discount !== 0) {
      mail += `${numToCircle(i+1)}${p.base.toLocaleString()}円 → 最大${Math.abs(p.discount).toLocaleString()}円割引 →${p.total.toLocaleString()}円\n`;
    } else {
      mail += `${numToCircle(i+1)}${p.total.toLocaleString()}円\n`;
    }
    if (p.opts.length) {
      p.opts.forEach(o => { mail += `　※${o.name}（¥${o.price.toLocaleString()}）含む\n`; });
    }
    if (p.comment) mail += `　※${p.comment}\n`;
  });

  const checkedItems = [...document.querySelectorAll('input[name="included"]:checked')].map(el => el.value);
  mail += `\n【交換工事に含まれるもの】\n`;
  checkedItems.forEach(item => { mail += `・${item}\n`; });
  mail += `\n`;
  mail += `※工事価格も上昇傾向ですので、お見積金額の有効期限は、\n「本日より7日間」とさせていただきます。\n\nどうぞよろしくお願いいたします。\n\n【よくある質問】\n○お支払いは？ → 工事完了後の「後払い」に対応しております。\n○工事日程は？ → 下記お申し込みフォームよりご希望を登録後、\n　　　　　　　　　最短日程をご案内いたします。\n\n\n▼お申し込みはこちら\nhttps://1lejend.com/stepmail/kd.php?no=aegiEvXz\n\nご不明点やご相談などございましたら、\nいつでもお気軽にご連絡くださいませ。\nご要望に対しまして、スタッフ一同しっかりと努めてまいります。\n\n今後ともどうぞよろしくお願い申し上げます。\n------------------------------------\n\n【ガス工事の正直屋】\n◆正直屋 本店\n担当　${staff}\n\n愛知県名古屋市千種区内山三丁目31-20 \n今池NMビル4階\nTEL：050-5497-0700（総合コールセンター）\n------------------------------------\n◆正直屋　大阪支店\n\n大阪府堺市堺区旭ヶ丘中町2丁目2-18\n------------------------------------\n◆正直屋 横浜本店\n\n神奈川県横浜市港北区新横浜1-12-1\nソレイユルヴァン2階`;

  document.getElementById('mailBody').textContent = mail;

  // 見積書プレビュー（テンプレートをfetchして差し込む）
  buildEstimatePreviews(proposals, name, staff, existing, fmt(today), fmt(expire), checkedItems);

  document.getElementById('resultCard').classList.add('show');
  document.getElementById('resultCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ===== 見積書プレビュー構築 =====
async function buildEstimatePreviews(proposals, name, staff, existing, issueDate, expireDate, checkedItems) {
  let res;
  try {
    res = await fetch('templates/estimate.html');
  } catch {
    document.getElementById('pdfPreview').srcdoc = '<p style="padding:20px;">テンプレートを読み込めませんでした。</p>';
    return;
  }
  const templateHtml = await res.text();

  const pages = proposals.map((p, i) => {
    const noNum = `No.MTM${String(i + 1).padStart(4, '0')}`;
    let html = templateHtml;

    // 基本情報
    html = html.replace('{{発行日}}', issueDate);
    html = html.replace(/No\.MTM\d+/, noNum);
    html = html.replace('{{担当者}}', staff);
    html = html.replace('{{宛名}}', name);
    html = html.replace('{{有効期限}}', expireDate);
    html = html.replace('{{件名}}', '交換工事のお見積り');

    // お見積金額（ヘッダー部）
    html = html.replace('{{合計金額}}', `¥${p.total.toLocaleString()}-`);

    // 明細テーブル：型式・提案金額
    html = html.replace('{{型式}}', p.model);
    html = html.replace('{{提案金額}}', `¥${p.base.toLocaleString()}`);

    // 追加費用行を動的生成
    const optRows = p.opts.map(o => `
      <tr>
        <td class="col-name">${o.name}</td>
        <td class="col-qty">1</td>
        <td class="col-price">¥${o.price.toLocaleString()}</td>
        <td class="col-note"></td>
      </tr>`).join('');
    html = html.replace(/(<tr class="empty-row">[\s\S]*?<\/tr>\s*)+/, optRows + '\n');

    // 提案機種詳細
    const detailText = p.productName
      ? `${p.productName}<br>品番：${p.model}`
      : `品番：${p.model}`;
    html = html.replace('{{提案詳細}}', detailText);
    html = html.replace('{{既設}}', existing);

    // 右側小計エリア
    const subtotal = p.base + p.optTotal;
    html = html.replace('{{小計}}', `¥${subtotal.toLocaleString()}`);
    html = html.replace('{{合計金額2}}', `¥${p.total.toLocaleString()}`);

    // 割引行：あれば差し替え、なければ行ごと削除
    if (p.discount !== 0) {
      html = html.replace('{{割引額}}', `¥${p.discount.toLocaleString()}`);
    } else {
      html = html.replace(/<div class="subtotal-row discount">[\s\S]*?<\/div>\s*<\/div>\s*<div class="subtotal-row">\s*<span class="row-label"><\/span>[\s\S]*?<\/div>/, '');
    }

    // コメント行
    if (p.comment) {
      html = html.replace(/<!--\s*コメントがある場合のみ[\s\S]*?-->\s*/, `<div class="set-note">★${p.comment}</div>`);
    } else {
      html = html.replace(/<!--\s*コメントがある場合のみ[\s\S]*?-->\s*/, '');
    }

    // セット内容
    const setItemsHtml = (checkedItems || []).map(item => `<div>・${item}</div>`).join('');
    html = html.replace('{{セット内容}}', setItemsHtml);

    return html;
  }).join('<div style="page-break-after:always;"></div>');

  document.getElementById('pdfPreview').srcdoc = pages;
}
