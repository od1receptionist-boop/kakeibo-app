# 家計簿アプリ (Kakeibo) - CLAUDE.md

## プロジェクト概要
在米日本人向け家計簿PWA。流動資産の自動取り込みと月次支出把握が目的。
手動入力を極限まで減らし、通知・CSV・レシート撮影で自動登録する。

## オーナー情報
- 居住地: Costa Mesa / Fountain Valley, California
- 主な通貨: USD（一部JPY）
- 使用決済: Tria カード / クレカ / PayPay / 現金

---

## 技術スタック

### フロントエンド
- React（PWA）
- manifest.json + Service Worker → iOSホーム画面追加でアプリ化
- スマホ（iOS Safari）最適化必須

### バックエンド
- Vercel API Routes（/api/以下）
- Vercel KV → トランザクション保存（MVPはここだけ、Supabaseは不要）
- MVP後にSupabase移行予定

### AI
- Claude API（claude-sonnet-4-20250514）→ レシートOCR・カテゴリ自動分類
- APIキーはSuit Youと同じ環境変数（ANTHROPIC_API_KEY）

### 認証
- MVP: なし（個人使用前提、URLで運用）
- Phase2以降: Supabase Auth

---

## API設計

```
/api/webhook          POST  iOSショートカットからの通知データ受信
/api/transactions     GET   トランザクション一覧取得
/api/transactions     POST  手動トランザクション追加
/api/receipt          POST  レシート画像 → Claude OCR → トランザクション返却
/api/csv-import       POST  クレカ・PayPay CSV取り込み
/api/summary          GET   月次集計データ
```

---

## データ構造

### トランザクション（Vercel KV）
```json
{
  "id": "uuid",
  "date": "2026-06-08",
  "amount": 8.19,
  "currency": "USD",
  "merchant": "IN-N-OUT COSTA MESA 2",
  "category": "food",
  "source": "tria_notification | manual | csv | receipt_ocr",
  "raw": "元の通知テキスト or レシート全文",
  "createdAt": "ISO8601"
}
```

### カテゴリ一覧
food / transport / shopping / entertainment / health / education / housing / other

---

## iOSショートカット連携（Triaカード通知）

### 仕組み
1. iOSの「オートメーション」→ Triaアプリの通知をトリガー
2. 通知テキストをWebhookで `/api/webhook` に送信
3. API側でパース → Vercel KVに保存

### 通知フォーマット（Tria）
```
"39.56 USD Triaカードで支払い"
"UBER * EATS PENDING"
"🎉 0.39 USDのキャッシュバックを獲得しました！"
```

### パース仕様
- 1行目: `amount + currency + "Triaカードで支払い"` → amount/currency抽出
- 2行目: merchant名
- キャッシュバック行は除外
- PENDING付きは `isPending: true` フラグ

---

## レシートOCR（Claude API）

### プロンプト方針
- 画像をbase64でClaude APIに送信
- 抽出項目: 日付・合計金額・通貨・店舗名・主要品目（任意）
- レスポンスは必ずJSON形式で返す
- 日本語レシート・英語レシート両対応

### プロンプトテンプレート
```
レシート画像から以下をJSONで抽出してください。
{
  "date": "YYYY-MM-DD",
  "amount": 数値,
  "currency": "USD or JPY",
  "merchant": "店舗名",
  "items": ["品目1", "品目2"] // 任意
}
不明な場合はnullを入れる。JSONのみ返す。
```

---

## CSV取り込み仕様

### PayPay
- PayPayアプリ → 明細 → CSVエクスポート
- 列: 日付 / 支払先 / 金額 / 種別

### クレカ（汎用）
- 列: 日付 / 内容 / 金額 / 通貨
- 文字コード: UTF-8 or Shift-JIS（両対応）

---

## デザイン方針

### コンセプト
「数字が主役」。シンプルで見やすい、家計管理に集中できるUI。

### カラー
- bg: #0F0F0F（ダークモード基調 → 夜の確認が多い想定）
- surface: #1A1A1A
- accent: #4ADE80（支出マイナス→赤 #F87171、収入プラス→緑）
- text: #F5F5F5

### フォント
- 数字: JetBrains Mono（金額の視認性）
- UI: Inter
- 日本語: Noto Sans JP

### 主要画面
1. **ホーム** → 今月の支出合計 + 直近トランザクション
2. **詳細** → 月別・カテゴリ別グラフ
3. **追加** → 手動入力 / レシート撮影 / CSV取り込み
4. **設定** → ショートカット設定ガイド / 予算設定

---

## 開発フェーズ

### Phase 1 - MVP（Vercel + React PWA）
- [ ] Webhookエンドポイント（Tria通知受信）
- [ ] Vercel KV セットアップ
- [ ] トランザクション一覧表示
- [ ] 手動追加フォーム
- [ ] 月次集計表示

### Phase 2 - 自動化強化
- [ ] レシートOCR
- [ ] CSV取り込み
- [ ] カテゴリ自動分類（Claude API）

### Phase 3 - モバイルApp移行
- [ ] Flutter実装（iOS）
- [ ] Supabaseに移行（DB + Auth）
- [ ] プッシュ通知

---

## 環境変数
```
ANTHROPIC_API_KEY=     # Claude API（Suit Youと共通可）
KV_REST_API_URL=       # Vercel KV
KV_REST_API_TOKEN=     # Vercel KV
```

---

## 開発コマンド
```bash
vercel dev        # ローカル起動
vercel --prod     # 本番デプロイ
```

## 注意事項
- Vercel KVのキー設計: `tx:{YYYY-MM}:{uuid}` で月ごとに取得しやすく
- 金額は必ずfloatで保存（intにしない）
- USD/JPY混在するため必ずcurrencyフィールドを持たせる
- iOSショートカットのWebhookはBasic認証か固定トークンで保護する
