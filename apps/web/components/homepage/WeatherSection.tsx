import type { WeatherSnapshot } from "../../lib/services/weather";

type WeatherSectionProps = {
  weather: WeatherSnapshot;
};

export default function WeatherSection({ weather }: WeatherSectionProps) {
  return (
    <section className="homepage-weather stack stack--sm" aria-labelledby="homepage-weather-title">
      <h2 id="homepage-weather-title">Været i Bjørneparken</h2>
      <div className="homepage-weather__grid">
        <article className="homepage-weather__item">
          <h3>Temperatur</h3>
          <p>{weather.temperatureC}°C</p>
        </article>
        <article className="homepage-weather__item">
          <h3>Forhold</h3>
          <p>{weather.condition}</p>
        </article>
        <article className="homepage-weather__item">
          <h3>Vind</h3>
          <p>{weather.wind}</p>
        </article>
        <article className="homepage-weather__item">
          <h3>Nedbør</h3>
          <p>{weather.precipitation}</p>
        </article>
      </div>
      <p className="homepage-weather__updated">Sist oppdatert: {weather.lastUpdated}</p>
    </section>
  );
}
