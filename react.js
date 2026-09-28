/* ============================================
   DriveEasy – Main JavaScript
   Handles: Maps, Routing, Nearby Places,
   Weather, Fuel Calc, Saved Trips, Dark Mode
   ============================================ */

// ==========================================
// GLOBAL STATE
// ==========================================
let mainMap, nearbyMap;
let directionsService, directionsRenderer;
let placesService, nearbyPlacesService;
let routeDistanceKm = 0;
let currentNearbyType = 'lodging';
let nearbyMarkers = [];
let infoWindows = [];
let userLocation = null;

// ==========================================
// GOOGLE MAPS INIT CALLBACK
// Called automatically when Maps API loads
// ==========================================
function initMaps() {
    // Default center: India
    const defaultCenter = { lat: 20.5937, lng: 78.9629 };

    // --- Main Trip Planner Map ---
    mainMap = new google.maps.Map(document.getElementById('map'), {
        center: defaultCenter,
        zoom: 5,
        mapTypeId: 'roadmap',
        styles: getMapStyles('light'),
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        mapTypeControl: false, // We have custom switcher
    });

    // --- Nearby Map ---
    nearbyMap = new google.maps.Map(document.getElementById('nearbyMap'), {
        center: defaultCenter,
        zoom: 13,
        mapTypeId: 'roadmap',
        styles: getMapStyles('light'),
        disableDefaultUI: false,
        streetViewControl: false,
        mapTypeControl: false,
    });

    // Initialize Directions API
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
        map: mainMap,
        polylineOptions: { strokeColor: '#1a6b3c', strokeWeight: 5 },
        suppressMarkers: false,
    });

    // Initialize Places Service (uses nearbyMap for billing)
    nearbyPlacesService = new google.maps.places.PlacesService(nearbyMap);

    // Autocomplete for trip planner inputs
    setupAutocomplete('startLocation');
    setupAutocomplete('endLocation');

    // Hide loading spinner
    document.getElementById('mapLoading').classList.add('hidden');

    // Try to get user location for nearby map
    getUserLocation();

    console.log('✅ Google Maps initialized');
}

// ==========================================
// AUTOCOMPLETE SETUP
// ==========================================
function setupAutocomplete(inputId) {
    const input = document.getElementById(inputId);
    const autocomplete = new google.maps.places.Autocomplete(input, {
        types: ['geocode', 'establishment'],
    });
    autocomplete.setFields(['formatted_address', 'geometry', 'name']);
}

// ==========================================
// GET USER LOCATION
// ==========================================
function getUserLocation(callback) {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            nearbyMap.setCenter(userLocation);
            nearbyMap.setZoom(14);
            if (callback) callback(userLocation);
        },
        (err) => console.warn('Geolocation error:', err)
    );
}

// ==========================================
// PLAN ROUTE
// ==========================================
document.getElementById('planRoute').addEventListener('click', () => {
    const start = document.getElementById('startLocation').value.trim();
    const end = document.getElementById('endLocation').value.trim();

    if (!start || !end) {
        showToast('⚠️ Please enter both start and destination.');
        return;
    }

    showToast('🗺️ Calculating route…');

    const request = {
        origin: start,
        destination: end,
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.METRIC,
    };

    directionsService.route(request, (result, status) => {
        if (status === 'OK') {
            directionsRenderer.setDirections(result);

            const leg = result.routes[0].legs[0];
            const distText = leg.distance.text;
            const durationText = leg.duration.text;
            routeDistanceKm = leg.distance.value / 1000; // convert meters → km

            // Update UI
            document.getElementById('routeDistance').textContent = distText;
            document.getElementById('routeDuration').textContent = durationText;
            document.getElementById('routeInfo').style.display = 'flex';
            document.getElementById('fuelCalc').style.display = 'block';
            document.getElementById('saveTripSection').style.display = 'block';

            // Fetch weather for destination
            fetchWeather(end);

            showToast(`✅ Route found! ${distText} · ${durationText}`);
        } else {
            showToast(`❌ Could not find route: ${status}`);
        }
    });
});

// ==========================================
// LOCATE ME BUTTON
// ==========================================
document.getElementById('locateMe').addEventListener('click', () => {
    getUserLocation((loc) => {
        // Reverse geocode to get address
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: loc }, (results, status) => {
            if (status === 'OK' && results[0]) {
                document.getElementById('startLocation').value = results[0].formatted_address;
                showToast('📍 Location detected!');
            }
        });
    });
});

// ==========================================
// MAP TYPE SWITCHER
// ==========================================
document.querySelectorAll('.map-type-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.map-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const type = btn.dataset.type;
        mainMap.setMapTypeId(type);
    });
});

// ==========================================
// FUEL COST CALCULATOR
// ==========================================
document.getElementById('calcFuel').addEventListener('click', () => {
    if (!routeDistanceKm) { showToast('⚠️ Plan a route first!'); return; }

    const mileage = parseFloat(document.getElementById('fuelEfficiency').value) || 15;
    const price = parseFloat(document.getElementById('fuelPrice').value) || 100;
    const litres = routeDistanceKm / mileage;
    const cost = litres * price;

    document.getElementById('fuelCost').textContent = `₹${cost.toFixed(0)} (~${litres.toFixed(1)}L)`;
    showToast(`⛽ Fuel cost: ₹${cost.toFixed(0)} for ${routeDistanceKm.toFixed(1)} km`);
});

// ==========================================
// SAVE & LOAD TRIPS (localStorage)
// ==========================================
document.getElementById('saveTrip').addEventListener('click', () => {
    const start = document.getElementById('startLocation').value.trim();
    const end = document.getElementById('endLocation').value.trim();
    if (!start || !end) return;

    const trips = getSavedTrips();
    const trip = {
        id: Date.now(),
        start,
        end,
        distance: document.getElementById('routeDistance').textContent,
        duration: document.getElementById('routeDuration').textContent,
        savedAt: new Date().toLocaleDateString(),
    };
    trips.push(trip);
    localStorage.setItem('driveeasy_trips', JSON.stringify(trips));
    renderSavedTrips();
    showToast('📌 Trip saved!');
});

function getSavedTrips() {
    try { return JSON.parse(localStorage.getItem('driveeasy_trips')) || []; } catch { return []; }
}

function renderSavedTrips() {
    const trips = getSavedTrips();
    const list = document.getElementById('savedTripsList');
    if (!trips.length) { list.innerHTML = '<p style="color:var(--text-muted);font-size:0.82rem">No saved trips yet.</p>'; return; }

    list.innerHTML = trips.map(t => `
    <div class="saved-trip-item" onclick="loadSavedTrip('${escapeHTML(t.start)}','${escapeHTML(t.end)}')">
      <div>
        <strong>${escapeHTML(t.start)}</strong> → ${escapeHTML(t.end)}<br>
        <small style="color:var(--text-muted)">${t.distance || ''} · ${t.savedAt}</small>
      </div>
      <button onclick="event.stopPropagation(); deleteSavedTrip(${t.id})" title="Delete"><i class="fas fa-trash"></i></button>
    </div>
  `).join('');
}

function loadSavedTrip(start, end) {
    document.getElementById('startLocation').value = start;
    document.getElementById('endLocation').value = end;
    document.getElementById('planRoute').click();
    document.getElementById('planner').scrollIntoView({ behavior: 'smooth' });
}

function deleteSavedTrip(id) {
    const trips = getSavedTrips().filter(t => t.id !== id);
    localStorage.setItem('driveeasy_trips', JSON.stringify(trips));
    renderSavedTrips();
    showToast('🗑️ Trip removed.');
}

function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
}

// Render saved trips on load
renderSavedTrips();

// ==========================================
// WEATHER API (Open-Meteo – FREE, no key needed)
// ==========================================
async function fetchWeather(location) {
    document.getElementById('weatherCard').style.display = 'block';
    document.getElementById('weatherInfo').innerHTML = '<span style="opacity:0.8">Fetching weather…</span>';

    try {
        // Geocode location to get lat/lng
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`);
        const geoData = await geoRes.json();
        if (!geoData.results ? .length) throw new Error('Location not found');

        const { latitude, longitude, name, country } = geoData.results[0];

        // Fetch weather
        const wxRes = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=relativehumidity_2m&timezone=auto`
        );
        const wxData = await wxRes.json();
        const cw = wxData.current_weather;

        const desc = getWeatherDesc(cw.weathercode);
        const windDir = degToCompass(cw.winddirection);

        document.getElementById('weatherInfo').innerHTML = `
      <strong>${cw.temperature}°C</strong><br>
      ${desc} · Wind: ${cw.windspeed} km/h ${windDir}<br>
      <small style="opacity:0.8">${name}, ${country}</small>
    `;
    } catch (err) {
        document.getElementById('weatherInfo').innerHTML = 'Could not fetch weather data.';
        console.warn('Weather error:', err);
    }
}

/** WMO weather code → description */
function getWeatherDesc(code) {
    const codes = {
        0: 'Clear Sky',
        1: 'Mainly Clear',
        2: 'Partly Cloudy',
        3: 'Overcast',
        45: 'Foggy',
        48: 'Icy Fog',
        51: 'Light Drizzle',
        53: 'Moderate Drizzle',
        55: 'Heavy Drizzle',
        61: 'Slight Rain',
        63: 'Moderate Rain',
        65: 'Heavy Rain',
        71: 'Slight Snow',
        73: 'Moderate Snow',
        75: 'Heavy Snow',
        80: 'Slight Showers',
        81: 'Moderate Showers',
        82: 'Violent Showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm w/ Hail',
        99: 'Thunderstorm w/ Heavy Hail',
    };
    return codes[code] || 'Unknown';
}

function degToCompass(deg) {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(deg / 45) % 8];
}

// ==========================================
// NEARBY PLACES
// ==========================================
document.querySelectorAll('.cat-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentNearbyType = btn.dataset.type;
        searchNearby();
    });
});

function searchNearby() {
    if (!userLocation) {
        // Ask for location
        getUserLocation((loc) => {
            doNearbySearch(loc);
        });
        showToast('📍 Getting your location…');
        return;
    }
    doNearbySearch(userLocation);
}

function doNearbySearch(location) {
    showToast(`🔍 Searching for ${currentNearbyType.replace('_',' ')}…`);

    // Clear existing markers
    clearMarkers(nearbyMarkers);
    nearbyMarkers = [];
    closeInfoWindows();

    const request = {
        location: new google.maps.LatLng(location.lat, location.lng),
        radius: 5000, // 5 km
        type: currentNearbyType,
    };

    nearbyPlacesService.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results.length) {
            nearbyMap.setCenter(location);
            nearbyMap.setZoom(13);
            renderPlacesCards(results);
            results.slice(0, 15).forEach(place => addPlaceMarker(place));
            showToast(`✅ Found ${results.length} places nearby`);
        } else {
            document.getElementById('placesList').innerHTML =
                `<div class="places-placeholder"><i class="fas fa-search"></i><p>No places found nearby. Try a different category or location.</p></div>`;
            showToast('⚠️ No nearby places found.');
        }
    });
}

function addPlaceMarker(place) {
    if (!place.geometry ? .location) return;

    const marker = new google.maps.Marker({
        position: place.geometry.location,
        map: nearbyMap,
        title: place.name,
        animation: google.maps.Animation.DROP,
        icon: {
            url: 'https://maps.gstatic.com/mapfiles/ms2/micons/green-dot.png',
            scaledSize: new google.maps.Size(32, 32),
        },
    });

    const iw = new google.maps.InfoWindow({
                content: `<div style="max-width:220px;font-family:'DM Sans',sans-serif">
      <strong>${place.name}</strong><br>
      ${place.vicinity || ''}<br>
      ${place.rating ? `⭐ ${place.rating}` : ''}
      ${place.opening_hours?.open_now != null ? (place.opening_hours.open_now ? ' · <span style="color:green">Open</span>' : ' · <span style="color:red">Closed</span>') : ''}
    </div>`,
  });

  marker.addListener('click', () => {
    closeInfoWindows();
    iw.open(nearbyMap, marker);
    infoWindows.push(iw);
  });

  nearbyMarkers.push(marker);
}

function renderPlacesCards(places) {
  const list = document.getElementById('placesList');
  list.innerHTML = '';

  places.slice(0, 12).forEach((place, i) => {
    const isOpen = place.opening_hours?.open_now;
    const statusClass = isOpen == null ? 'unknown' : isOpen ? 'open' : 'closed';
    const statusText  = isOpen == null ? 'Status unknown' : isOpen ? 'Open Now' : 'Closed';

    const card = document.createElement('div');
    card.className = 'place-card';
    card.style.animationDelay = `${i * 0.05}s`;
    card.innerHTML = `
      <div class="place-card-header">
        <div class="place-name">${escapeHTML(place.name)}</div>
        ${place.rating ? `<div class="place-rating">⭐ ${place.rating}</div>` : ''}
      </div>
      <div class="place-address">${escapeHTML(place.vicinity || 'Address not available')}</div>
      <span class="place-status ${statusClass}">${statusText}</span>
    `;

    // Click card → pan map to that marker
    card.addEventListener('click', () => {
      if (nearbyMarkers[i]) {
        nearbyMap.panTo(nearbyMarkers[i].getPosition());
        nearbyMap.setZoom(16);
        google.maps.event.trigger(nearbyMarkers[i], 'click');
      }
    });

    list.appendChild(card);
  });
}

function clearMarkers(markers) {
  markers.forEach(m => m.setMap(null));
}

function closeInfoWindows() {
  infoWindows.forEach(iw => iw.close());
  infoWindows = [];
}

// ==========================================
// DARK / LIGHT MODE
// ==========================================
const themeToggle = document.getElementById('themeToggle');
const themeIcon   = document.getElementById('themeIcon');

// Load saved theme preference
const savedTheme = localStorage.getItem('driveeasy_theme') || 'light';
applyTheme(savedTheme);

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next    = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('driveeasy_theme', next);
});

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';

  // Update map styles if maps are initialized
  if (mainMap)   mainMap.setOptions({ styles: getMapStyles(theme) });
  if (nearbyMap) nearbyMap.setOptions({ styles: getMapStyles(theme) });
}

/** Returns Google Maps style array for light/dark themes */
function getMapStyles(theme) {
  if (theme !== 'dark') return [];
  return [
    { elementType: 'geometry', stylers: [{ color: '#1a2e1a' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#9abf9a' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1a0d' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a4a2a' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a2e1a' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3d7a3d' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a1f2e' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#152a15' }] },
    { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1e3c1e' }] },
    { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#2a4a2a' }] },
    {feactureType:'truckdriver',elementType:'geometry',stylers:[{color:'blue'}]}
    {feactureType:'busdriver',elementType:'geometry',stylers:[{color:'#1a2e1a'}]},

];
}

// ==========================================
// NAVBAR SCROLL EFFECT & MOBILE MENU
// ==========================================
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  navbar.classList.toggle('scrolled', window.scrollY > 20);

  // Active nav link based on section
  const sections = ['home','planner','nearby','contact'];
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const link = document.querySelector(`.nav-link[href="#${id}"]`);
    if (link) link.classList.toggle('active', rect.top <= 80 && rect.bottom > 80);
  });
});

document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('navLinks').classList.toggle('open');
});

// Close mobile menu when a link is clicked
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    document.getElementById('navLinks').classList.remove('open');
  });
});

// ==========================================
// CONTACT FORM
// ==========================================
document.getElementById('contactForm').addEventListener('submit', (e) => {
  e.preventDefault();
  // Simulate sending
  const btn = e.target.querySelector('button[type="submit"]');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending…';
  btn.disabled = true;

  setTimeout(() => {
    document.getElementById('formSuccess').style.display = 'flex';
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
    btn.disabled = false;
    e.target.reset();
    showToast('✅ Message sent successfully!');
  }, 1500);
});

// ==========================================
// SCROLL REVEAL ANIMATION
// ==========================================
const revealObserver = new IntersectionObserver(
  (entries) => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); revealObserver.unobserve(e.target); }
  }),
  { threshold: 0.12 }
);

// Apply reveal class to sections
document.querySelectorAll('.section-header, .planner-panel, .map-wrapper, .contact-grid, .category-tabs').forEach(el => {
  el.classList.add('reveal');
  revealObserver.observe(el);
});

// ==========================================
// TOAST NOTIFICATION
// ==========================================
let toastTimer;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

// ==========================================
// SMOOTH SCROLL for anchor links
// ==========================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const targetId = this.getAttribute('href').slice(1);
    const target   = document.getElementById(targetId);
    if (target) {
      e.preventDefault();
      const offset = 72; // navbar height
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

// ==========================================
// ERROR HANDLER: If Maps API fails to load
// ==========================================
window.gm_authFailure = function() {
  document.getElementById('mapLoading').innerHTML =
    `<div style="text-align:center;padding:20px;color:#dc2626">
      <i class="fas fa-exclamation-triangle" style="font-size:2rem;margin-bottom:12px"></i>
      <p><strong>Maps API Error</strong></p>
      <p style="font-size:0.85rem;margin-top:8px">Please add your Google Maps API key in index.html</p>
    </div>`;
};

console.log('🚗 DriveEasy v1.0 – Ready to roll!');