# 正直屋 見積書作成アプリ

給湯器交換工事の見積書・メール本文を自動生成するWebアプリ。

## フォルダ構成

```
syouzikiya_estimate/
├── app.py                  # Flask配信用エントリポイント
├── index.html              # メインアプリ
├── README.md               # このファイル
├── requirements.txt        # Python依存関係
├── assets/
│   ├── style.css           # スタイル
│   ├── app.js              # JavaScript
│   └── stamp.png           # 角印画像
├── templates/
│   └── estimate.html       # 見積書HTMLテンプレート
└── data/
    └── options.json        # オプション・割引マスタ
```

## 機能

- **価格表貼り付け解析**：タブ区切りで「品名・型式・金額」を貼り付けると自動分解し、提案１に反映
- **提案タブ**：提案１〜５のタブ切替（型式を入力した提案のみ生成対象）
- **追加部材・追加工事**：プルダウンで選択・追加（重複防止あり）
- **割引選択**：プルダウンで割引種別を選択
- **合計金額リアルタイム計算**：本体＋追加合計＋割引を即時反映
- **交換工事に含まれるもの**：チェックボックスで選択（標準セットはデフォルトON）
- **メール本文自動生成**：提案内容・交換費用・署名を含む完全なメール文を生成・コピー
- **見積書PDF保存**：「PDFとして保存」ボタンで直接ダウンロード（ファイル名：`【正直屋　お見積書】YYYYMMDD顧客名様.pdf`）

## 起動方法

### ローカル確認

```bash
cd syouzikiya_estimate
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 app.py
```

ブラウザで `http://127.0.0.1:5000` を開く。

### 本番常駐起動（gunicorn）

```bash
cd /root/project/syouzikiya_estimate
pip install -r requirements.txt
gunicorn --workers 2 --bind 0.0.0.0:5000 app:app
```

## メール本文の構成

1. 冒頭文
2. 新設商品①〜⑤（品名・型式）
3. 【交換費用：税込】（割引前→割引後）
4. 【交換工事に含まれるもの】（チェックボックスで選択した項目）
5. 有効期限注意書き
6. よくある質問・お申し込みフォームURL
7. 署名（担当者名・各店舗情報）

## データのメンテナンス

### オプション品目・割引の追加・変更

`data/options.json` を編集する。

```json
{
  "options": [
    {"name": "品目名", "price": 金額},
    ...
  ],
  "discounts": [
    {"name": "割引名", "price": -金額},
    ...
  ]
}
```

### 見積書テンプレートの変更

`templates/estimate.html` を直接編集する。プレースホルダーは `{{変数名}}` 形式。

| プレースホルダー | 内容 |
|---|---|
| `{{発行日}}` | 発行日 |
| `{{担当者}}` | 担当者名 |
| `{{宛名}}` | 顧客名 |
| `{{有効期限}}` | 有効期限（発行日+7日） |
| `{{件名}}` | 件名（固定：交換工事のお見積り） |
| `{{合計金額}}` | ヘッダー部の合計金額 |
| `{{型式}}` | 給湯器型式 |
| `{{提案金額}}` | 本体金額 |
| `{{提案詳細}}` | 提案機種詳細テキスト |
| `{{既設}}` | 既設機種 |
| `{{小計}}` | 本体＋追加の小計 |
| `{{割引額}}` | 割引額 |
| `{{合計金額2}}` | フッター部の合計金額 |
| `{{セット内容}}` | 交換工事に含まれるもの |

## サーバー公開のおすすめ構成

このアプリは実体としては静的ファイル中心ですが、現在のサーバー運用に合わせて `Flask + gunicorn + Nginx` で公開しています。既存VPSの他アプリと足並みを揃える場合はこちらが扱いやすいです。

社員が同時にアクセスできるようにするには、次のいずれかで公開します。

- 社内LAN内だけで使う：サーバーIP + ポートで公開
- 社外からも使う：独自ドメイン + SSL で公開

### Nginxで公開する手順

### 1. Nginxの設定

```nginx
server {
    listen 80;
    server_name estimate.shouzikiya.jp;

    root /var/www/syouzikiya_estimate;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

### 2. ファイルのアップロード

```bash
scp -r ./syouzikiya_estimate/ user@conoha-ip:/var/www/

chmod -R 755 /var/www/syouzikiya_estimate
```

### 3. SSL設定（推奨）

```bash
certbot --nginx -d estimate.shouzikiya.jp
```

### 運用メモ

- `data/options.json` を更新すると、追加部材や割引の内容を変更できる
- `templates/estimate.html` を更新すると、見積書レイアウトを変更できる
- `fetch()` を使っているため、`index.html` をPCで直接開くのではなく、必ずHTTPサーバー経由で利用する
- 外部公開する場合は、必要に応じて `Basic認証` か `VPN/社内IP制限` の追加を推奨

## 今後の拡張予定

- [ ] 見積番号の自動採番（スプシ連携）
- [ ] 生成PDFのGoogle Drive自動保存
- [ ] メール自動送信（Gmail API連携）
- [ ] 商品マスタのスプシ連携（品番入力で自動検索）
