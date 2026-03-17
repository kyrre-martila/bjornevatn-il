export type WeatherSnapshot = {
  temperatureC: number;
  condition: string;
  wind: string;
  precipitation: string;
  lastUpdated: string;
};

export async function getWeatherSnapshot(params: {
  latitude: string;
  longitude: string;
}): Promise<WeatherSnapshot> {
  const { latitude, longitude } = params;

  // TODO: Replace mocked data with a real weather API integration using club coordinates.
  const hasCoordinates = Boolean(latitude.trim() && longitude.trim());

  return {
    temperatureC: hasCoordinates ? 4 : 0,
    condition: hasCoordinates ? "Delvis skyet" : "Ikke tilgjengelig",
    wind: hasCoordinates ? "6 m/s" : "-",
    precipitation: hasCoordinates ? "0.4 mm" : "-",
    lastUpdated: new Date().toISOString(),
  };
}
