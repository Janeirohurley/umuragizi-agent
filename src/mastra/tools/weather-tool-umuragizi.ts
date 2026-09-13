import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

interface WeatherResponse {
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    weather_code: number;
  };
}

interface GeocodingResponse {
  results: {
    latitude: number;
    longitude: number;
    name: string;
  }[];
}

function getWeatherCondition(code: number): string {
  const conditions: Record<number, string> = {
    0: 'Ciel dégagé',
    1: 'Principalement dégagé',
    2: 'Partiellement nuageux',
    3: 'Couvert',
    45: 'Brouillard',
    48: 'Brouillard givrant',
    51: 'Bruine légère',
    53: 'Bruine modérée',
    55: 'Bruine dense',
    61: 'Pluie légère',
    63: 'Pluie modérée',
    65: 'Pluie forte',
    71: 'Neige légère',
    73: 'Neige modérée',
    75: 'Neige forte',
    80: 'Averses légères',
    81: 'Averses modérées',
    82: 'Averses violentes',
    95: 'Orage',
    96: 'Orage avec grêle légère',
    99: 'Orage avec grêle forte',
  };
  return conditions[code] || 'Inconnu';
}

export const weatherTool = createTool({
  id: 'get-weather-umuragizi',
  description: 'Obtenir la météo actuelle pour une localité. Utile pour donner des conseils agricoles basés sur les conditions météorologiques.',
  inputSchema: z.object({
    location: z.string().describe('Nom de la ville ou localité'),
  }),
  outputSchema: z.object({
    temperature: z.number(),
    ressenti: z.number(),
    humidite: z.number(),
    vent: z.number(),
    conditions: z.string(),
    localite: z.string(),
    conseilsAgricoles: z.string(),
  }),
  execute: async (inputData) => {
    const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(inputData.location)}&count=1`;
    const geocodingResponse = await fetch(geocodingUrl);
    const geocodingData = (await geocodingResponse.json()) as GeocodingResponse;

    if (!geocodingData.results?.[0]) {
      throw new Error(`Localité "${inputData.location}" introuvable.`);
    }

    const { latitude, longitude, name } = geocodingData.results[0];

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code`;
    const response = await fetch(weatherUrl);
    const data = (await response.json()) as WeatherResponse;

    const temp = data.current.temperature_2m;
    const conditions = getWeatherCondition(data.current.weather_code);
    const humidite = data.current.relative_humidity_2m;

    let conseils = '';
    if (temp > 35) {
      conseils = 'Température élevée. Assurez-vous que les animaux ont accès à de l\'eau fraîche et à l\'ombre.';
    } else if (temp < 10) {
      conseils = 'Température basse. Protégez les animaux jeunes et les animaux malades du froid.';
    } else if (humidite > 80) {
      conseils = 'Humidité élevée. Surveillez les maladies cutanées et les parasitoses.';
    } else if (data.current.weather_code >= 61 && data.current.weather_code <= 65) {
      conseils = 'Pluie prévue. Évitez les traitements et les vaccinations aujourd\'hui.';
    } else if (data.current.weather_code >= 95) {
      conseils = 'Orage prévu. Mettez les animaux à l\'abri et évitez les déplacements.';
    } else {
      conseils = 'Conditions favorables pour les activités d\'élevage.';
    }

    return {
      temperature: temp,
      ressenti: data.current.apparent_temperature,
      humidite,
      vent: data.current.wind_speed_10m,
      conditions,
      localite: name,
      conseilsAgricoles: conseils,
    };
  },
});
