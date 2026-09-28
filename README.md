# 🚗 DriveEasy – Road Trip Planner

A modern, responsive road trip planning web application.

---


```
DriveEasy/
├── index.html     ← Main HTML (all pages in one file, SPA style)
├── style.css      ← All styles (dark/light themes, responsive)
├── react.js       ← All JavaScript (Maps, Places, Weather, etc.)
└── README.md      ← This file
```

---

## 🔑 Google Maps API Setup

### Step 1 – Create an API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Navigate to **APIs & Services → Library**
4. Enable these APIs:
   - ✅ Maps JavaScript API
   - ✅ Places API
   - ✅ Directions API
   - ✅ Geocoding API
5. Go to **APIs & Services → Credentials**
6. Click **Create Credentials → API Key**
7. Copy your API key

### Step 2 – Add the Key
Open `index.html` and find this line near the bottom:

```html
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places,geometry&callback=initMaps" async defer></script>
```

Replace `YOUR_API_KEY` with your actual key:

```html
<script src="https://maps.googleapis.com/maps/api/js?key=AIzaSy...YOUR_KEY_HERE...&libraries=places,geometry&callback=initMaps" async defer></script>
```

### Step 3 – Restrict Your Key (Recommended)
In Google Cloud Console → Credentials → your key:3
- **Application restrictions**: HTTP referrers
- Add your domain: `https://yourdomain.com/*`

---

## 🌤️ Weather API
No setup needed! The app uses [Open-Meteo](https://open-meteo.com/) — a **completely free, no-key** weather API.

---

## 🚀 Running the App

Simply open `index.html` in any modern browser, or serve with a local server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js (npx)
npx serve .

# Using VS Code
Install "Live Server" extension → Right-click index.html → Open with Live Server
```

---

## ✨ Features

| Feature | Status |
|---|---|
| Route planning with Google Maps | ✅ |
| Distance & travel time | ✅ |
| Roadmap / Satellite / Terrain views | ✅ |
| Nearby Hotels, Fuel, Restaurants, Car Service | ✅ |
| Place details with ratings & open/closed | ✅ |
| Dark / Light mode | ✅ |
| Fuel cost estimator | ✅ |
| Save trips locally (localStorage) | ✅ |
| Destination weather (free API) | ✅ |
| Responsive mobile design | ✅ |
| Smooth animations & scroll reveal | ✅ |
| Contact form | ✅ |

---

## 📱 Browser Support
Chrome, Firefox, Safari, Edge — all modern browsers.

---

## 📝 Notes
- Nearby Places requires browser location permission
- The demo hero image loads from Unsplash CDN (internet required)
- Maps require a valid Google API key to function
