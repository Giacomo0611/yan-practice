# 顏真卿原帖習字 PWA v0.1.1

這是手機優先的第一版。目標是：一次顯示一個原帖單字、固定編號、上一字／下一字、記住位置、保存練習紀錄，並可安裝到 Android 手機主畫面。

## 已完成

- 手機全螢幕版面（PWA manifest 使用 `fullscreen`）
- 固定字號：`YQL-0001` 起；既有編號不可重排
- 上一字／下一字按鈕
- 左右滑動切字
- 自動記住上次停留位置
- 「本次練完」建立時間紀錄
- 每字累計練習次數與最後練習時間
- 每字「待加強」標記
- 每字個人備註
- 依固定編號或辨識字跳轉
- 米字格開關
- 黑白反相開關
- Screen Wake Lock（瀏覽器支援時）
- IndexedDB 本機保存
- JSON 備份／還原（優先使用手機分享面板）
- Service Worker 離線快取

## 測試字庫

目前只放少量《顏勤禮碑》原帖裁切座標，用來驗證 UI、編號與紀錄機制。不是完整字庫。

來源影像：Wikimedia Commons `Yan Qinli Stele.jpg`，Public Domain。
https://commons.wikimedia.org/wiki/File:Yan_Qinli_Stele.jpg

重要：目前的 4 個測試字 crop 座標需要在實機上再做一次視覺微調；完整字庫也應改用更高解析度拓本來源，以避免全螢幕放大後失真。

## 本機測試

必須透過 HTTP/HTTPS 開啟，不能直接用 `file://` 測 Service Worker。

```bash
python3 -m http.server 8080
```

瀏覽器開：`http://localhost:8080`

## 手機安裝的最終方式

1. 將此資料夾部署到 HTTPS 靜態網站。
2. Android 手機 Chrome 開啟網址。
3. Chrome 選單選「安裝應用程式」或「加到主畫面」。
4. 首次連網開啟一次，原帖影像快取完成後即可離線使用。

## 後續字庫擴充規則

- 每張原帖字圖／裁切位置都使用永久 ID：`YQL-0001`、`YQL-0002`……
- 新增字只允許新增新 ID，不得重新編號既有資料
- 同一中文字在原帖出現多次時，分配不同永久 ID
- 每筆必須保存：帖名、來源影像、crop 座標或本地字圖路徑、來源版本／授權
- 若某字辨識尚未確認，可先留空 `char`，不得用推測結果冒充已確認字


## v0.1.1 display fix
- Character viewer changed to a square practice stage.
- Added 20% crop safety padding plus 8% inner margin to prevent strokes from touching/crossing the viewer edge.
- Existing fixed IDs and practice records remain compatible.
- Demo library is still only 4 source-verified entries; this release fixes display, not library expansion.
