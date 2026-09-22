# Weather & Safety Intelligence Platform

A real-time meteorology and AI-grounded weather safety application built with **React 19**, **Vite**, **Tailwind CSS v4**, **Express**, and **Google Gemini API**.

---

## 🚀 Quick Start in Visual Studio Code (VS Code)

### 1. Open the Project in VS Code
Unzip the downloaded archive and open the project directory in VS Code:
```bash
code .
```

### 2. Install Recommended VS Code Extensions
When prompted by VS Code in the bottom right corner, click **Install All Recommended Extensions**:
- **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`)
- **Prettier Code Formatter** (`esbenp.prettier-vscode`)
- **ESLint** (`dbaeumer.vscode-eslint`)

### 3. Install Dependencies
Open the built-in terminal in VS Code (`Ctrl + \`` or ``Cmd + \```) and run:
```bash
npm install
```

### 4. Configure Environment Variables
Copy `.env.example` to create `.env`:
```bash
cp .env.example .env
```
Inside `.env`, add your Gemini API key:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### 5. Start Development Server
You have two easy ways to start the project in VS Code:

- **Option A (F5 / Debugging)**:
  Press `F5` or go to the **Run & Debug** tab (`Ctrl+Shift+D` or `Cmd+Shift+D`) and select **"Run Dev Server (Full Stack)"**.
- **Option B (Terminal)**:
  Run:
  ```bash
  npm run dev
  ```

Once running, navigate to [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠️ VS Code Tasks & Shortcuts

- **Start Dev Server**: Press `Ctrl + Shift + B` (Windows/Linux) or `Cmd + Shift + B` (macOS).
- **Typecheck & Lint**: Run `npm run lint` or use the VS Code task `npm: lint`.
- **Production Build**: Run `npm run build` or use the VS Code task `npm: build`.

---

## 📁 Project Structure

```text
├── .vscode/                   # VS Code configuration
│   ├── launch.json            # F5 Debugger profiles (Node server + Chrome)
│   ├── tasks.json             # Build & dev tasks (Ctrl+Shift+B)
│   ├── settings.json          # Workspace settings (Tailwind CSS, formatting)
│   └── extensions.json        # Recommended extension list
│
├── src/
│   ├── App.tsx                # Main application state & two-panel layout
│   ├── components/            # Modular React components
│   │   ├── AIChatView.tsx     # Three-tier weather chat with suggested cards & TTS
│   │   ├── Sidebar.tsx        # Fixed-width weather intelligence panel
│   │   ├── Navbar.tsx         # Top bar with location switcher & theme toggle
│   │   ├── WeatherDashboard.tsx # Live metrics, hourly cards & radar
│   │   ├── ForecastView.tsx   # 7-day forecast & trend curves
│   │   ├── DangerBanner.tsx   # Severe weather warnings banner
│   │   ├── AlertsModal.tsx    # Detailed emergency alerts popup
│   │   ├── LocationModal.tsx  # GPS & city search picker
│   │   ├── NearbyAssistance.tsx # Emergency shelters & hospitals finder
│   │   └── RecommendationsView.tsx # Clothing, travel & activity guidance
│   ├── types/
│   │   └── weather.ts         # TypeScript interfaces & types
│   └── utils/
│       ├── weatherApi.ts      # Open-Meteo & reverse geocoding engine
│       └── safetyEngine.ts    # Threat evaluation & recommendation rules
│
├── server.ts                  # Backend server & Gemini API proxy (Node/Express)
├── vite.config.ts             # Vite configuration with Tailwind CSS plugin
├── package.json               # Dependencies & scripts
└── .env.example               # Environment variable declarations
```
