const API_BASE_URL = 'https://api.open-meteo.com/v1';
const GEOCODING_API_URL = 'https://geocoding-api.open-meteo.com/v1';

let currentLocation = null;
let weatherData = null;
let selectedDay = 0;

let tempIsMetric = true;
let windIsMetric = true;
let precipIsMetric = true;

const weatherIcons = {
  0: 'icon-sunny.webp', 1: 'icon-partly-cloudy.webp', 2: 'icon-partly-cloudy.webp',
  3: 'icon-overcast.webp', 45: 'icon-fog.webp', 48: 'icon-fog.webp',
  51: 'icon-drizzle.webp', 53: 'icon-drizzle.webp', 55: 'icon-drizzle.webp',
  61: 'icon-rain.webp', 63: 'icon-rain.webp', 65: 'icon-rain.webp',
  71: 'icon-snow.webp', 73: 'icon-snow.webp', 75: 'icon-snow.webp', 77: 'icon-snow.webp',
  80: 'icon-rain.webp', 81: 'icon-rain.webp', 82: 'icon-rain.webp',
  85: 'icon-snow.webp', 86: 'icon-snow.webp',
  95: 'icon-storm.webp', 96: 'icon-storm.webp', 99: 'icon-storm.webp',
};

const weatherDescriptions = {
  0: 'Clear sky', 1: 'Partly cloudy', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Foggy', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains',
  80: 'Light showers', 81: 'Showers', 82: 'Heavy showers',
  85: 'Light snow showers', 86: 'Snow showers',
  95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Thunderstorm',
};

async function searchLocation(query) {
  const response = await fetch(
    `${GEOCODING_API_URL}/search?name=${encodeURIComponent(query)}&count=10&language=en&format=json`
  );
  if (!response.ok) throw new Error('api_error');
  const data = await response.json();
  if (data.results && data.results.length > 0) {
    return data.results[0];
  }
  throw new Error('not_found');
}

async function fetchWeatherData(latitude, longitude) {
  const response = await fetch(
    `${API_BASE_URL}/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m` +
    `&hourly=temperature_2m,weather_code,precipitation` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum` +
    `&timezone=auto`
  );
  if (!response.ok) throw new Error('api_error');
  return response.json();
}

function convertTemperature(c) { return tempIsMetric ? c : (c * 9 / 5) + 32; }
function convertWindSpeed(k) { return windIsMetric ? k : k * 0.621371; }
function convertPrecipitation(m) { return precipIsMetric ? m : m * 0.0393701; }
function getTempUnit() { return '°'; }
function getWindUnit() { return windIsMetric ? 'km/h' : 'mph'; }
function getPrecipUnit() { return precipIsMetric ? 'mm' : 'in'; }

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatDayName(dateStr, idx) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short' });
}

function formatHour(timeStr) {
  if (!timeStr) return '';
  const t = timeStr.split('T')[1] || timeStr;
  const hours = parseInt(t.split(':')[0], 10);
  const h12 = hours % 12 || 12;
  return `${h12} ${hours >= 12 ? 'PM' : 'AM'}`;
}

function getWeatherDesc(code) { return weatherDescriptions[code] || 'Unknown'; }

// ======================== State Views ========================

function hideAllViews() {
  ['empty-state', 'no-results-state', 'search-in-progress', 'weather-content',
    'hourly-section'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
}

function showEmptyState() {
  hideAllViews();
  const el = document.getElementById('empty-state');
  if (el) el.classList.remove('hidden');
}

function showWeather() {
  hideAllViews();
  ['weather-content', 'hourly-section'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
  });
}

function showSearchProgress() {
  hideAllViews();
  const el = document.getElementById('search-in-progress');
  if (el) el.classList.remove('hidden');
}

function showNoResults(query) {
  hideAllViews();
  const el = document.getElementById('no-results-state');
  const txt = document.getElementById('no-results-text');
  if (txt) txt.textContent = `We couldn't find "${query}". Please try another search.`;
  if (el) el.classList.remove('hidden');
}

function showLoading() {
  const el = document.getElementById('error-state');
  if (el) { el.classList.add('hidden'); }
}
function hideLoading() {
  // Loading is now handled inline with search-in-progress toast
}

function showError(message) {
  const sp = document.getElementById('search-in-progress');
  if (sp) sp.classList.add('hidden');
  const el = document.getElementById('error-state');
  if (el) { el.classList.remove('hidden'); el.setAttribute('aria-hidden', 'false'); }
}

function hideError() {
  const el = document.getElementById('error-state');
  if (el) { el.classList.add('hidden'); el.setAttribute('aria-hidden', 'true'); }
}

// ======================== UI Updates ========================

function updateUI(data) {
  showWeather();
  updateCurrentWeather(data.current);
  updateDailyForecast(data.daily);
  updateDayDropdown(data.daily);
  updateHourlyForecast(data.hourly, selectedDay);
}

function updateCurrentWeather(current) {
  const q = id => document.getElementById(id);

  if (q('current-temp') && current.temperature_2m !== undefined) {
    q('current-temp').textContent = `${Math.round(convertTemperature(current.temperature_2m))}${getTempUnit()}`;
  }
  if (q('feels-like') && current.apparent_temperature !== undefined) {
    q('feels-like').textContent = `${Math.round(convertTemperature(current.apparent_temperature))}${getTempUnit()}`;
  }
  if (q('humidity') && current.relative_humidity_2m !== undefined) {
    q('humidity').textContent = `${current.relative_humidity_2m}%`;
  }
  if (q('wind') && current.wind_speed_10m !== undefined) {
    q('wind').textContent = `${Math.round(convertWindSpeed(current.wind_speed_10m))} ${getWindUnit()}`;
  }
  if (q('precipitation')) {
    const p = current.precipitation !== undefined ? current.precipitation : 0;
    q('precipitation').textContent = `${Math.round(convertPrecipitation(p))} ${getPrecipUnit()}`;
  }
  if (q('weather-icon') && current.weather_code !== undefined) {
    const icon = weatherIcons[current.weather_code] || 'icon-sunny.webp';
    q('weather-icon').src = `./assets/images/${icon}`;
  }
  if (q('weather-description')) {
    q('weather-description').textContent = getWeatherDesc(current.weather_code);
  }
  if (q('current-date') && current.time) {
    q('current-date').textContent = formatDate(current.time);
  }
  if (q('location-name') && currentLocation) {
    const c = currentLocation.country || '';
    const n = currentLocation.name || '';
    q('location-name').textContent = c ? `${n}, ${c}` : n;
  }
}

// ======================== Daily Forecast ========================

function updateDailyForecast(daily) {
  const container = document.getElementById('daily-forecast');
  if (!container) return;
  container.innerHTML = '';

  daily.time.forEach((date, i) => {
    const el = document.createElement('div');
    el.className = 'daily-card flex flex-col justify-between bg-neutral-800 rounded-lg px-0 py-2 md:p-3 hover:bg-neutral-700 transition-colors cursor-pointer focus-ring-blue card-border';
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');

    if (i === selectedDay) {
      el.classList.add('ring-1', 'ring-blue-500');
    }

    const name = formatDayName(date, i);
    const icon = weatherIcons[daily.weather_code[i]] || 'icon-sunny.webp';
    const low = Math.round(convertTemperature(daily.temperature_2m_min[i]));
    const high = Math.round(convertTemperature(daily.temperature_2m_max[i]));

    el.innerHTML = `
      <span class="font-semibold text-xs text-center mb-2">${name}</span>
      <img src="./assets/images/${icon}" alt="" class="w-10 h-10 md:w-8 md:h-8 mb-2">
      <div class="daily-temp text-xs w-full flex flex-row items-center justify-between gap-0">
        <span class="font-bold">${high}${getTempUnit()}</span>
        <span class="text-neutral-400">${low}${getTempUnit()}</span>
      </div>
    `;

    el.addEventListener('click', () => selectDay(i, daily));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectDay(i, daily); }
    });
    container.appendChild(el);
  });
}

function selectDay(index, daily) {
  selectedDay = index;
  updateDailyForecast(daily);
  updateDayDropdown(daily);
  updateHourlyForecast(weatherData.hourly, index);
}

// ======================== Day Dropdown ========================

function updateDayDropdown(daily) {
  const container = document.getElementById('day-selector-dropdown');
  const label = document.getElementById('selected-day-label');
  if (!container || !label) return;

  container.innerHTML = '';

  daily.time.forEach((date, i) => {
    const btn = document.createElement('button');
    btn.textContent = formatDayName(date, i);
    btn.className = 'w-full text-left px-3 py-2 text-sm hover:bg-neutral-700 transition-colors focus-ring-blue';
    if (i === selectedDay) {
      btn.classList.add('bg-blue-500/10', 'text-blue-400');
    }

    btn.addEventListener('click', () => {
      selectedDay = i;
      label.textContent = formatDayName(date, i);
      container.classList.add('hidden');
      updateDailyForecast(daily);
      updateDayDropdown(daily);
      updateHourlyForecast(weatherData.hourly, i);
    });

    container.appendChild(btn);
  });

  label.textContent = formatDayName(daily.time[selectedDay], selectedDay);
}

// Day dropdown toggle
document.addEventListener('click', (e) => {
  const dd = document.getElementById('day-dropdown');
  const toggle = document.getElementById('day-dropdown-toggle');
  const menu = document.getElementById('day-selector-dropdown');
  if (dd && toggle && menu) {
    if (toggle.contains(e.target)) {
      menu.classList.toggle('hidden');
    } else if (!menu.contains(e.target)) {
      menu.classList.add('hidden');
    }
  }
});

// ======================== Hourly Forecast ========================

function updateHourlyForecast(hourly, dayIndex) {
  const container = document.getElementById('hourly-forecast');
  if (!container) return;
  container.innerHTML = '';

  const start = dayIndex * 24;
  const end = start + 24;
  let from = start;

  if (dayIndex === 0 && weatherData && weatherData.current && weatherData.current.time) {
    const curHour = parseInt(weatherData.current.time.split('T')[1].split(':')[0], 10);
    for (let i = start; i < end; i++) {
      if (!hourly.time[i]) break;
      const h = parseInt(hourly.time[i].split('T')[1].split(':')[0], 10);
      if (h < curHour) { from = i + 1; } else break;
    }
  }

  for (let i = from; i < end; i++) {
    if (!hourly.time[i]) break;

    const el = document.createElement('div');
    el.className = 'flex items-center gap-3 bg-neutral-700/50 rounded-lg px-3 py-2.5 hover:bg-neutral-700 transition-colors';

    const time = formatHour(hourly.time[i]);
    const icon = weatherIcons[hourly.weather_code[i]] || 'icon-sunny.webp';
    const temp = Math.round(convertTemperature(hourly.temperature_2m[i]));

    el.innerHTML = `
      <img src="./assets/images/${icon}" alt="" class="w-6 h-6">
      <span class="text-sm text-neutral-300 min-w-[3.5rem]">${time}</span>
      <span class="font-semibold text-sm ml-auto">${temp}${getTempUnit()}</span>
    `;
    container.appendChild(el);
  }
}

// ======================== Search / Retry ========================

async function handleSearch() {
  const query = document.getElementById('search-input').value.trim();
  if (!query) { 
    showError();
    return; 
  }

  hideError();
  
  const sp = document.getElementById('search-in-progress');
  if (sp) sp.classList.remove('hidden');

  try {
    const location = await searchLocation(query);
    currentLocation = location;
    const weather = await fetchWeatherData(location.latitude, location.longitude);
    weatherData = weather;
    selectedDay = 0;
    if (sp) sp.classList.add('hidden');
    updateUI(weather);
  } catch (err) {
    if (sp) sp.classList.add('hidden');
    if (err.message === 'api_error') {
      showError('Something went wrong fetching weather data. Please try again.');
    } else if (err.message === 'not_found') {
      showNoResults(query);
    } else {
      showError(err.message || 'An error occurred');
    }
  }
}

document.getElementById('search-button').addEventListener('click', handleSearch);
document.getElementById('search-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleSearch();
});

document.getElementById('retry-button').addEventListener('click', async () => {
  hideError();
  if (currentLocation) {
    const sp = document.getElementById('search-in-progress');
    if (sp) sp.classList.remove('hidden');
    try {
      const weather = await fetchWeatherData(currentLocation.latitude, currentLocation.longitude);
      weatherData = weather;
      if (sp) sp.classList.add('hidden');
      updateUI(weather);
    } catch {
      if (sp) sp.classList.add('hidden');
      showError('Something went wrong. Please try again.');
    }
  } else {
    handleSearch();
  }
});

// ======================== Units Dropdown ========================

document.getElementById('units-toggle').addEventListener('click', () => {
  const dd = document.getElementById('units-dropdown');
  const ch = document.getElementById('units-chevron');
  const expanded = dd.classList.toggle('hidden');
  document.getElementById('units-toggle').setAttribute('aria-expanded', (!expanded).toString());
  if (ch) ch.style.transform = expanded ? '' : 'rotate(180deg)';
  updateUnitsUI();
});

document.addEventListener('click', (e) => {
  const toggle = document.getElementById('units-toggle');
  const dd = document.getElementById('units-dropdown');
  if (toggle && dd && !toggle.contains(e.target) && !dd.contains(e.target) && !dd.classList.contains('hidden')) {
    dd.classList.add('hidden');
    toggle.setAttribute('aria-expanded', 'false');
    const ch = document.getElementById('units-chevron');
    if (ch) ch.style.transform = '';
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const dd = document.getElementById('units-dropdown');
    if (dd && !dd.classList.contains('hidden')) {
      dd.classList.add('hidden');
      document.getElementById('units-toggle').setAttribute('aria-expanded', 'false');
      const ch = document.getElementById('units-chevron');
      if (ch) ch.style.transform = '';
    }
  }
});

document.getElementById('units-dropdown').addEventListener('click', (e) => {
  // Handle switch units button
  if (e.target.closest('#switch-units-btn')) {
    tempIsMetric = !tempIsMetric;
    windIsMetric = !windIsMetric;
    precipIsMetric = !precipIsMetric;
    updateUnitsUI();
    if (weatherData) updateUI(weatherData);
    return;
  }
  
  // Handle unit options
  const btn = e.target.closest('.unit-option');
  if (!btn) return;
  const type = btn.dataset.type;
  const value = btn.dataset.value;

  if (type === 'temperature') tempIsMetric = (value === 'metric');
  if (type === 'wind') windIsMetric = (value === 'metric');
  if (type === 'precipitation') precipIsMetric = (value === 'metric');

  updateUnitsUI();
  if (weatherData) updateUI(weatherData);
  document.getElementById('units-dropdown').classList.add('hidden');
  const ch = document.getElementById('units-chevron');
  if (ch) ch.style.transform = '';
});

function updateUnitsUI() {
  document.querySelectorAll('.unit-option').forEach(btn => {
    const type = btn.dataset.type;
    const value = btn.dataset.value;
    const img = btn.querySelector('img');
    let selected = false;

    if (type === 'temperature') selected = (tempIsMetric && value === 'metric') || (!tempIsMetric && value === 'imperial');
    if (type === 'wind') selected = (windIsMetric && value === 'metric') || (!windIsMetric && value === 'imperial');
    if (type === 'precipitation') selected = (precipIsMetric && value === 'metric') || (!precipIsMetric && value === 'imperial');

    btn.classList.toggle('bg-neutral-700', selected);
    btn.classList.toggle('hover:bg-neutral-700', !selected);
    if (img) { img.classList.toggle('opacity-100', selected); img.classList.toggle('opacity-0', !selected); }
  });
  
  // Update "Switch to..." message
  const switchMsg = document.getElementById('switch-message');
  if (switchMsg) {
    const targetUnit = tempIsMetric ? 'imperial' : 'metric';
    switchMsg.textContent = `Switch to ${targetUnit}`;
  }
}

// ======================== Preload Berlin ========================

async function preloadBerlin() {
  const sp = document.getElementById('search-in-progress');
  if (sp) sp.classList.remove('hidden');
  try {
    const location = await searchLocation('Berlin,Germany');
    currentLocation = location;
    const weather = await fetchWeatherData(location.latitude, location.longitude);
    weatherData = weather;
    selectedDay = 0;
    if (sp) sp.classList.add('hidden');
    updateUI(weather);
    updateUnitsUI();
  } catch {
    if (sp) sp.classList.add('hidden');
    showEmptyState();
    updateUnitsUI();
  }
}

preloadBerlin();

// ======================== Height Sync ========================

function syncHourlyHeight() {
  if (window.innerWidth < 768) return; // Only on desktop
  
  const leftColumn = document.getElementById('left-column');
  const hourlySection = document.getElementById('hourly-section');
  
  if (!leftColumn || !hourlySection || hourlySection.classList.contains('hidden')) return;
  
  // Use requestAnimationFrame to ensure DOM is ready
  requestAnimationFrame(() => {
    const leftHeight = leftColumn.offsetHeight;
    const hourlyDiv = hourlySection.querySelector('div');
    if (hourlyDiv) {
      hourlyDiv.style.height = `${leftHeight}px`;
    }
  });
}

// Call on load and window resize
window.addEventListener('load', syncHourlyHeight);
window.addEventListener('resize', syncHourlyHeight);

// Also call when weather is updated
const originalShowWeather = showWeather;
showWeather = function() {
  originalShowWeather();
  setTimeout(syncHourlyHeight, 100);
};
