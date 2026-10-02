
import { useEffect, useState } from "react";
import "./App.css";

const API_KEY = "6fa09290ceedf0468e07472a3e60b641";

function App() {
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cityTime, setCityTime] = useState(new Date());

  // --------------------------------
  // CITY CLOCK
  // --------------------------------

  useEffect(() => {
    if (!weather) return;

    const updateCityTime = () => {
      const nowUTC = Date.now();

      // OpenWeatherMap timezone is in seconds
      const cityOffset = weather.timezone * 1000;

      // Browser's current timezone offset
      const localOffset =
        new Date().getTimezoneOffset() * 60 * 1000;

      const cityDate = new Date(
        nowUTC + cityOffset + localOffset
      );

      setCityTime(cityDate);
    };

    updateCityTime();

    const timer = setInterval(updateCityTime, 1000);

    return () => clearInterval(timer);
  }, [weather]);

  // --------------------------------
  // GET WEATHER BY CITY
  // --------------------------------

  const getWeatherByCity = async (cityName) => {
    if (!cityName.trim()) {
      setError("Please enter a city name.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const weatherResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
          cityName
        )}&appid=${API_KEY}&units=metric`
      );

      if (!weatherResponse.ok) {
        throw new Error("City not found");
      }

      const weatherData = await weatherResponse.json();

      setWeather(weatherData);
      setCity(weatherData.name);

      await getForecast(
        weatherData.coord.lat,
        weatherData.coord.lon
      );

    } catch (error) {
      setWeather(null);
      setForecast([]);
      setError("City not found. Please enter a valid city.");
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------
  // GET FORECAST
  // --------------------------------

  const getForecast = async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`
      );

      if (!response.ok) {
        throw new Error("Forecast unavailable");
      }

      const data = await response.json();

      const dailyForecast = [];

      data.list.forEach((item) => {
        const date = new Date(
          item.dt * 1000
        ).toLocaleDateString();

        if (!dailyForecast.some((day) => day.date === date)) {
          dailyForecast.push({
            date,

            day: new Date(
              item.dt * 1000
            ).toLocaleDateString("en-US", {
              weekday: "short",
            }),

            temp: Math.round(item.main.temp),

            description:
              item.weather[0].description,

            icon: item.weather[0].icon,

            humidity: item.main.humidity,
          });
        }
      });

      setForecast(dailyForecast.slice(0, 5));

    } catch (error) {
      setForecast([]);
    }
  };

  // --------------------------------
  // DETECT USER LOCATION
  // --------------------------------

  useEffect(() => {
    if (!navigator.geolocation) {
      setError(
        "Location is not supported. Please search for your city."
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } =
          position.coords;

        setLoading(true);

        try {
          const weatherResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`
          );

          if (!weatherResponse.ok) {
            throw new Error(
              "Location weather unavailable"
            );
          }

          const weatherData =
            await weatherResponse.json();

          setWeather(weatherData);
          setCity(weatherData.name);

          await getForecast(
            latitude,
            longitude
          );

        } catch (error) {
          setError(
            "Unable to get weather for your location."
          );
        } finally {
          setLoading(false);
        }
      },

      () => {
        setError(
          "Location permission was denied. Please search for your city."
        );
      }
    );
  }, []);

  // --------------------------------
  // SEARCH
  // --------------------------------

  const handleSearch = () => {
    getWeatherByCity(city);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      handleSearch();
    }
  };

  // --------------------------------
  // FORMAT CITY TIME
  // --------------------------------

  const formattedTime = cityTime.toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }
  );

  return (
    <div className="app">

      {/* TOP BAR */}

      <header className="top-bar">

        <div className="logo">
          🌤️ WeatherNow
        </div>

        <div className="clock">
          🕐 {formattedTime}
        </div>

      </header>


      {/* MAIN */}

      <main className="container">

        <div className="heading">

          <h1>
            Weather Forecast
          </h1>

          <p>
            Real-time weather and local time
          </p>

        </div>


        {/* SEARCH */}

        <div className="search">

          <input
            type="text"
            value={city}
            onChange={(e) =>
              setCity(e.target.value)
            }
            onKeyDown={handleKeyDown}
            placeholder="Search city..."
          />

          <button onClick={handleSearch}>
            Search
          </button>

        </div>


        {/* LOADING */}

        {loading && (
          <div className="message">
            Loading weather...
          </div>
        )}


        {/* ERROR */}

        {error && (
          <div className="error">
            {error}
          </div>
        )}


        {/* WEATHER */}

        {weather && !loading && (

          <>

            <section className="current-weather">

              <div className="city">

                📍 {weather.name},{" "}
                {weather.sys.country}

              </div>


              <div className="city-local-time">

                🕐 Local time in {weather.name}

                <strong>
                  {formattedTime}
                </strong>

              </div>


              <div className="main-weather">

                <img
                  src={`https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`}
                  alt="weather"
                />

                <div className="temperature">

                  {Math.round(
                    weather.main.temp
                  )}
                  °C

                </div>

              </div>


              <h2>

                {weather.weather[0].description}

              </h2>


              <div className="details">

                <div>

                  <span>
                    Feels Like
                  </span>

                  <strong>
                    {Math.round(
                      weather.main.feels_like
                    )}
                    °C
                  </strong>

                </div>


                <div>

                  <span>
                    Humidity
                  </span>

                  <strong>
                    {weather.main.humidity}%
                  </strong>

                </div>


                <div>

                  <span>
                    Wind
                  </span>

                  <strong>
                    {weather.wind.speed} m/s
                  </strong>

                </div>

              </div>

            </section>


            {/* FORECAST */}

            <section className="forecast-section">

              <h2>
                5-Day Forecast
              </h2>


              <div className="forecast">

                {forecast.map(
                  (day, index) => (

                    <div
                      className="forecast-card"
                      key={index}
                    >

                      <h3>
                        {day.day}
                      </h3>


                      <img
                        src={`https://openweathermap.org/img/wn/${day.icon}@2x.png`}
                        alt={day.description}
                      />


                      <h4>
                        {day.temp}°C
                      </h4>


                      <p>
                        {day.description}
                      </p>


                      <small>
                        💧 {day.humidity}%
                      </small>

                    </div>

                  )
                )}

              </div>

            </section>

          </>

        )}

      </main>


      {/* FOOTER */}

      <footer>

        <p>
          © 2026 WeatherNow
        </p>

        <p>
          Real-time weather powered by
          OpenWeatherMap
        </p>

      </footer>

    </div>
  );
}

export default App;
