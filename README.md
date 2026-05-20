# Frontend Mentor - Weather app solution

This is a solution to the [Weather app challenge on Frontend Mentor](https://www.frontendmentor.io/challenges/weather-app-K1FhddVm49). Frontend Mentor challenges help you improve your coding skills by building realistic projects.

## Table of contents

- [Overview](#overview)
  - [The challenge](#the-challenge)
  - [Screenshot](#screenshot)
  - [Links](#links)
- [My process](#my-process)
  - [Built with](#built-with)
  - [What I learned](#what-i-learned)
  - [Continued development](#continued-development)
  - [Useful resources](#useful-resources)
- [Author](#author)
- [Acknowledgments](#acknowledgments)

## Overview

### The challenge

Users should be able to:

- Search for weather information by entering a location in the search bar
- View current weather conditions including temperature, weather icon, and location details
- See additional weather metrics like "feels like" temperature, humidity percentage, wind speed, and precipitation amounts
- Browse a 7-day weather forecast with daily high/low temperatures and weather icons
- View an hourly forecast showing temperature changes throughout the day
- Switch between different days of the week using the day selector in the hourly forecast section
- Toggle between Imperial and Metric measurement units via the units dropdown
- Switch between specific temperature units (Celsius and Fahrenheit) and measurement units for wind speed (km/h and mph) and precipitation (millimeters) via the units dropdown
- View the optimal layout for the interface depending on their device's screen size
- See hover and focus states for all interactive elements on the page

### Screenshot

![](./design/desktop-design-metric.jpg)

### Links

- Solution URL: [https://github.com/anomalyco/frontend-mentor-weather-app](https://github.com/anomalyco/frontend-mentor-weather-app)
- Live Site URL: [Add live site URL here](https://your-live-site-url.com)

## My process

### Built with

- Semantic HTML5 markup
- Tailwind CSS
- CSS Grid and Flexbox
- Mobile-first responsive workflow
- Vanilla JavaScript (ES6+)
- Open-Meteo API

### What I learned

Integrating the Open-Meteo free API with vanilla JavaScript to fetch and display current weather, hourly, and daily forecast data. Implementing a 12-column responsive grid system with Tailwind CSS that adapts from 3-column (mobile) to 7-column (desktop) layouts for the daily forecast. Building a units toggle system that supports both bulk "Switch all" and individual unit changes for temperature, wind speed, and precipitation — all updating the UI in real time.

```js
const API_BASE_URL = 'https://api.open-meteo.com/v1';

async function fetchWeatherData(latitude, longitude) {
  const response = await fetch(
    `${API_BASE_URL}/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,` +
    `is_day,precipitation,weather_code,wind_speed_10m` +
    `&hourly=temperature_2m,weather_code,precipitation` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum` +
    `&timezone=auto`
  );
  if (!response.ok) throw new Error('api_error');
  return response.json();
}
```

### Continued development

I plan to add geolocation-based weather detection so the app loads with the user's current location instead of defaulting to Berlin. I also want to explore adding weather alerts and saving favorite locations using localStorage.

### Useful resources

- [Open-Meteo API Documentation](https://open-meteo.com/en/docs) - Comprehensive docs for the free weather API used in this project.
- [Tailwind CSS Documentation](https://tailwindcss.com/docs) - Essential reference for utility classes and responsive breakpoints.

## Author

- Frontend Mentor - [@anomalyco](https://www.frontendmentor.io/profile/anomalyco)

## Acknowledgments

Thanks to the Frontend Mentor community for the design inspiration and to the Open-Meteo team for providing a free, no-API-key weather service.
