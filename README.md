# Production-Ready cPanel-Compatible Node.js Web Application
### Runtime Environment: **Node.js v22.18.0 (Mandated)**
### Server Engine: **Express.js + Phusion Passenger**

---

## 📋 Overview

This application is built for high-performance deployment on shared cPanel web hosting platforms running CloudLinux **Phusion Passenger**. It provides full-stack AI model routing, dynamic user session persistence, website compilation, and REST API access.

---

## 🏗️ Project Architecture

```
├── app.js                 # Main cPanel Passenger entry point (CommonJS)
├── server.ts              # Express application logic & API endpoints
├── package.json           # Dependencies & Node.js 22.18.0 engine declaration
├── .htaccess              # cPanel Passenger directive routing
├── .env.example           # Template for environment variables
├── data/                  # Local persistent JSON database storage (`aurum_db.json`)
├── src/                   # React + Vite frontend application
│   ├── App.tsx            # Main frontend user workspace
│   ├── components/        # Frontend components
│   └── lib/               # Authentication & client utilities
├── server/
│   └── localDb.ts         # Persistent file-backed database layer
└── dist/                  # Compiled production static bundle & server.cjs
```

---

## 🚀 Step-by-Step cPanel Deployment Guide

### Step 1: Prepare the Build Archive
On your local machine or build workspace, compile the static bundle and server code:
```bash
npm run build
```
This generates the `dist/` directory containing `index.html`, static assets, and `dist/server.cjs`.

Zip the project files (**including** `app.js`, `package.json`, `dist/`, `data/`, `.htaccess`, and `.env`).

---

### Step 2: Upload Files in cPanel File Manager
1. Log into your cPanel account.
2. Open **File Manager** and navigate to your application root (e.g., `public_html` or a subfolder like `public_html/app`).
3. Upload the project zip archive and extract all contents into the application folder.

---

### Step 3: Configure Node.js Application in cPanel
1. In cPanel, locate and click on **Setup Node.js App**.
2. Click **Create Application**.
3. Fill in the following mandatory parameters:
   - **Node.js version**: Select **`22.18.0`** (or `22.x`).
   - **Application mode**: Select **`Production`**.
   - **Application root**: Enter your application directory (e.g., `public_html` or `public_html/app`).
   - **Application URL**: Select your domain/subdomain.
   - **Application startup file**: Enter **`app.js`**.
4. Click **Create**.

---

### Step 4: Configure Environment Variables
In the cPanel **Setup Node.js App** interface, scroll down to **Environment variables** and add:
- `NODE_ENV` = `production`
- `PORT` = `3000` (Passenger will bind this dynamically)
- `VYCE_API_KEY` = `sk-385822fcac9c0355680ccadd2a4288b474a2fb69c05f05c9`
- `VYCE_BACKUP_KEY` = `sk-9372b64064b092d9b2fbc8ad4b5d2f292ebb6ab0163f9bcf`

---

### Step 5: Install Dependencies via cPanel
1. In the **Setup Node.js App** page, click the **Run npm install** button.
2. cPanel will automatically install all production dependencies defined in `package.json`.

---

### Step 6: Restart the Application
Click **Restart Application** in cPanel. Your application is now live and serving requests!

---

## 🛠️ Troubleshooting Common cPanel Startup Issues

- **`500 Internal Server Error`**:
  - Check the cPanel error logs located in File Manager under `stderr.log` or `error_log`.
  - Ensure `dist/server.cjs` exists (run `npm run build` locally before uploading).
- **Hardcoded Port Collision**:
  - Ensure `process.env.PORT` is used without hardcoding fixed ports.
- **Node.js Version Mismatch**:
  - Verify that Node.js **22.18.0** is selected in cPanel Node.js App settings.

---

## 🔒 Security Practices
- Environment variables are isolated from public client code.
- File system permissions write persistent data safely to the isolated `/data` directory.
- Input fields sanitize output against injection and script attacks.
