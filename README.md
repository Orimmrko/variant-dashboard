# Variant - Admin Dashboard 📊

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)
[![React](https://img.shields.io/badge/React-18-blue?logo=react)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-38bdf8?logo=tailwindcss)](https://tailwindcss.com)

The administration portal for the **Variant** A/B testing platform. This Single Page Application (SPA) allows developers and product managers to create experiments, manage traffic allocation, and visualize real-time analytics.

---

## 🚀 Live Demo

**URL:** [https://variant-dashboard-pied.vercel.app](https://variant-dashboard-pied.vercel.app/)

> **Guest Access:**
> Use the API Key: `guest-key-456`

---

## ✨ Features

* **Experiment Management:** Create, edit, pause, and delete experiments.
* **Traffic Allocation:** Drag-and-drop or input percentage for variant traffic.
* **Real-time Analytics:** Visual charts (Bar/Pie) powered by `Recharts`.
* **Multi-Tenancy:** Manage multiple apps from a single account.
* **Responsive Design:** Built with Tailwind CSS for mobile and desktop support.

## 📸 Screenshots

| Experiment List | Analytics & Graphs |
|:---:|:---:|
| ![Home](screenshots/dashboard_home.png) | ![Stats](screenshots/analytics_view.png) |

---

## 💻 Local Development

To run the dashboard locally, you need Node.js installed.

### 1. Clone & Install
```bash
git clone https://github.com/Orimmrko/variant-dashboard.git
cd variant-dashboard

# Install dependencies
npm install
```

### 2. Configuration
Open `App.jsx` and ensure the `API_BASE_URL` points to your backend (local or production):
```javascript
const API_BASE_URL = "http://localhost:5000"; // For local backend
// OR
const API_BASE_URL = "https://variant-backend-lfoa.onrender.com"; // For prod backend
```

### 3. Run
```bash
npm run dev
```
The app will be available at `http://localhost:5173`.

---

## ☁️ Deployment (Vercel)

The easiest way to deploy this project is via [Vercel](https://vercel.com).

1.  Push this repository to GitHub.
2.  Import the project in Vercel.
3.  Vercel will detect `Vite` automatically.
4.  Click **Deploy**.

---

## 📄 License

This project is licensed under the MIT License.
