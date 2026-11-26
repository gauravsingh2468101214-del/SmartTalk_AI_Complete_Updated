# KalpLabs Website + SmartTalk AI Chatbot (complete package)

## Folder
- `website/`      -> KalpLabs website (SmartTalk chatbot isme add hai)
- `smarttalk_ai/` -> aapka SmartTalk project, **bilkul unchanged**
- `RUN_EVERYTHING.bat` -> Windows: double-click, sab kuch ek saath chalu
- `RUN_EVERYTHING.sh`  -> Mac/Linux

## Chalane ka tareeka (Windows)
1. Python 3.10+ (PATH ke saath) aur Node.js LTS install karo.
2. `RUN_EVERYTHING.bat` double-click karo. Pehli baar setup mein kuch minute lagenge (internet chahiye).
3. Browser mein http://127.0.0.1:5173 khulega. Neeche right mein saffron sparkle button = SmartTalk AI chatbot.
4. Chatbot band hai to button ke upar chat mein "Offline" dikhega; backend wali black window check karo.

## Chatbot me ab ye sab hai (website ke SmartTalk widget me)
1. **Mic** - input ke bagal ka mic button dabao, bolo, sawal apne aap chala jata hai (Chrome / Edge).
2. **Bolkar sunana** - har jawab par "Listen" button; ya upar "Auto-read" tick karo. Mic se pucha ho to jawab apne aap bolta hai.
3. **Hindi / English** - upar dropdown se voice + mic ki bhasha chuno.
4. **Pause, Resume, Stop, Mute** - upar ke 4 icon buttons.
5. **Audio & Video Library** - header ka library icon; search + audio/video filter; files `smarttalk_ai/media_library` se aati hain (admin/upload purane SmartTalk page se hota hai).
6. **WhatsApp / Call / Email** - chat ke neeche "Talk to us" buttons; "call me", "whatsapp", "contact" likhne par chat me bhi buttons aate hain. Details `website/src/config.js` (COMPANY) se.

7. **SmartTalk Chatbot naam** - chat ka input box "SmartTalk Chatbot" naam se hai; website ke search (Ctrl+K ya search icon) me sabse upar "Ask SmartTalk Chatbot" option aata hai, jo chatbot kholkar wahi sawal puchta hai.

Badlav sirf `website/src/components/SmartTalkChat.jsx` aur `CommandPalette.jsx` me hua hai. `smarttalk_ai` backend bilkul unchanged hai.
Hindi bolne ke liye device me Hindi voice installed hona chahiye (Android/Windows me aam taur par hoti hai).

## Test sawal
- "Show me case studies" / "XR project examples"
- "Show WA-S108 product details"
- "Compare WA-S108 and WA-S135"

## Live website (internet) ke liye
- `smarttalk_ai` ko VPS/server par chalao aur HTTPS lagao (Nginx/Caddy/Cloudflare). Vercel par ye backend nahi chalega.
- Website build ke time env set karo: `VITE_SMARTTALK_API_URL=https://aapka-chat-domain`
- Live karne se pehle SmartTalk ke SETUP_GUIDE.md ke security notes (HTTPS, rate limit) follow karo.

## Note
Chatbot sirf catalog PDF ke hisaab se jawab deta hai. PDF ke case-study pages 36-54 photo hain, isliye wo category aur page images dikhata hai, individual client/project naam guess nahi karta.
