import { Wind } from 'lucide-react';
import { useEffect, useState } from 'react';

const WeatherWidget = () => {
  const [data, setData] = useState({
    temperature: 0,
    condition: '',
    location: '',
    humidity: 0,
    windSpeed: 0,
    icon: '',
    temperatureUnit: 'C',
    windSpeedUnit: 'm/s',
  });

  const [loading, setLoading] = useState(true);

  const getApproxLocation = async () => {
    try {
      const res = await fetch('https://ipwhois.app/json/');
      const data = await res.json();

      if (data.latitude != null && data.longitude != null) {
        return {
          latitude: data.latitude,
          longitude: data.longitude,
          city: data.city || 'Unknown',
        };
      }
    } catch (e) {
      console.warn('ipwhois.app failed, trying ip-api.com');
    }

    try {
      const res = await fetch('https://ip-api.com/json/?fields=lat,lon,city');
      const data = await res.json();

      if (data.lat != null && data.lon != null) {
        return {
          latitude: data.lat,
          longitude: data.lon,
          city: data.city || 'Unknown',
        };
      }
    } catch (e) {
      console.warn('ip-api.com also failed');
    }

    return null;
  };

  const getLocation = async (): Promise<{
    latitude: number;
    longitude: number;
    city: string;
  } | null> => {
    try {
      if (navigator.geolocation) {
        let permState = 'unknown';
        try {
          const result = await navigator.permissions.query({
            name: 'geolocation',
          });
          permState = result.state;
        } catch {
          permState = 'unknown';
        }

        if (permState === 'granted') {
          return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              async (position) => {
                let city = 'Unknown';
                try {
                  const res = await fetch(
                    `https://api-bdc.io/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`,
                  );
                  const data = await res.json();
                  city = data.locality || 'Unknown';
                } catch {}

                resolve({
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  city,
                });
              },
              async () => {
                resolve(await getApproxLocation());
              },
              { timeout: 5000 },
            );
          });
        }
      }
    } catch {}

    return await getApproxLocation();
  };

  const updateWeather = async () => {
    try {
      const location = await getLocation();

      if (!location) {
        console.error('Could not determine location for weather');
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/weather`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: location.latitude,
          lng: location.longitude,
          measureUnit: localStorage.getItem('measureUnit') ?? 'Metric',
        }),
      });

      const weatherData = await res.json();

      if (res.status !== 200) {
        console.error('Error fetching weather data:', weatherData.message);
        setLoading(false);
        return;
      }

      setData({
        temperature: weatherData.temperature,
        condition: weatherData.condition,
        location: location.city,
        humidity: weatherData.humidity,
        windSpeed: weatherData.windSpeed,
        icon: weatherData.icon,
        temperatureUnit: weatherData.temperatureUnit,
        windSpeedUnit: weatherData.windSpeedUnit,
      });
      setLoading(false);
    } catch (err) {
      console.error('Weather update failed:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    updateWeather();
    const intervalId = setInterval(updateWeather, 30 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="bg-light-secondary dark:bg-dark-secondary rounded-2xl border border-light-200 dark:border-dark-200 shadow-sm shadow-light-200/10 dark:shadow-black/25 flex flex-row items-center w-full h-24 min-h-[96px] max-h-[96px] px-3 py-2 gap-3">
      {loading ? (
        <>
          <div className="flex flex-col items-center justify-center w-16 min-w-16 max-w-16 h-full animate-pulse">
            <div className="h-10 w-10 rounded-full bg-light-200 dark:bg-dark-200 mb-2" />
            <div className="h-4 w-10 rounded bg-light-200 dark:bg-dark-200" />
          </div>
          <div className="flex flex-col justify-between flex-1 h-full py-1 animate-pulse">
            <div className="flex flex-row items-center justify-between">
              <div className="h-3 w-20 rounded bg-light-200 dark:bg-dark-200" />
              <div className="h-3 w-12 rounded bg-light-200 dark:bg-dark-200" />
            </div>
            <div className="h-3 w-16 rounded bg-light-200 dark:bg-dark-200 mt-1" />
            <div className="flex flex-row justify-between w-full mt-auto pt-1 border-t border-light-200 dark:border-dark-200">
              <div className="h-3 w-16 rounded bg-light-200 dark:bg-dark-200" />
              <div className="h-3 w-8 rounded bg-light-200 dark:bg-dark-200" />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col items-center justify-center w-16 min-w-16 max-w-16 h-full">
            <img
              src={`/weather-ico/${data.icon}.svg`}
              alt={data.condition}
              className="h-10 w-auto"
            />
            <span className="text-base font-semibold text-black dark:text-white">
              {data.temperature}°{data.temperatureUnit}
            </span>
          </div>
          <div className="flex flex-col justify-between flex-1 h-full py-2">
            <div className="flex flex-row items-center justify-between">
              <span className="text-sm font-semibold text-black dark:text-white">
                {data.location}
              </span>
              <span className="flex items-center text-xs text-black/60 dark:text-white/60 font-medium">
                <Wind className="w-3 h-3 mr-1" />
                {data.windSpeed} {data.windSpeedUnit}
              </span>
            </div>
            <span className="text-xs text-black/50 dark:text-white/50 italic">
              {data.condition}
            </span>
            <div className="flex flex-row justify-between w-full mt-auto pt-2 border-t border-light-200/50 dark:border-dark-200/50 text-xs text-black/50 dark:text-white/50 font-medium">
              <span>Humidity {data.humidity}%</span>
              <span className="font-semibold text-black/70 dark:text-white/70">
                Now
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WeatherWidget;
