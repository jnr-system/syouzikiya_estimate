# 正直屋 見積書作成アプリ

給湯器交換工事の見積書・メール本文を自動生成するWebアプリ。

## フォルダ構成

```
shouzikiya-estimate/
├── index.html              # メインアプリ
├── README.md               # このファイル
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

- 価格表からタブ区切りで貼り付け → 品名・型式・金額を自動分解
- 追加部材・工事をプルダウンで選択（参照シートの品目を登録済み）
- 割引をプルダウンで選択
- 合計金額のリアルタイム計算
- 提案1〜3のタブ切替
- メール本文の自動生成
- 見積書プレビュー（印刷→PDF保存）

## ConoHaへのデプロイ手順

### 1. Nginxの設定

```nginx
server {
    listen 80;
    server_name estimate.shouzikiya.jp;  # ドメインに合わせて変更

    root /var/www/shouzikiya-estimate;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

### 2. ファイルのアップロード

```bash
# SFTPまたはscpでVPSにアップロード
scp -r ./shouzikiya-estimate/ user@conoha-ip:/var/www/

# パーミッション設定
chmod -R 755 /var/www/shouzikiya-estimate
```

### 3. SSL設定（推奨）

```bash
certbot --nginx -d estimate.shouzikiya.jp
```

## データのメンテナンス

### オプション品目の追加・変更

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

`templates/estimate.html` を直接編集する。

## 今後の拡張予定

- [ ] 見積番号の自動採番（スプシ連携）
- [ ] 生成PDFのGoogle Drive自動保存
- [ ] メール自動送信（Gmail API連携）
- [ ] 商品マスタのスプシ連携（品番入力で自動検索）
