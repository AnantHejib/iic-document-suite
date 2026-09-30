# Free Global Cloud Deployment Guide (Access Across ANY Network)
### Sinhgad Institute of Technology, Lonavala &bull; Institution's Innovation Council (IIC)

This guide shows you how to run and deploy **IIC DocCraft Pro** so that **anyone anywhere in the world on ANY network** (mobile 4G/5G data, home internet, college Wi-Fi) can view, draft, and synchronize letters in real time.

---

## ⚡ Method 1: Instant 1-Click Global Tunnel (Zero Setup, No Accounts Needed)

This is the fastest method to get a live global internet link right now from your laptop:

1. Double-click [**`Launch_Global_Internet_Access.bat`**](file:///c:/Users/User/Desktop/IIC%20DOCUMENT/Launch_Global_Internet_Access.bat).
2. The script starts the server and automatically generates a **Public Global HTTPS URL** (e.g. `https://xxxx.loca.lt`).
3. You will see:
   ```
   ================================================================
     >> GLOBAL PUBLIC HTTPS URL (ANY NETWORK / WORLDWIDE):
     >> https://seven-goats-hug.loca.lt
   ================================================================
   ```
4. **Share that link** with any faculty member or student on WhatsApp, Email, or Slack!
   - Anyone in the world can open that link on their phone, iPad, or laptop.
   - Any letter saved on one device immediately syncs to everyone else!
   - You can also scan the QR code directly from the screen!

---

## ☁️ Method 2: Permanent 24/7 Free Hosting on Render.com (Runs Forever)

If you want the software hosted 24/7 in the cloud without needing your personal laptop to stay on:

1. Push this folder to a GitHub repository (e.g. `github.com/your-username/iic-document-app`).
2. Go to [**Render.com**](https://render.com) (free signup).
3. Click **New +** $\rightarrow$ **Web Service**.
4. Select your GitHub repository.
5. Render will automatically detect the settings from [`render.yaml`](file:///c:/Users/User/Desktop/IIC%20DOCUMENT/render.yaml) & [`Procfile`](file:///c:/Users/User/Desktop/IIC%20DOCUMENT/Procfile):
   - **Environment**: Python
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python server.py`
6. Click **Deploy Web Service**.
7. In ~2 minutes, your official app is live 24/7 at a permanent global URL:
   `https://iic-sit-lonavala.onrender.com`

---

## 🔥 Method 3: Vercel / GitHub Pages + Firebase Realtime Database (Serverless)

If you prefer a 100% serverless cloud database:

1. Go to [**Firebase Console**](https://console.firebase.google.com/) and create a free project (e.g. `iic-sit-doc`).
2. Click **Build** $\rightarrow$ **Realtime Database** $\rightarrow$ **Create Database** (Select *Test mode*).
3. Copy your database URL:
   `https://iic-sit-doc-default-rtdb.firebaseio.com`
4. Open the IIC DocCraft software, click the **Multi-Device Sync badge** in the navbar, paste your Firebase URL, and click **Save Cloud URL**.
5. You can now deploy the frontend to **Vercel** (`npx vercel`) or **GitHub Pages**. All letters will sync across the globe 24/7 with zero server needed!
