# 家計簿アプリ

在米日本人向け家計簿PWA。Tria通知・CSV・レシートOCRで自動取り込み。

## セットアップ

```bash
# 1. 依存インストール
npm install

# 2. 環境変数設定
cp .env.example .env.local
# .env.local を編集

# 3. Vercel KV 作成
# Vercel Dashboard → Storage → Create KV Database

# 4. ローカル起動
vercel dev

# 5. デプロイ
vercel --prod
```

## Vercel KV セットアップ

1. Vercel Dashboard → プロジェクト → Storage
2. "Create Database" → KV
3. `.env.local` に URL と Token を貼り付け

## iOSショートカット設定

アプリ内「設定」タブを参照。

## ファイル構成

```
api/
  _kv.js           # KVヘルパー
  webhook.js       # Tria通知受信
  transactions.js  # CRUD
  summary.js       # 月次集計
  receipt.js       # レシートOCR
  csv-import.js    # CSV取り込み
src/
  pages/
    Home.jsx       # ホーム（支出合計・履歴）
    Detail.jsx     # カテゴリ別グラフ
    Add.jsx        # 手動/レシート/CSV追加
    Settings.jsx   # ショートカット設定ガイド
  components/
    Nav.jsx        # ボトムナビ
    TxItem.jsx     # トランザクション行
  hooks/
    useTransactions.js
  utils/
    api.js
    format.js
```
