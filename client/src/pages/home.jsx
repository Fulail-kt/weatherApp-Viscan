import { jwtDecode } from "jwt-decode";
import { useState, useEffect } from "react";
import {
  getWeatherData,
  getAirQualityData,
  getForecastData,
  getHistoricalWeatherData,
  getFavorites,
  addFavorite,
} from "../Apis";
import WeatherDisplay from "../components/WeatherDisplay";
import { useNavigate } from "react-router-dom";
import AccordionItem from "../components/accordian/favAccordion";

function Home() {
  const [weatherData, setWeatherData] = useState(null);
  const [searchCity, setSearchCity] = useState("");
  const [favorites, setFavorites] = useState([]);
  const [userId, setUserId] = useState("");
  const [isAddingFavorite, setIsAddingFavorite] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("vi_token");
    if (!token) {
      window.location.href = "/sign-in";
    }
    const decoded = jwtDecode(token);
    setUserId(decoded.id);
    fetchCurrentLocationWeather();
    fetchFavoriteCities(decoded.id);
  }, []);

  const fetchFavoriteCities = async (userId) => {
    const favs = await getFavorites(userId);
    setFavorites(favs || []);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchCity.trim()) {
      const data = await getWeatherData(null, null, searchCity.trim());
      if (data) {
        const airQualityResponse = await getAirQualityData(
          data.coord.lat,
          data.coord.lon
        );
        const forecast = await getForecastData(data.coord.lat, data.coord.lon);
        const pastWeather = await getHistoricalWeatherData(searchCity.trim());
        setWeatherData({
          ...data,
          airQuality: airQualityResponse,
          forecast,
          pastWeather,
        });
      }
    }
  };

  const addToFav = async () => {
    if (!weatherData || isAddingFavorite) return;

    const isCityInFavorites = favorites.some(
      (fav) => fav.city.toLowerCase() === weatherData.name.toLowerCase()
    );
    if (isCityInFavorites) {
      alert("This city is already in your favorites!");
      return;
    }

    setIsAddingFavorite(true);
    try {
      const response = await addFavorite(userId, weatherData.name);
      if (response) {
        const newFavorite = {
          id: response.id,
          city: weatherData.name,
          weather: {
            main: weatherData.main,
            weather: weatherData.weather,
          },
        };
        setFavorites((prevFavorites) => [...prevFavorites, newFavorite]);
      }
    } finally {
      setIsAddingFavorite(false);
    }
  };

  const fetchCurrentLocationWeather = () => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const data = await getWeatherData(latitude, longitude);
        if (data) {
          const airQualityResponse = await getAirQualityData(
            latitude,
            longitude
          );
          const forecast = await getForecastData(latitude, longitude);
          const pastWeather = await getHistoricalWeatherData(data.name);
          setWeatherData({
            ...data,
            airQuality: airQualityResponse,
            forecast,
            pastWeather,
          });
        }
      },
      (error) => {
        console.error("Error getting location:", error);
        getWeatherData(null, null, "New Delhi").then((data) => {
          setWeatherData(data);
        });
      }
    );
  };

  return (
    <div>
      <div className="w-full flex justify-center py-4">
        <button
          className="bg-red-600 rounded-md px-4 text-white py-1"
          onClick={() => {
            localStorage.removeItem("vi_token");
            navigate("/sign-in");
          }}
        >
          Sign Out
        </button>
      </div>
      <h1 className="text-3xl font-bold mb-4">Weather Dashboard</h1>
      <div className="flex gap-x-2 justify-center items-center py-4">
        <form onSubmit={handleSearch}>
          <input
            type="text"
            value={searchCity}
            onChange={(e) => setSearchCity(e.target.value)}
            placeholder="Enter city name"
            className="border border-gray-300 rounded-md px-3 py-2 mr-2"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 rounded-md"
          >
            Search
          </button>
        </form>
        <button
          onClick={addToFav}
          className={`bg-green-500 text-white px-4 py-2 rounded-md ${
            isAddingFavorite ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={isAddingFavorite}
        >
          {isAddingFavorite ? "Adding..." : "❤️"}
        </button>
      </div>

      {weatherData && <WeatherDisplay data={weatherData} />}
      <div className="mt-4">
        <h2 className="text-xl font-bold mb-2">Favorites</h2>
        <div className="space-y-2">
          {favorites.length > 0 ? (
            favorites.map((fav) => (
              <AccordionItem
                key={fav.id}
                city={fav.city}
                weather={fav.weather}
              />
            ))
          ) : (
            <p>No favorites yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;
