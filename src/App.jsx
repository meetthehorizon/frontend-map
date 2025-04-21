// src/App.jsx
import { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  useMap,
} from "react-leaflet";
import axios from "axios";
import "leaflet/dist/leaflet.css";
import "./App.css";
import { loadConfig, getApiUrl } from "./config/config";

// Fix Leaflet icon issue
import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

let RedIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Component to handle map view updates
function MapViewUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

// Component to handle map clicks for location selection
function LocationSelector({ setSearchLocation }) {
  useMapEvents({
    click: (e) => {
      setSearchLocation({
        lat: e.latlng.lat,
        lon: e.latlng.lng,
      });
    },
  });
  return null;
}

// Theme toggle component
function ThemeToggle({ theme, toggleTheme }) {
  return (
    <button className="theme-toggle" onClick={toggleTheme}>
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}

function App() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentLocation, setCurrentLocation] = useState({
    lat: 28.7041,
    lon: 77.1025,
  }); // Default to Delhi
  const [searchLocation, setSearchLocation] = useState(null);
  const [queryText, setQueryText] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [resultLimit, setResultLimit] = useState(5);
  const [searchRadius, setSearchRadius] = useState(10);
  const [manualLat, setManualLat] = useState("");
  const [manualLon, setManualLon] = useState("");
  const [isCustomLocationMode, setIsCustomLocationMode] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [theme, setTheme] = useState("light");

  // Load configuration on component mount
  useEffect(() => {
    async function initializeApp() {
      try {
        const config = await loadConfig();
        window.appConfig = config;

        // Set initial theme from config
        const savedTheme =
          localStorage.getItem("theme") || config.theme.defaultMode;
        setTheme(savedTheme);
        document.documentElement.setAttribute("data-theme", savedTheme);

        setConfigLoaded(true);
      } catch (error) {
        console.error("Failed to initialize app:", error);
        setError("Failed to load application configuration.");
      }
    }

    initializeApp();
  }, []);

  // Theme toggle function
  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  };

  // Get user location on component mount
  useEffect(() => {
    if (!configLoaded) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          };
          setCurrentLocation(newLocation);
          if (!searchLocation) {
            setSearchLocation(newLocation);
          }
        },
        (err) => {
          console.warn(`Error getting location: ${err.message}`);
          // If geolocation fails, use default and set it as search location too
          if (!searchLocation) {
            setSearchLocation({ lat: 28.7041, lon: 77.1025 });
          }
        }
      );
    } else {
      // If geolocation not supported, use default and set it as search location too
      if (!searchLocation) {
        setSearchLocation({ lat: 28.7041, lon: 77.1025 });
      }
    }
  }, [configLoaded]);

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!queryText.trim()) {
      setError("Please enter a search query");
      return;
    }

    const locationToUse = searchLocation || currentLocation;

    try {
      setLoading(true);
      setError(null);

      // Use the config API URL
      const response = await axios.post(getApiUrl("query"), {
        query_text: queryText,
        limit: parseInt(resultLimit) || 5,
        lat: locationToUse.lat,
        lon: locationToUse.lon,
        radius_meter: (parseFloat(searchRadius) || 10) * 1000, // Convert km to meters
      });

      setSites(response.data);
      setHasSearched(true);
    } catch (err) {
      setError(
        "Failed to fetch data. Please check if your API server is running."
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualLocationSubmit = (e) => {
    e.preventDefault();

    const lat = parseFloat(manualLat);
    const lon = parseFloat(manualLon);

    if (
      isNaN(lat) ||
      isNaN(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      setError(
        "Please enter valid coordinates (latitude: -90 to 90, longitude: -180 to 180)"
      );
      return;
    }

    setSearchLocation({ lat, lon });
    setError(null);
  };

  const resetToCurrentLocation = () => {
    setSearchLocation(currentLocation);
    setManualLat("");
    setManualLon("");
    setIsCustomLocationMode(false);
  };

  const toggleCustomLocationMode = () => {
    setIsCustomLocationMode(!isCustomLocationMode);
    if (!isCustomLocationMode) {
      setManualLat(searchLocation?.lat.toFixed(6) || "");
      setManualLon(searchLocation?.lon.toFixed(6) || "");
    }
  };

  // Calculate distance between two coordinates in kilometers
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2);
  };

  const locationToShow = searchLocation || currentLocation;

  // If config is not yet loaded, show loading state
  if (!configLoaded) {
    return (
      <div className="app-container">Loading application configuration...</div>
    );
  }

  return (
    <div className="app-container">
      <ThemeToggle theme={theme} toggleTheme={toggleTheme} />

      <header>
        <h1>Archaeological Sites Explorer</h1>

        <div className="control-panel">
          <div className="search-section">
            <h3>Search Settings</h3>
            <form onSubmit={handleSearch} className="search-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="query-text">Search Query:</label>
                  <input
                    id="query-text"
                    type="text"
                    value={queryText}
                    onChange={(e) => setQueryText(e.target.value)}
                    placeholder="Enter search terms"
                    className="form-control"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group half">
                  <label htmlFor="result-limit">Results Limit:</label>
                  <input
                    id="result-limit"
                    type="number"
                    min="1"
                    max="50"
                    value={resultLimit}
                    onChange={(e) => setResultLimit(e.target.value)}
                    className="form-control"
                  />
                </div>

                <div className="form-group half">
                  <label htmlFor="search-radius">Radius (km):</label>
                  <input
                    id="search-radius"
                    type="number"
                    min="1"
                    max="1000"
                    value={searchRadius}
                    onChange={(e) => setSearchRadius(e.target.value)}
                    className="form-control"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="primary-button"
                disabled={loading}
              >
                {loading ? "Searching..." : "Search"}
              </button>
            </form>
          </div>

          <div className="location-section">
            <h3>Location Settings</h3>
            <div className="location-toggle">
              <button
                className={`toggle-button ${
                  isCustomLocationMode ? "" : "active"
                }`}
                onClick={() => setIsCustomLocationMode(false)}
              >
                Map Selection
              </button>
              <button
                className={`toggle-button ${
                  isCustomLocationMode ? "active" : ""
                }`}
                onClick={() => setIsCustomLocationMode(true)}
              >
                Manual Coordinates
              </button>
            </div>

            {isCustomLocationMode ? (
              <form
                onSubmit={handleManualLocationSubmit}
                className="coordinates-form"
              >
                <div className="form-row">
                  <div className="form-group half">
                    <label htmlFor="manual-lat">Latitude:</label>
                    <input
                      id="manual-lat"
                      type="text"
                      value={manualLat}
                      onChange={(e) => setManualLat(e.target.value)}
                      placeholder="e.g. 28.7041"
                      className="form-control"
                      required
                    />
                  </div>

                  <div className="form-group half">
                    <label htmlFor="manual-lon">Longitude:</label>
                    <input
                      id="manual-lon"
                      type="text"
                      value={manualLon}
                      onChange={(e) => setManualLon(e.target.value)}
                      placeholder="e.g. 77.1025"
                      className="form-control"
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="secondary-button">
                  Set Location
                </button>
              </form>
            ) : (
              <div className="map-instructions">
                <p>Click anywhere on the map to set your search location</p>
              </div>
            )}

            <div className="current-location-info">
              <p>
                <strong>Current Search Location:</strong>
                <br />
                Lat: {searchLocation?.lat.toFixed(6) || "Loading..."}, Lon:{" "}
                {searchLocation?.lon.toFixed(6) || "Loading..."}
              </p>
              <button onClick={resetToCurrentLocation} className="reset-button">
                Reset to My Location
              </button>
            </div>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
      </header>

      <div className="map-container">
        <MapContainer
          center={[locationToShow.lat, locationToShow.lon]}
          zoom={10}
          style={{ height: "600px", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          <MapViewUpdater center={[locationToShow.lat, locationToShow.lon]} />
          <LocationSelector setSearchLocation={setSearchLocation} />

          {/* Current actual location marker */}
          <Marker position={[currentLocation.lat, currentLocation.lon]}>
            <Popup>
              <div className="current-location-popup">
                <h3>Your Current Location</h3>
              </div>
            </Popup>
          </Marker>

          {/* Search location marker (if different from current) */}
          {searchLocation &&
            (searchLocation.lat !== currentLocation.lat ||
              searchLocation.lon !== currentLocation.lon) && (
              <Marker
                position={[searchLocation.lat, searchLocation.lon]}
                icon={RedIcon}
              >
                <Popup>
                  <div className="search-location-popup">
                    <h3>Search Location</h3>
                    <p>This is the center point for your search.</p>
                  </div>
                </Popup>
              </Marker>
            )}

          {/* Archaeological site markers */}
          {sites.map((site) => (
            <Marker
              key={site.id}
              position={[site.payload.location.lat, site.payload.location.lon]}
            >
              <Popup>
                <div className="site-popup">
                  <h3>{site.payload.article_title}</h3>
                  <p className="distance">
                    Distance from search point:{" "}
                    {getDistance(
                      searchLocation?.lat || currentLocation.lat,
                      searchLocation?.lon || currentLocation.lon,
                      site.payload.location.lat,
                      site.payload.location.lon
                    )}{" "}
                    km
                  </p>
                  <div className="site-text">
                    <p>{site.payload.text}</p>
                  </div>
                  <p className="score">
                    Relevance Score: {site.score.toFixed(2)}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {hasSearched && sites.length > 0 && (
        <div className="results-section">
          <h2>Search Results</h2>
          <div className="results-grid">
            {sites.map((site) => (
              <div key={site.id} className="result-card">
                <h3>{site.payload.article_title}</h3>
                <p className="distance">
                  Distance:{" "}
                  {getDistance(
                    searchLocation?.lat || currentLocation.lat,
                    searchLocation?.lon || currentLocation.lon,
                    site.payload.location.lat,
                    site.payload.location.lon
                  )}{" "}
                  km
                </p>
                <p className="result-excerpt">
                  {site.payload.text.substring(0, 100)}...
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasSearched && sites.length === 0 && (
        <div className="no-results">
          <p>
            No archaeological sites found for your query. Try different search
            parameters.
          </p>
        </div>
      )}
    </div>
  );
}

export default App;
