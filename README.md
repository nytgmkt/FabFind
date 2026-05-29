# VendorMatch

แอปเปรียบเทียบ vendor สำหรับทีมจัดซื้อและการตลาด

## วิธีติดตั้ง

1. Clone โปรเจกต์
   ```bash
   git clone <repo-url>
   cd vendormatch
   ```

2. คัดลอกไฟล์ environment
   ```bash
   cp .env.example .env
   ```

3. เพิ่ม Gemini API Key ในไฟล์ `.env`
   ```
   VITE_GEMINI_API_KEY=your_actual_api_key_here
   ```
   > สามารถขอ API Key ได้ที่ [Google AI Studio](https://aistudio.google.com/app/apikey)

4. ติดตั้ง dependencies
   ```bash
   npm install
   ```

5. รัน development server
   ```bash
   npm run dev
   ```

   เปิดเบราว์เซอร์ที่ `http://localhost:5173`

## Build สำหรับ Production

```bash
npm run build
npm run preview
```

## Tech Stack

- React 18
- Vite 5
- React Router DOM v6
- Google Gemini API (gemini-1.5-flash)
