
import { useEffect, useState } from "react";
import "./App.css";

const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;

// University of Malakand / Ramora reference point
const RAMORA_CENTER = {
  lat: 34.66861,
  lon: 72.05972,
};

// Distance between two GPS coordinates in kilometers
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const earthRadius = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
}

// Decide whether GPS coordinates are inside the UOM/Ramora area
function getLocalArea(latitude, longitude) {
  const distance = getDistanceKm(
    latitude,
    longitude,
    RAMORA_CENTER.lat,
    RAMORA_CENTER.lon
  );

  // UOM / Ramora area
  // The radius can be adjusted later if necessary.
  if (distance <= 2.0) {
    return {
      name: "Ramora",
      city: "Chakdara",
      province: "Khyber Pakhtunkhwa",
      country: "Pakistan",
    };
  }

  return null;
}

export default function App() {
  const [weather, setWeather] = useState(null);
  const [location, setLocation] = useState(null);
  const [searchCity, setSearchCity] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [time, setTime] = useState(new Date());

  // -----------------------------
  // CLOCK
  // -----------------------------
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // -----------------------------
  // GET LOCATION ON START
  // -----------------------------
  useEffect(() => {
    getUserLocation();
  }, []);

  // -----------------------------
  // GPS LOCATION
  // -----------------------------
  const getUserLocation = () => {
    setLoading(true);
    setError("");

    if (!navigator.geolocation) {
      setError("Your browser does not support GPS location.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        console.log("GPS latitude:", latitude);
        console.log("GPS longitude:", longitude);
        console.log(
          "GPS accuracy:",
          position.coords.accuracy,
          "meters"
        );

        await getWeatherByCoordinates(latitude, longitude);
      },
      (err) => {
        console.error("GPS ERROR:", err);

        setLoading(false);

        if (err.code === 1) {
          setError(
            "Location permission was denied. Please allow location access in your browser."
          );
        } else if (err.code === 2) {
          setError("Your location could not be detected.");
        } else if (err.code === 3) {
          setError("Location request timed out. Please try again.");
        } else {
          setError("Unable to detect your location.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    );
  };

  // -----------------------------
  // WEATHER BY GPS COORDINATES
  // -----------------------------
  const getWeatherByCoordinates = async (latitude, longitude) => {
    try {
      setLoading(true);
      setError("");

      // Exact GPS weather
      const weatherResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${API_KEY}`
      );

      if (!weatherResponse.ok) {
        throw new Error("Weather API error");
      }

      const weatherData = await weatherResponse.json();

      // ----------------------------------------
      // FIRST: CHECK OUR LOCAL RAMORA/UOM AREA
      // ----------------------------------------
      const knownArea = getLocalArea(latitude, longitude);

      if (knownArea) {
        setLocation({
          name: knownArea.name,
          city: knownArea.city,
          province: knownArea.province,
          country: knownArea.country,
          latitude,
          longitude,
          source: "GPS + local area",
        });
      } else {
        // ----------------------------------------
        // OTHERWISE USE REVERSE GEOCODING
        // ----------------------------------------
        let locationData = null;

        try {
          const locationResponse = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=18&addressdetails=1`,
            {
              headers: {
                Accept: "application/json",
              },
            }
          );

          if (locationResponse.ok) {
            locationData = await locationResponse.json();
          }
        } catch (geoError) {
          console.error("Reverse geocoding error:", geoError);
        }

        const address = locationData?.address || {};

        const name =
          address.neighbourhood ||
          address.suburb ||
          address.village ||
          address.hamlet ||
          address.town ||
          address.city ||
          weatherData.name ||
          "Your Location";

        const city =
          address.town ||
          address.city ||
          address.municipality ||
          address.county ||
          "";

        const province =
          address.state ||
          address.province ||
          "";

        const country = address.country || "";

        setLocation({
          name,
          city,
          province,
          country,
          latitude,
          longitude,
          source: "GPS + reverse geocoding",
        });
      }

      setWeather(weatherData);
      setLoading(false);
    } catch (err) {
      console.error(err);

      setError(
        "Unable to load weather for your location. Please try again."
      );

      setLoading(false);
    }
  };

  // -----------------------------
  // SEARCH CITY
  // -----------------------------
  const searchWeather = async (e) => {
    e.preventDefault();

    if (!searchCity.trim()) return;

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
          searchCity
        )}&units=metric&appid=${API_KEY}`
      );

      if (!response.ok) {
        throw new Error("City not found");
      }

      const data = await response.json();

      setWeather(data);

      setLocation({
        name: data.name,
        city: data.name,
        province: "",
        country: data.sys?.country || "",
        latitude: data.coord.lat,
        longitude: data.coord.lon,
        source: "City search",
      });

      setSearchCity("");
      setLoading(false);
    } catch (err) {
      console.error(err);

      setError("City not found. Please check the spelling.");
      setLoading(false);
    }
  };

  // -----------------------------
  // WEATHER ICON
  // -----------------------------
  const getWeatherIcon = () => {
    const condition = weather?.weather?.[0]?.main?.toLowerCase();

    if (!condition) return "🌤️";

    if (condition.includes("thunderstorm")) return "⛈️";
    if (condition.includes("drizzle")) return "🌦️";
    if (condition.includes("rain")) return "🌧️";
    if (condition.includes("snow")) return "❄️";
    if (condition.includes("mist")) return "🌫️";
    if (condition.includes("fog")) return "🌫️";
    if (condition.includes("haze")) return "🌫️";
    if (condition.includes("cloud")) return "☁️";
    if (condition.includes("clear")) return "☀️";

    return "🌤️";
  };

  // -----------------------------
  // TIME
  // -----------------------------
  const formattedTime = time.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const formattedDate = time.toLocaleDateString([], {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // -----------------------------
  // LOADING
  // -----------------------------
  if (loading && !weather) {
    return (
      <div className="app loading-screen">
        <div className="loading-card">
          <div className="loading-icon">📍</div>

          <h1>Finding your location...</h1>

          <p>
            Allow location access so WeatherNow can find the
            weather around you.
          </p>

          <div className="loader"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">

      {/* HEADER */}
      <header className="header">
        <div className="header-content">

          <div className="logo">
            <span className="logo-icon">🌦️</span>
            <span>WeatherNow</span>
          </div>

          <button
            className="location-button"
            onClick={getUserLocation}
          >
            📍 Use My Location
          </button>

        </div>
      </header>

      <main className="container">

        {/* SEARCH */}
        <section className="search-section">

          <h1>Weather Forecast</h1>

          <p>
            Accurate weather based on your actual location.
          </p>

          <form
            onSubmit={searchWeather}
            className="search-form"
          >
            <input
              type="text"
              value={searchCity}
              onChange={(e) =>
                setSearchCity(e.target.value)
              }
              placeholder="Search for a city..."
            />

            <button type="submit">
              Search
            </button>
          </form>

        </section>

        {/* ERROR */}
        {error && (
          <div className="error-box">
            <span>⚠️</span>
            <p>{error}</p>
          </div>
        )}

        {weather && (
          <>

            {/* LOCATION */}
            <section className="location-card">

              <div className="location-icon">
                📍
              </div>

              <div>

                <p className="location-label">
                  YOUR LOCATION
                </p>

                <h2>
                  {location?.name || weather.name}
                </h2>

                <p className="location-details">

                  {location?.city &&
                    location.city !== location.name &&
                    `${location.city}, `}

                  {location?.province &&
                    `${location.province}, `}

                  {location?.country}

                </p>

                {location?.latitude &&
                  location?.longitude && (
                    <p className="coordinates">
                      GPS: {location.latitude.toFixed(5)}°,
                      {" "}
                      {location.longitude.toFixed(5)}°
                    </p>
                  )}

              </div>

            </section>

            {/* TIME */}
            <section className="time-card">

              <div>
                <p className="time-label">
                  LOCAL TIME
                </p>

                <h2>{formattedTime}</h2>

                <p>{formattedDate}</p>
              </div>

              <div className="clock-icon">
                🕐
              </div>

            </section>

            {/* WEATHER */}
            <section className="weather-main">

              <div className="weather-top">

                <div>

                  <p className="weather-label">
                    CURRENT WEATHER
                  </p>

                  <h2>
                    {weather.weather?.[0]?.description}
                  </h2>

                  <div className="temperature">
                    {Math.round(weather.main.temp)}
                    <span>°C</span>
                  </div>

                  <p className="feels">
                    Feels like{" "}
                    {Math.round(weather.main.feels_like)}
                    °C
                  </p>

                </div>

                <div className="weather-icon">
                  {getWeatherIcon()}
                </div>

              </div>

              {/* DETAILS */}
              <div className="weather-details">

                <div className="detail-card">
                  <span>💧</span>

                  <div>
                    <p>Humidity</p>
                    <strong>
                      {weather.main.humidity}%
                    </strong>
                  </div>
                </div>

                <div className="detail-card">
                  <span>💨</span>

                  <div>
                    <p>Wind Speed</p>
                    <strong>
                      {weather.wind.speed} m/s
                    </strong>
                  </div>
                </div>

                <div className="detail-card">
                  <span>🌡️</span>

                  <div>
                    <p>Pressure</p>
                    <strong>
                      {weather.main.pressure} hPa
                    </strong>
                  </div>
                </div>

                <div className="detail-card">
                  <span>👁️</span>

                  <div>
                    <p>Visibility</p>
                    <strong>
                      {weather.visibility
                        ? `${(
                            weather.visibility / 1000
                          ).toFixed(1)} km`
                        : "N/A"}
                    </strong>
                  </div>
                </div>

              </div>

            </section>

            {/* SUNRISE / SUNSET */}
            <section className="sun-card">

              <div>
                <span>🌅</span>

                <div>
                  <p>Sunrise</p>

                  <strong>
                    {new Date(
                      weather.sys.sunrise * 1000
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </strong>
                </div>
              </div>

              <div>
                <span>🌇</span>

                <div>
                  <p>Sunset</p>

                  <strong>
                    {new Date(
                      weather.sys.sunset * 1000
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </strong>
                </div>
              </div>

            </section>

          </>
        )}

      </main>

      {/* FOOTER */}
      <footer className="footer">

        <p>
          🌦️ WeatherNow — Weather based on your GPS location
        </p>

        <p>
          Built with React • OpenWeather API • GPS
        </p>

      </footer>

    </div>
  );
}
