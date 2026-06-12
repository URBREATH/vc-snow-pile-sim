// Coordinates for Kajaani and Tallinn
export const weatherLocations = [
  { name: 'Kajaani', lat: 64.2273, lon: 27.7285 },
  { name: 'Tallinn', lat: 59.437, lon: 24.7536 },
];

// Date range (example: last 30 days)
/* const start = '2025-05-25';
const end = '2025-06-24';

export async function fetchWeatherData(lat: number, lon: number, name: string) {
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${start}&end_date=${end}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,sunshine_duration&timezone=auto`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch data for ${name}`);
  const data = await response.json();
  return data;
}

(async () => {
  for (const loc of locations) {
    try {
      const data = await fetchWeatherData(loc.lat, loc.lon, loc.name);
      console.log(`\nWeather data for ${loc.name}:`);
      console.log(
        'Date, Temp Max (°C), Temp Min (°C), Precip (mm), Sunshine (min)',
      );
      data.daily.time.forEach((date: string, i: number) => {
        const tmax = data.daily.temperature_2m_max[i];
        const tmin = data.daily.temperature_2m_min[i];
        const precip = data.daily.precipitation_sum[i];
        const sun = data.daily.sunshine_duration[i];
        console.log(`${date}, ${tmax}, ${tmin}, ${precip}, ${sun}`);
      });
    } catch (e) {
      console.error(e);
    }
  }
})(); */
