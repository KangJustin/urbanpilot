// Open-Meteo current weather + US AQI for Climate Agent grounding (no API key).

const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';
const AQI_API = 'https://air-quality-api.open-meteo.com/v1/air-quality';

const SOURCE = ['Open-Meteo Weather API', 'Open-Meteo Air Quality API'];

// WMO weather interpretation codes — https://open-meteo.com/en/docs
function weatherDescription(code) {
  if (code == null) return 'Unknown';
  if (code === 0) return 'Clear';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if ([45, 48].includes(code)) return 'Fog';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code >= 85 && code <= 86) return 'Snow showers';
  if (code >= 95 && code <= 99) return 'Thunderstorm';
  return 'Cloudy';
}

function usAqiCategory(aqi) {
  if (aqi == null) return null;
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}

async function getOpenMeteoClimateMetrics(latitude, longitude) {
  if (latitude == null || longitude == null) {
    return { climateAvailable: false, climateData: null };
  }

  const weatherUrl = `${WEATHER_API}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`;
  const aqiUrl = `${AQI_API}?latitude=${latitude}&longitude=${longitude}&current=us_aqi`;

  console.log('[openmeteo] Weather URL:', weatherUrl);
  console.log('[openmeteo] Air quality URL:', aqiUrl);

  const [weatherRes, aqiRes] = await Promise.all([
    fetch(weatherUrl),
    fetch(aqiUrl),
  ]);

  if (!weatherRes.ok) {
    throw new Error(`Open-Meteo weather API error (${weatherRes.status})`);
  }
  if (!aqiRes.ok) {
    throw new Error(`Open-Meteo air quality API error (${aqiRes.status})`);
  }

  const weather = await weatherRes.json();
  const aqi = await aqiRes.json();

  const temperatureF = weather.current?.temperature_2m ?? null;
  const weatherCode = weather.current?.weather_code ?? null;
  const usAqi = aqi.current?.us_aqi ?? null;

  if (temperatureF == null && usAqi == null) {
    return { climateAvailable: false, climateData: null };
  }

  const climateData = {
    temperatureF,
    weatherCode,
    weatherDescription: weatherDescription(weatherCode),
    usAqi,
    aqiCategory: usAqiCategory(usAqi),
    source: SOURCE,
    verified: true,
    observedAt: weather.current?.time || aqi.current?.time || null,
    timezone: weather.timezone || null,
  };

  console.log('[openmeteo] Normalized climate data:', JSON.stringify(climateData, null, 2));

  return { climateAvailable: true, climateData };
}

module.exports = {
  getOpenMeteoClimateMetrics,
  weatherDescription,
  usAqiCategory,
  SOURCE,
};
