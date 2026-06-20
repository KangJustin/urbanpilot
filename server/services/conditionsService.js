// Real live conditions (no API key) for the top stats bar's "Live Data" badge.
async function getLiveConditions(lat, lon) {
  const [weatherRes, aqiRes] = await Promise.all([
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`),
    fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`),
  ]);

  if (!weatherRes.ok || !aqiRes.ok) {
    throw new Error('Live conditions API error');
  }

  const weather = await weatherRes.json();
  const aqi = await aqiRes.json();

  return {
    temperatureF: weather.current?.temperature_2m ?? null,
    weatherCode: weather.current?.weather_code ?? null,
    aqi: aqi.current?.us_aqi ?? null,
  };
}

module.exports = { getLiveConditions };
