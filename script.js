// W35 Project 04 — API Showcase Portfolio (capstone)
// Pick 2+ APIs and replace the sample data + stub TODOs with real integrations.
// 8 TODOs total — see README.md for the full picture.

// ===================================
// Utility Functions
// ===================================

// ===================================
// API Configuration (PRE-BUILT)
// ===================================

const API_CONFIGS = {
    'combo-1': {
        primary: {
            name: 'OpenWeatherMap',
            apiKey: 'da2cbc4805c5a02f88753f2f2d470f66', // Replace with your actual API key from https://openweathermap.org/api
            baseUrl: 'https://api.openweathermap.org/data/2.5',
            defaultParams: {}
        },
        secondary: {
            name: 'CatApi',
            apiKey: 'live_SIocEvuAGbjOF3zpqC7XUE6f01ov8AYDSLVeHalbHAmQsySm1j8Hnovd167XggQy',
            baseUrl: 'https://api.thecatapi.com/v1',
            defaultParams: {}
        }
    }
};

// ===================================
// State Management (PRE-BUILT)
// ===================================

const state = {
    currentCombo: 'combo-1',
    theme: 'light',
    view: 'grid',

    // Primary API state
    primaryData: [],
    primaryPage: 1,
    primaryTotalPages: 1,
    primaryFiltered: [],

    // Secondary API state
    secondaryData: [],
    secondaryPage: 1,
    secondaryTotalPages: 1,
    secondaryFiltered: [],

    // Search & Filter state
    searchQuery: '',
    filterCategory: 'all',
    sortBy: 'date-desc',

    plantFilters: {
        edibleOnly: false,
        native: '',
        flowerColor: ''
    },

    // User data
    favorites: [],

    // Statistics
    stats: {
        itemsViewed: 0,
        searches: 0,
        cacheHits: 0,
        totalFavorites: 0
    },

    // Weather history for chart
    weatherHistory: [],

    // Time-based weather data for line chart
    weatherTimeSeries: {
        labels: [], // timestamps
        locations: {} // { locationName: { color: string, temperature: [], humidity: [] } }
    },

    // Favorites for cats and locations
    userFavorites: {
        cats: [],
        locations: []
    }
};

// ===================================
// Cache Management (PRE-BUILT)
// ===================================

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

class CacheManager {
    // TODO 5: read localStorage[key], return parsed data if younger than
    // CACHE_DURATION, else clean up + return null.
    // Verify: re-fetching within 5 min increments stats.cacheHits.
    static get(key) {
        if(localStorage[key]){
            const cached = JSON.parse(localStorage[key]);
            if(Date.now() - cached.timestamp < CACHE_DURATION){
                state.stats.cacheHits++;
                return cached.data;
            }
            localStorage.removeItem(key);
        }
        return null;
    }

    // TODO 5: write { data, timestamp } JSON to localStorage[key].
    static set(key, data) {
        localStorage.setItem(key, JSON.stringify({
            data: data,
            timestamp: Date.now()
        }));
    }

    static clear(key) {
        localStorage.removeItem(key);
    }

    static clearAll() {
        Object.keys(localStorage)
            .filter(key => key.startsWith('cache_'))
            .forEach(key => localStorage.removeItem(key));
    }
}

// ===================================
// Weather Functions
// ===================================

async function getCoordinates(location) {
    console.log('Current combo:', state.currentCombo);
    console.log('API_CONFIGS:', API_CONFIGS);
    const apiKey = API_CONFIGS[state.currentCombo]?.primary?.apiKey;
    console.log('API Key found:', apiKey);
    console.log('API Key type:', typeof apiKey);
    console.log('API Key length:', apiKey?.length);
    
    if (!apiKey || apiKey === 'YOUR_OPENWEATHERMAP_API_KEY' || apiKey.length === 0) {
        console.error('API key validation failed');
        throw new Error('Please set your OpenWeatherMap API key in API_CONFIGS');
    }

    const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${apiKey}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data && data.length > 0) {
            return {
                lat: data[0].lat,
                lon: data[0].lon,
                name: data[0].name,
                country: data[0].country
            };
        }
        return null;
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
}

// ===================================
// API Fetch Functions (PARTIAL - NEEDS TODO)
// ===================================

async function fetchPrimaryAPI(page = 1) {
    const panelId = 'primary';
    showLoading(panelId);
    hideError(panelId);

    try {
        const config = API_CONFIGS[state.currentCombo].primary;
        const cacheKey = `cache_primary_${page}`;
        
        // Check cache first
        const cachedData = CacheManager.get(cacheKey);
        if (cachedData) {
            state.primaryData = cachedData;
            state.primaryPage = page;
            displayPrimaryData();
            hideLoading(panelId);
            return;
        }
        
        // Build URL with token and page
        const token = config.defaultParams.token || config.apiKey;
        const url = `${config.baseUrl}?token=${token}&page=${page}`;
        
        const response = await fetch(url);
        const jsonData = await response.json();
        
        // Transform API data to standard format
        const transformedData = Array.isArray(jsonData?.data) ? jsonData.data.map(item => ({
            id: item.id || `plant-${Date.now()}-${Math.random()}`,
            title: item.common_name || item.scientific_name || 'Unknown Plant',
            description: item.family || 'No description available',
            image: item.image_url || null,
            category: 'Plants',
            date: new Date().toLocaleDateString()
        })) : [];
        
        // Update state
        state.primaryData = transformedData;
        state.primaryPage = page;
        state.primaryTotalPages = jsonData?.meta?.total_pages || 1;
        
        // Cache the data
        CacheManager.set(cacheKey, transformedData);
        
        displayPrimaryData();
        hideLoading(panelId);
    } catch (error) {
        console.error('Primary API Error:', error);
        showError(panelId, error.message);
        hideLoading(panelId);
    }
}

async function fetchSecondaryAPI(page = 1) {
    const panelId = 'secondary';
    showLoading(panelId);
    hideError(panelId);

    try {
        const config = API_CONFIGS[state.currentCombo].secondary;
        const cacheKey = `cache_secondary_${page}`;
        
        // Check cache first
        const cachedData = CacheManager.get(cacheKey);
        if (cachedData) {
            state.secondaryData = cachedData;
            state.secondaryPage = page;
            displaySecondaryData();
            hideLoading(panelId);
            return;
        }
        
        // Build URL with API key header
        const url = `${config.baseUrl}/breeds`;
        const response = await fetch(url, {
            headers: {
                'x-api-key': config.apiKey
            }
        });
        const jsonData = await response.json();
        
        // Transform API data to standard format
        const transformedData = Array.isArray(jsonData) ? jsonData.map(item => ({
            id: item.id || `cat-${Date.now()}-${Math.random()}`,
            title: item.name || 'Unknown Breed',
            description: item.temperament || item.description || 'No description available',
            image: item.image?.url || null,
            category: 'Cat Breeds',
            date: new Date().toLocaleDateString()
        })) : [];
        
        // Update state
        state.secondaryData = transformedData;
        state.secondaryPage = page;
        state.secondaryTotalPages = 1;
        
        // Cache the data
        CacheManager.set(cacheKey, transformedData);
        
        displaySecondaryData();
        hideLoading(panelId);
    } catch (error) {
        console.error('Secondary API Error:', error);
        showError(panelId, error.message);
        hideLoading(panelId);
    }
}

async function fetchCats() {
    const resultsEl = document.getElementById('cats-results');
    if (!resultsEl) return;

    const searchQuery = document.getElementById('cat-search')?.value?.trim() ?? '';
    const apiKey = API_CONFIGS[state.currentCombo]?.secondary?.apiKey;
    
    const url = 'https://api.thecatapi.com/v1/breeds';

    resultsEl.innerHTML = '<p style="color: var(--text-secondary); padding: 1rem;">Loading cat breeds...</p>';

    try {
        const res = await fetch(url, {
            headers: {
                'x-api-key': apiKey
            }
        });
        if (!res.ok) throw new Error(`Request failed: ${res.status} ${res.statusText}`);
        const items = await res.json();

        // Filter breeds client-side based on search query
        let filteredItems = items;
        if (searchQuery) {
            filteredItems = items.filter(item => 
                item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.origin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.temperament?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (!filteredItems.length) {
            resultsEl.innerHTML = '<p style="color: var(--text-muted); padding: 1rem;">No cat breeds found. Try a different search term.</p>';
            return;
        }

        resultsEl.innerHTML = '';
        const list = document.createElement('div');
        list.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem; padding: 1rem;';
        
        filteredItems.slice(0, 10).forEach(item => {
            const card = document.createElement('div');
            card.style.cssText = 'padding: 1rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-secondary); cursor: pointer; transition: var(--transition);';
            
            const catImage = item.image?.url || '';
            
            card.innerHTML = `
                ${catImage ? `<img src="${catImage}" alt="${item.name}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; margin-bottom: 0.5rem;" onerror="this.style.display='none'">` : '<div style="width: 100%; height: 150px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); border-radius: 8px; margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: center; font-size: 2rem;">🐱</div>'}
                <h4 style="margin: 0 0 0.5rem 0; color: var(--text-primary);">${item.name || 'Unknown breed'}</h4>
                <p style="margin: 0; color: var(--text-secondary); font-size: 0.9rem;">Origin: ${item.origin || 'Unknown'}</p>
            `;
            card.addEventListener('click', () => {
                alert(`Breed: ${item.name}\nOrigin: ${item.origin || 'Unknown'}\nTemperament: ${item.temperament || 'Unknown'}`);
            });
            list.appendChild(card);
        });
        resultsEl.appendChild(list);
    } catch (err) {
        console.error('Fetch cats error:', err);
        resultsEl.innerHTML = `<p style="color: var(--accent-color); padding: 1rem;">Error: ${err?.message ?? 'Failed to load cat breeds'}. Check API key or try again.</p>`;
    }
}

async function fetchWeather(lat, lon) {
    const apiKey = API_CONFIGS[state.currentCombo]?.primary?.apiKey;
    console.log('fetchWeather API Key:', apiKey);

    if (!apiKey || apiKey === 'YOUR_OPENWEATHERMAP_API_KEY' || apiKey.length === 0) {
        throw new Error('Please set your OpenWeatherMap API key in API_CONFIGS');
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Weather API error:', error);
        return null;
    }
}

// ===================================
// Weather Helper Functions
// ===================================

function getWeatherEmoji(description) {
    const desc = description.toLowerCase();
    if (desc.includes('clear') || desc.includes('sunny')) return '☀️';
    if (desc.includes('cloud')) return '☁️';
    if (desc.includes('rain') || desc.includes('drizzle')) return '🌧️';
    if (desc.includes('thunder') || desc.includes('storm')) return '⛈️';
    if (desc.includes('snow')) return '❄️';
    if (desc.includes('mist') || desc.includes('fog')) return '🌫️';
    if (desc.includes('few clouds')) return '🌤️';
    if (desc.includes('scattered clouds')) return '⛅';
    if (desc.includes('broken clouds')) return '☁️';
    return '🌡️'; // Default
}

// ===================================
// Favorites Functions
// ===================================

function addFavorite(type, data) {
    // Check if already exists
    if (type === 'location') {
        const exists = state.userFavorites.locations.some(f => f.data.name === data.name);
        if (exists) {
            alert('This location is already in your favorites!');
            return;
        }
    } else if (type === 'cat') {
        const exists = state.userFavorites.cats.some(f => f.data.url === data.url);
        if (exists) {
            alert('This cat is already in your favorites!');
            return;
        }
    }

    const favorite = {
        id: Date.now(),
        type: type,
        data: data,
        timestamp: new Date().toISOString()
    };

    if (type === 'cat') {
        state.userFavorites.cats.push(favorite);
    } else if (type === 'location') {
        state.userFavorites.locations.push(favorite);
    }

    saveFavorites();
    renderFavorites();
}

function removeFavorite(id, type) {
    if (type === 'cat') {
        state.userFavorites.cats = state.userFavorites.cats.filter(f => f.id !== id);
    } else if (type === 'location') {
        state.userFavorites.locations = state.userFavorites.locations.filter(f => f.id !== id);
    }

    saveFavorites();
    renderFavorites();
}

// Make functions globally accessible
window.addFavorite = addFavorite;
window.removeFavorite = removeFavorite;

function isFavorite(type, data) {
    const list = type === 'cat' ? state.userFavorites.cats : state.userFavorites.locations;
    return list.some(f => f.data.url === data.url || f.data.name === data.name);
}

function saveFavorites() {
    localStorage.setItem('userFavorites', JSON.stringify(state.userFavorites));
}

function loadFavorites() {
    const saved = localStorage.getItem('userFavorites');
    if (saved) {
        state.userFavorites = JSON.parse(saved);
        renderFavorites();
    }
}

function renderFavorites() {
    const favoritesList = document.getElementById('favorites-list');
    if (!favoritesList) return;

    const allFavorites = [
        ...state.userFavorites.cats.map(f => ({...f, displayType: 'Cat'})),
        ...state.userFavorites.locations.map(f => ({...f, displayType: 'Location'}))
    ];

    if (allFavorites.length === 0) {
        favoritesList.innerHTML = '<p class="empty-favorites">No favorites yet. Click the ⭐ button on cats or locations to save them!</p>';
        return;
    }

    favoritesList.innerHTML = '';

    allFavorites.forEach(favorite => {
        const item = document.createElement('div');
        item.className = 'favorite-item';

        if (favorite.displayType === 'Cat') {
            item.innerHTML = `
                <button class="remove-favorite-btn" data-id="${favorite.id}" data-type="cat">✕</button>
                <img src="${favorite.data.url}" alt="Cat" class="favorite-item-image" onerror="this.onerror=null; this.src='https://placekitten.com/280/150';">
                <div class="favorite-item-info">
                    <span class="favorite-item-type">🐱 Cat</span>
                    <h3>Random Cat</h3>
                    <p>Added: ${new Date(favorite.timestamp).toLocaleDateString()}</p>
                </div>
            `;
        } else {
            item.innerHTML = `
                <button class="remove-favorite-btn" data-id="${favorite.id}" data-type="location">✕</button>
                <div class="favorite-item-info">
                    <span class="favorite-item-type">🌍 Location</span>
                    <h3>${favorite.data.name}</h3>
                    <p>${favorite.data.temp}°C - ${favorite.data.description}</p>
                    <p>Added: ${new Date(favorite.timestamp).toLocaleDateString()}</p>
                </div>
            `;
        }

        // Add event listener for remove button
        const removeBtn = item.querySelector('.remove-favorite-btn');
        removeBtn.addEventListener('click', () => {
            removeFavorite(parseInt(removeBtn.dataset.id), removeBtn.dataset.type);
        });

        favoritesList.appendChild(item);
    });
}

// ===================================
// Chart Functions
// ===================================

let weatherChart = null;
let currentChartType = 'bar';
let currentDataType = 'both';

function initChart(chartType = 'bar') {
    const ctx = document.getElementById('weatherChart');
    if (!ctx) return;

    // Destroy existing chart if it exists
    if (weatherChart) {
        weatherChart.destroy();
    }

    currentChartType = chartType;

    // Generate simulated historical data if not already generated
    if (state.weatherTimeSeries.labels.length === 0) {
        generateHistoricalData();
    }

    const chartConfig = getChartConfig(chartType);
    weatherChart = new Chart(ctx, chartConfig);
}

function generateHistoricalData() {
    // Generate simulated data for the past 5 hours for a default location
    const now = new Date();
    const locationName = 'London';
    const locationColor = getRandomColor();

    state.weatherTimeSeries.locations[locationName] = {
        color: locationColor,
        temperature: [],
        humidity: []
    };

    for (let i = 5; i >= 1; i--) {
        const pastTime = new Date(now.getTime() - (i * 60 * 60 * 1000));
        const timeLabel = pastTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Generate realistic temperature and humidity variations
        const baseTemp = 20 + Math.random() * 10; // 20-30°C range
        const baseHumidity = 50 + Math.random() * 30; // 50-80% range

        state.weatherTimeSeries.labels.push(timeLabel);
        state.weatherTimeSeries.locations[locationName].temperature.push(Math.round(baseTemp));
        state.weatherTimeSeries.locations[locationName].humidity.push(Math.round(baseHumidity));
    }
}

function getRandomColor() {
    // Generate a random color using HSL for better variety and visibility
    const hue = Math.floor(Math.random() * 360);
    const saturation = 70 + Math.floor(Math.random() * 30); // 70-100% for vibrant colors
    const lightness = 45 + Math.floor(Math.random() * 20); // 45-65% for good visibility on dark backgrounds
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function getChartConfig(chartType) {
    const baseConfig = {
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: '#ffffff'
                    }
                }
            }
        }
    };

    if (chartType === 'bar') {
        // Bar chart uses location-based data
        // Transform time-series data to location-based averages
        const locationLabels = [];
        const tempData = [];
        const humidData = [];

        // Check if there's any data
        if (Object.keys(state.weatherTimeSeries.locations).length === 0) {
            // No data yet, return empty chart
            baseConfig.data.labels = ['No Data'];
            baseConfig.data.datasets = [{
                label: 'Temperature (°C)',
                data: [0],
                backgroundColor: 'rgba(233, 69, 96, 0.6)',
                borderColor: 'rgba(233, 69, 96, 1)',
                borderWidth: 2
            }];
            baseConfig.type = 'bar';
            baseConfig.options.scales = {
                y: {
                    beginAtZero: true,
                    max: 50,
                    title: { display: true, text: 'Temperature (°C)', color: '#ffffff' },
                    ticks: { color: '#a0a0a0' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                },
                x: {
                    title: { display: true, text: 'Location', color: '#ffffff' },
                    ticks: { color: '#a0a0a0' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                }
            };
            return baseConfig;
        }

        Object.entries(state.weatherTimeSeries.locations).forEach(([locationName, locationData]) => {
            locationLabels.push(locationName);
            // Calculate average for this location
            if (locationData.temperature.length > 0) {
                const avgTemp = Math.round(locationData.temperature.reduce((a, b) => a + b, 0) / locationData.temperature.length);
                tempData.push(avgTemp);
            } else {
                tempData.push(0);
            }
            if (locationData.humidity.length > 0) {
                const avgHumid = Math.round(locationData.humidity.reduce((a, b) => a + b, 0) / locationData.humidity.length);
                humidData.push(avgHumid);
            } else {
                humidData.push(0);
            }
        });

        baseConfig.data.labels = locationLabels;

        // Create datasets based on data type
        const datasets = [];
        if (currentDataType === 'both' || currentDataType === 'temperature') {
            datasets.push({
                label: 'Temperature (°C)',
                data: tempData,
                backgroundColor: 'rgba(233, 69, 96, 0.6)',
                borderColor: 'rgba(233, 69, 96, 1)',
                borderWidth: 2,
                yAxisID: currentDataType === 'both' ? 'y' : 'y'
            });
        }

        if (currentDataType === 'both' || currentDataType === 'humidity') {
            datasets.push({
                label: 'Humidity (%)',
                data: humidData,
                backgroundColor: 'rgba(99, 102, 241, 0.6)',
                borderColor: 'rgba(99, 102, 241, 1)',
                borderWidth: 2,
                yAxisID: currentDataType === 'both' ? 'y1' : 'y'
            });
        }

        baseConfig.data.datasets = datasets;

        baseConfig.type = 'bar';

        // Configure scales based on data type
        if (currentDataType === 'temperature') {
            baseConfig.options.scales = {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    max: 50,
                    title: {
                        display: true,
                        text: 'Temperature (°C)',
                        color: '#ffffff'
                    },
                    ticks: { color: '#a0a0a0' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Location',
                        color: '#ffffff'
                    },
                    ticks: { color: '#a0a0a0' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                }
            };
        } else if (currentDataType === 'humidity') {
            baseConfig.options.scales = {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Humidity (%)',
                        color: '#ffffff'
                    },
                    ticks: { color: '#a0a0a0' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Location',
                        color: '#ffffff'
                    },
                    ticks: { color: '#a0a0a0' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                }
            };
        } else {
            // Both - dual Y-axes
            baseConfig.options.scales = {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    max: 50,
                    title: {
                        display: true,
                        text: 'Temperature (°C)',
                        color: '#ffffff'
                    },
                    ticks: { color: '#a0a0a0' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Humidity (%)',
                        color: '#ffffff'
                    },
                    ticks: { color: '#a0a0a0' },
                    grid: { drawOnChartArea: false }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Location',
                        color: '#ffffff'
                    },
                    ticks: { color: '#a0a0a0' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                }
            };
        }
    } else if (chartType === 'line') {
        // Line chart uses time-based data with multiple locations
        // Check if there's any data
        if (state.weatherTimeSeries.labels.length === 0 || Object.keys(state.weatherTimeSeries.locations).length === 0) {
            baseConfig.data.labels = ['No Data'];
            baseConfig.data.datasets = [{
                label: 'Temperature (°C)',
                data: [0],
                borderColor: '#FF6384',
                backgroundColor: '#FF638433',
                borderWidth: 3,
                tension: 0,
                fill: false
            }];
            baseConfig.type = 'line';
            baseConfig.options.scales = {
                y: {
                    beginAtZero: true,
                    max: 50,
                    title: { display: true, text: 'Temperature (°C)', color: '#ffffff' },
                    ticks: { color: '#a0a0a0' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                },
                x: {
                    title: { display: true, text: 'Time', color: '#ffffff' },
                    ticks: { color: '#a0a0a0' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                }
            };
            return baseConfig;
        }

        baseConfig.data.labels = state.weatherTimeSeries.labels;

        // Create datasets for each location based on data type
        const datasets = [];
        Object.entries(state.weatherTimeSeries.locations).forEach(([locationName, locationData]) => {
            if (currentDataType === 'both' || currentDataType === 'temperature') {
                // Temperature dataset for this location
                datasets.push({
                    label: `${locationName} - Temperature`,
                    data: locationData.temperature,
                    borderColor: locationData.color,
                    backgroundColor: locationData.color + '33',
                    borderWidth: 3,
                    tension: 0,
                    fill: false,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    yAxisID: 'y',
                    spanGaps: true
                });
            }

            if (currentDataType === 'both' || currentDataType === 'humidity') {
                // Humidity dataset for this location
                datasets.push({
                    label: `${locationName} - Humidity`,
                    data: locationData.humidity,
                    borderColor: locationData.color,
                    backgroundColor: locationData.color + '33',
                    borderWidth: 3,
                    tension: 0,
                    fill: false,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    yAxisID: 'y1',
                    borderDash: [5, 5],
                    spanGaps: true
                });
            }
        });

        baseConfig.data.datasets = datasets;
        baseConfig.type = 'line';

        // Configure scales based on data type
        if (currentDataType === 'temperature') {
            baseConfig.options.scales = {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    max: 50,
                    title: {
                        display: true,
                        text: 'Temperature (°C)',
                        color: '#ffffff'
                    },
                    ticks: { color: '#a0a0a0' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Time',
                        color: '#ffffff'
                    },
                    ticks: { color: '#a0a0a0' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                }
            };
        } else if (currentDataType === 'humidity') {
            baseConfig.options.scales = {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Humidity (%)',
                        color: '#ffffff'
                    },
                    ticks: { color: '#a0a0a0' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Time',
                        color: '#ffffff'
                    },
                    ticks: { color: '#a0a0a0' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                }
            };
        } else {
            // Both - dual Y-axes
            baseConfig.options.scales = {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    max: 50,
                    title: {
                        display: true,
                        text: 'Temperature (°C)',
                        color: '#ffffff'
                    },
                    ticks: { color: '#a0a0a0' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Humidity (%)',
                        color: '#ffffff'
                    },
                    ticks: { color: '#a0a0a0' },
                    grid: { drawOnChartArea: false }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Time',
                        color: '#ffffff'
                    },
                    ticks: { color: '#a0a0a0' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                }
            };
        }
    } else if (chartType === 'radar') {
        // Radar chart uses time-based data
        // Check if there's any data
        if (state.weatherTimeSeries.labels.length === 0 || Object.keys(state.weatherTimeSeries.locations).length === 0) {
            baseConfig.data.labels = ['No Data'];
            baseConfig.data.datasets = [{
                label: 'Temperature (°C)',
                data: [0],
                borderColor: '#FF6384',
                backgroundColor: '#FF638433',
                borderWidth: 2,
                pointRadius: 4
            }];
            baseConfig.type = 'radar';
            baseConfig.options.scales = {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { color: '#a0a0a0', backdropColor: 'transparent' },
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    pointLabels: { color: '#ffffff' }
                }
            };
            return baseConfig;
        }

        baseConfig.data.labels = state.weatherTimeSeries.labels;

        // Create datasets for each location based on data type
        const datasets = [];
        Object.entries(state.weatherTimeSeries.locations).forEach(([locationName, locationData]) => {
            if (currentDataType === 'both' || currentDataType === 'temperature') {
                datasets.push({
                    label: `${locationName} - Temperature`,
                    data: locationData.temperature.map(temp => temp ? (temp / 50) * 100 : null),
                    borderColor: locationData.color,
                    backgroundColor: locationData.color + '33',
                    borderWidth: 2,
                    pointRadius: 4,
                    spanGaps: true
                });
            }

            if (currentDataType === 'both' || currentDataType === 'humidity') {
                datasets.push({
                    label: `${locationName} - Humidity`,
                    data: locationData.humidity,
                    borderColor: locationData.color,
                    backgroundColor: locationData.color + '33',
                    borderWidth: 2,
                    pointRadius: 4,
                    borderDash: [5, 5],
                    spanGaps: true
                });
            }
        });

        baseConfig.data.datasets = datasets;
        baseConfig.type = 'radar';
        baseConfig.options.scales = {
            r: {
                beginAtZero: true,
                max: 100,
                ticks: { color: '#a0a0a0', backdropColor: 'transparent' },
                grid: { color: 'rgba(255,255,255,0.1)' },
                pointLabels: { color: '#ffffff' }
            }
        };
    }

    return baseConfig;
}

function updateChart(location, temperature, humidity) {
    if (!weatherChart) {
        initChart();
    }

    // Create or update location data
    if (!state.weatherTimeSeries.locations[location]) {
        state.weatherTimeSeries.locations[location] = {
            color: getRandomColor(),
            temperature: [],
            humidity: []
        };

        // Fill in missing data points for existing time labels with simulated historical data
        const existingTimePoints = state.weatherTimeSeries.labels.length;
        for (let i = 0; i < existingTimePoints; i++) {
            // Generate realistic variations based on current temperature
            const tempVariation = temperature + (Math.random() * 6 - 3); // ±3°C variation
            // Use realistic humidity range (50-80%) instead of current humidity
            const humidVariation = 50 + Math.random() * 30; // 50-80% range
            state.weatherTimeSeries.locations[location].temperature.push(Math.round(Math.max(0, tempVariation)));
            state.weatherTimeSeries.locations[location].humidity.push(Math.round(humidVariation));
        }
    } else {
        // Location exists, add new time label and data point
        const now = new Date();
        const timeLabel = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        state.weatherTimeSeries.labels.push(timeLabel);

        // Add data to location
        state.weatherTimeSeries.locations[location].temperature.push(temperature);
        state.weatherTimeSeries.locations[location].humidity.push(humidity);

        // Add data points for all other existing locations at this new time
        Object.keys(state.weatherTimeSeries.locations).forEach(loc => {
            if (loc !== location) {
                const existingData = state.weatherTimeSeries.locations[loc];
                const lastTemp = existingData.temperature[existingData.temperature.length - 1];
                const lastHumid = existingData.humidity[existingData.humidity.length - 1];
                // Generate small variations from last known values
                const tempVariation = lastTemp + (Math.random() * 2 - 1); // ±1°C variation
                const humidVariation = lastHumid + (Math.random() * 10 - 5); // ±5% variation
                existingData.temperature.push(Math.round(Math.max(0, tempVariation)));
                existingData.humidity.push(Math.round(Math.max(0, Math.min(100, humidVariation))));
            }
        });
    }

    // Keep only last 5 time points for all locations (5-hour timeframe)
    if (state.weatherTimeSeries.labels.length > 5) {
        state.weatherTimeSeries.labels.shift();
        Object.keys(state.weatherTimeSeries.locations).forEach(loc => {
            state.weatherTimeSeries.locations[loc].temperature.shift();
            state.weatherTimeSeries.locations[loc].humidity.shift();
        });
    }

    // Update chart based on current type
    // Always reinitialize to ensure data consistency across chart types
    initChart(currentChartType);
}

function clearChart() {
    if (weatherChart) {
        weatherChart.data.labels = [];
        weatherChart.data.datasets.forEach(dataset => {
            dataset.data = [];
        });
        weatherChart.update();
    }
    state.weatherHistory = [];

    // Clear time series data
    state.weatherTimeSeries = {
        labels: [],
        locations: {}
    };

    // Reset chart type to bar
    const chartTypeSelect = document.getElementById('chartType');
    if (chartTypeSelect) {
        chartTypeSelect.value = 'bar';
    }

    // Reset data type to both
    const dataTypeSelect = document.getElementById('dataType');
    if (dataTypeSelect) {
        dataTypeSelect.value = 'both';
        currentDataType = 'both';
    }

    initChart('bar');
}

async function generateRandomRecommendation(location = null) {
    const resultsEl = document.getElementById('random-recommendation');
    if (!resultsEl) return;

    resultsEl.innerHTML = '<p style="color: var(--text-secondary); padding: 1rem;">Loading weather and cat...</p>';

    try {
        let weatherData = null;
        let locationName = '';
        let weatherError = null;

        // Fetch weather data if location is provided
        if (location) {
            try {
                // Check if location is coordinates (lat,lon format) or city name
                let lat, lon;
                
                if (location.includes(',')) {
                    // Assume coordinates format: "lat,lon"
                    const coords = location.split(',').map(c => parseFloat(c.trim()));
                    if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                        lat = coords[0];
                        lon = coords[1];
                        locationName = `Coordinates: ${lat}, ${lon}`;
                    }
                }
                
                if (lat && lon) {
                    weatherData = await fetchWeather(lat, lon);
                } else {
                    // Try geocoding for city names
                    const coords = await getCoordinates(location);
                    if (coords) {
                        weatherData = await fetchWeather(coords.lat, coords.lon);
                        locationName = `${coords.name}, ${coords.country}`;
                    }
                }

                // Add to chart if weather data was successfully fetched
                if (weatherData && weatherData.main) {
                    const temp = Math.round(weatherData.main.temp || 0);
                    const humidity = Math.round(weatherData.main.humidity || 0);
                    const chartLocation = locationName || location;
                    updateChart(chartLocation, temp, humidity);
                    state.weatherHistory.push({ location: chartLocation, temperature: temp, humidity: humidity });
                }
            } catch (error) {
                console.error('Weather fetch error:', error);
                weatherError = error.message;
            }
        }

        // Fetch a random cat image from Cat API
        const apiKey = API_CONFIGS[state.currentCombo]?.secondary?.apiKey;
        let catImageUrl = '';
        
        try {
            const catResponse = await fetch('https://api.thecatapi.com/v1/images/search', {
                headers: {
                    'x-api-key': apiKey
                }
            });
            const catData = await catResponse.json();
            if (catData && catData[0] && catData[0].url) {
                catImageUrl = catData[0].url;
            }
        } catch (catError) {
            console.error('Cat API error:', catError);
        }

        // Display the recommendation
        resultsEl.innerHTML = '';
        const card = document.createElement('div');
        card.style.cssText = 'display: flex; gap: 2rem; padding: 2rem; border-radius: 16px; background: rgba(22, 33, 62, 0.6); backdrop-filter: blur(10px); max-width: 800px; margin: 0 auto; flex-wrap: wrap; justify-content: center; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.1);';
        
        let weatherHTML = '';
        if (!location) {
            weatherHTML = `
                <div style="flex: 1; min-width: 250px; text-align: center;">
                    <h3 style="margin: 0 0 1rem 0; color: #fff; font-size: 1.5rem;">🌤️ Weather</h3>
                    <p style="margin: 1rem 0; color: #a0a0a0;">Enter a location above to see weather data!</p>
                </div>
            `;
        } else if (weatherError) {
            weatherHTML = `
                <div style="flex: 1; min-width: 250px; text-align: center;">
                    <h3 style="margin: 0 0 1rem 0; color: #fff; font-size: 1.5rem;">🌤️ Weather</h3>
                    <p style="margin: 0 0 0.5rem 0; color: #a0a0a0; font-size: 0.9rem;">${locationName || 'Unknown location'}</p>
                    <p style="margin: 1rem 0; color: #e94560; font-size: 0.9rem;">Error: ${weatherError}</p>
                    <p style="margin: 0.5rem 0; color: #a0a0a0;">Please check your API key or try a different location.</p>
                </div>
            `;
        } else if (weatherData) {
            const weatherIcon = weatherData.weather?.[0]?.icon || '01d';
            const temp = Math.round(weatherData.main?.temp || 0);
            const description = weatherData.weather?.[0]?.description || 'Unknown';
            const humidity = weatherData.main?.humidity || 0;
            const windSpeed = weatherData.wind?.speed || 0;

            // Get emoji fallback based on weather description
            const weatherEmoji = getWeatherEmoji(description);

            // Check if location is already favorited
            const locationData = { name: locationName, temp: temp, description: description };
            const isLocationFav = isFavorite('location', locationData);

            weatherHTML = `
                <div style="flex: 1; min-width: 250px; text-align: center; position: relative;">
                    <button class="fav-location-btn" data-name="${locationName}" data-temp="${temp}" data-description="${description}" style="position: absolute; top: 0; right: 0; background: ${isLocationFav ? '#e94560' : 'rgba(255,255,255,0.2)'}; border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; font-size: 1.2rem; transition: all 0.3s;">${isLocationFav ? '⭐' : '☆'}</button>
                    <h3 style="margin: 0 0 1rem 0; color: #fff; font-size: 1.5rem;">🌤️ Weather</h3>
                    <p style="margin: 0 0 0.5rem 0; color: #a0a0a0; font-size: 0.9rem;">${locationName}</p>
                    <div style="font-size: 4rem; margin: 1rem 0;">${weatherEmoji}</div>
                    <img src="https://openweathermap.org/img/wn/${weatherIcon}@2x.png" alt="Weather Icon" style="width: 100px; height: 100px; margin: 0 auto; display: none;" onerror="this.style.display='none'; this.previousElementSibling.style.display='block';" onload="this.style.display='block'; this.previousElementSibling.style.display='none';">
                    <h4 style="margin: 0.5rem 0; color: #fff; font-size: 2rem;">${temp}°C</h4>
                    <p style="margin: 0.5rem 0; color: #a0a0a0; text-transform: capitalize;">${description}</p>
                    <p style="margin: 0.5rem 0; color: #a0a0a0;">💧 Humidity: ${humidity}%</p>
                    <p style="margin: 0.5rem 0; color: #a0a0a0;">💨 Wind: ${windSpeed} m/s</p>
                </div>
            `;
        }

        card.innerHTML = `
            ${weatherHTML}
            <div style="flex: 1; min-width: 250px; text-align: center; position: relative;">
                ${catImageUrl ? `<button class="fav-cat-btn" data-url="${catImageUrl}" style="position: absolute; top: 0; right: 0; background: rgba(255,255,255,0.2); border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; font-size: 1.2rem; transition: all 0.3s;">☆</button>` : ''}
                <h3 style="margin: 0 0 1rem 0; color: #fff; font-size: 1.5rem;">🐱 Random Cat</h3>
                ${catImageUrl ? `<img src="${catImageUrl}" alt="Random Cat" style="width: 220px; height: 220px; object-fit: cover; object-position: center; border-radius: 16px; margin: 1rem auto; box-shadow: 0 4px 15px rgba(0,0,0,0.3); background: rgba(15, 52, 96, 0.3);" onerror="this.onerror=null; this.src='https://placekitten.com/220/220';">` : '<div style="width: 220px; height: 220px; background: linear-gradient(135deg, #e94560 0%, #ff6b6b 100%); border-radius: 16px; margin: 1rem auto; display: flex; align-items: center; justify-content: center; font-size: 3rem; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">🐱</div>'}
                <p style="margin: 1rem 0; color: #a0a0a0;">A cute random cat!</p>
            </div>
        `;

        resultsEl.appendChild(card);

        // Add event listeners for favorite buttons
        const locationFavBtn = card.querySelector('.fav-location-btn');
        if (locationFavBtn) {
            locationFavBtn.addEventListener('click', () => {
                addFavorite('location', {
                    name: locationFavBtn.dataset.name,
                    temp: parseInt(locationFavBtn.dataset.temp),
                    description: locationFavBtn.dataset.description
                });
            });
        }

        const catFavBtn = card.querySelector('.fav-cat-btn');
        if (catFavBtn) {
            catFavBtn.addEventListener('click', () => {
                addFavorite('cat', { url: catFavBtn.dataset.url });
            });
        }
    } catch (err) {
        console.error('Random recommendation error:', err);
        resultsEl.innerHTML = `<p style="color: #e94560; padding: 1rem;">Error: ${err?.message ?? 'Failed to generate recommendation'}. Try again.</p>`;
    }
}

// ===================================
// Display Functions (PRE-BUILT)
// ===================================

function displayPrimaryData() {
    console.log('Primary data loaded:', state.primaryData.length, 'items');
    
    // Update stats
    const countEl = document.getElementById('primaryCount');
    if (countEl) {
        countEl.textContent = `${state.primaryData.length} items`;
    }
    
    // Display plants data in the plants-results div
    const plantsResults = document.getElementById('plants-results');
    if (plantsResults) {
        plantsResults.innerHTML = '';
        
        // Apply current view mode
        if (state.view === 'list') {
            plantsResults.style.display = 'flex';
            plantsResults.style.flexDirection = 'column';
            plantsResults.style.gap = '1rem';
        } else {
            plantsResults.style.display = 'grid';
            plantsResults.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
            plantsResults.style.gap = '1.5rem';
        }
        
        if (state.primaryData.length === 0) {
            plantsResults.innerHTML = '<p class="empty-state">No plants found. Try adjusting your filters or search.</p>';
            return;
        }
        
        state.primaryData.forEach(item => {
            const card = createDataCard(item, 'primary');
            plantsResults.appendChild(card);
        });
    }
    
    // Update pagination
    updatePagination('primary');
}

function displaySecondaryData() {
    console.log('Secondary data loaded:', state.secondaryData.length, 'items');
    
    // Update stats
    const countEl = document.getElementById('secondaryCount');
    if (countEl) {
        countEl.textContent = `${state.secondaryData.length} items`;
    }
    
    // Display cats data in the cats-results div
    const catsResults = document.getElementById('cats-results');
    if (catsResults) {
        catsResults.innerHTML = '';
        
        // Apply current view mode
        if (state.view === 'list') {
            catsResults.style.display = 'flex';
            catsResults.style.flexDirection = 'column';
            catsResults.style.gap = '1rem';
        } else {
            catsResults.style.display = 'grid';
            catsResults.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
            catsResults.style.gap = '1.5rem';
        }
        
        if (state.secondaryData.length === 0) {
            catsResults.innerHTML = '<p class="empty-state">No cat breeds found. Try adjusting your search.</p>';
            return;
        }
        
        state.secondaryData.forEach(item => {
            const card = createDataCard(item, 'secondary');
            catsResults.appendChild(card);
        });
    }
    
    // Update pagination
    updatePagination('secondary');
}

function createDataCard(item, source) {
    const card = document.createElement('div');
    card.className = 'data-card';
    card.dataset.id = item.id;

    const isFavorite = state.favorites.some(fav => fav.id === item.id && fav.source === source);

    // Favorite button
    const favoriteBtn = document.createElement('button');
    favoriteBtn.className = `favorite-btn ${isFavorite ? 'active' : ''}`;
    favoriteBtn.textContent = isFavorite ? '⭐' : '☆';
    favoriteBtn.onclick = (e) => toggleFavorite(e, item.id, source);

    // Image
    const img = document.createElement('img');
    img.src = item.image || '';
    img.alt = item.title || 'Item image';
    img.className = 'card-image';
    img.onerror = function() { this.style.display = 'none'; };

    // Title
    const title = document.createElement('h3');
    title.className = 'card-title';
    title.textContent = item.title;

    // Description
    const description = document.createElement('p');
    description.className = 'card-description';
    description.textContent = item.description || 'No description available';

    // Meta
    const meta = document.createElement('div');
    meta.className = 'card-meta';
    const dateSpan = document.createElement('span');
    dateSpan.textContent = item.date || 'Recent';
    const categorySpan = document.createElement('span');
    categorySpan.textContent = item.category || 'General';
    meta.appendChild(dateSpan);
    meta.appendChild(categorySpan);

    // Assemble card
    card.appendChild(favoriteBtn);
    card.appendChild(img);
    card.appendChild(title);
    card.appendChild(description);
    card.appendChild(meta);

    // Click handler for detail view
    card.addEventListener('click', (e) => {
        if (!e.target.classList.contains('favorite-btn')) {
            showDetailModal(item);
            state.stats.itemsViewed++;
            updateStats();
        }
    });

    return card;
}

// ===================================
// Filter and Search Functions (NEEDS TODO)
// ===================================

function applyFiltersAndSearch(data) {
    let filtered = [...data];

    // TODO 4: Implement search functionality
    // 1. Check if state.searchQuery is not empty
    // 2. Filter items where title or description contains search query (case-insensitive)
    // 3. Update state.stats.searches counter

    // Search functionality
    if (state.searchQuery !== ''){
        filtered = filtered.filter(item => 
            item.title.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
            item.description.toLowerCase().includes(state.searchQuery.toLowerCase())
        );
        state.stats.searches++;
    }

    // TODO 3: Implement category filtering
    // 1. Check if state.filterCategory is not 'all'
    // 2. Filter items by category

    // Category filtering
    if (state.filterCategory !== 'all'){
        filtered = filtered.filter(item => item.category === state.filterCategory);
    }

    // Sort based on state.sortBy value
    switch (state.sortBy) {
        case 'date-desc':
            filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
            break;
        case 'date-asc':
            filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
            break;
        case 'name-asc':
            filtered.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'name-desc':
            filtered.sort((a, b) => b.title.localeCompare(a.title));
            break;
        case 'relevance':
        default:
            // Keep original order for relevance
            break;
    }

    return filtered;
}

function handleSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        state.searchQuery = searchInput.value.trim();
        state.stats.searches++;
        updateStats();
        
        // Apply search and re-display
        state.primaryFiltered = applyFiltersAndSearch(state.primaryData);
        state.secondaryFiltered = applyFiltersAndSearch(state.secondaryData);
        
        // Re-render with filtered data
        const plantsResults = document.getElementById('plants-results');
        const catsResults = document.getElementById('cats-results');
        
        if (plantsResults) {
            plantsResults.innerHTML = '';
            const dataToDisplay = state.primaryFiltered.length > 0 ? state.primaryFiltered : state.primaryData;
            dataToDisplay.forEach(item => {
                const card = createDataCard(item, 'primary');
                plantsResults.appendChild(card);
            });
        }
        
        if (catsResults) {
            catsResults.innerHTML = '';
            const dataToDisplay = state.secondaryFiltered.length > 0 ? state.secondaryFiltered : state.secondaryData;
            dataToDisplay.forEach(item => {
                const card = createDataCard(item, 'secondary');
                catsResults.appendChild(card);
            });
        }
    }
}

function handleFilterChange() {
    const categorySelect = document.getElementById('filterCategory');
    const sortSelect = document.getElementById('sortBy');
    
    if (categorySelect) state.filterCategory = categorySelect.value;
    if (sortSelect) state.sortBy = sortSelect.value;
    
    // Apply filters and re-display
    state.primaryFiltered = applyFiltersAndSearch(state.primaryData);
    state.secondaryFiltered = applyFiltersAndSearch(state.secondaryData);
    
    // Re-render with filtered data
    const plantsResults = document.getElementById('plants-results');
    const catsResults = document.getElementById('cats-results');
    
    if (plantsResults) {
        plantsResults.innerHTML = '';
        const dataToDisplay = state.primaryFiltered.length > 0 ? state.primaryFiltered : state.primaryData;
        dataToDisplay.forEach(item => {
            const card = createDataCard(item, 'primary');
            plantsResults.appendChild(card);
        });
    }
    
    if (catsResults) {
        catsResults.innerHTML = '';
        const dataToDisplay = state.secondaryFiltered.length > 0 ? state.secondaryFiltered : state.secondaryData;
        dataToDisplay.forEach(item => {
            const card = createDataCard(item, 'secondary');
            catsResults.appendChild(card);
        });
    }
}

// ===================================
// Pagination Functions (NEEDS TODO)
// ===================================

function updatePagination(panelId) {
    const paginationEl = document.getElementById(`${panelId}Pagination`);
    const prevBtn = document.getElementById(`${panelId}PrevBtn`);
    const nextBtn = document.getElementById(`${panelId}NextBtn`);
    const pageInfo = document.getElementById(`${panelId}PageInfo`);

    const currentPage = state[`${panelId}Page`];
    const totalPages = state[`${panelId}TotalPages`];

    // Show/hide pagination
    if (totalPages <= 1) {
        paginationEl.classList.add('hidden');
        return;
    }

    paginationEl.classList.remove('hidden');

    // Update page info
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

    // Update button states
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
}

function changePage(panelId, direction) {
    const currentPage = state[`${panelId}Page`];
    const totalPages = state[`${panelId}TotalPages`];
    const newPage = currentPage + direction;
    
    if (newPage < 1 || newPage > totalPages) return;
    
    state[`${panelId}Page`] = newPage;
    
    if (panelId === 'primary') {
        fetchPrimaryAPI(newPage);
    } else {
        fetchSecondaryAPI(newPage);
    }
}

// ===================================
// Favorites System (NEEDS TODO)
// ===================================

function toggleFavorite(event, itemId, source) {
    event.stopPropagation();

    // Find the item in the appropriate data array
    const dataArray = source === 'primary' ? state.primaryData : state.secondaryData;
    const item = dataArray.find(i => i.id === itemId);
    
    if (!item) return;

    // Check if item is already in favorites
    const existingIndex = state.favorites.findIndex(fav => fav.id === itemId && fav.source === source);
    
    if (existingIndex > -1) {
        // Remove from favorites
        state.favorites.splice(existingIndex, 1);
    } else {
        // Add to favorites
        state.favorites.push({ ...item, source });
    }
    
    // Update UI and storage
    saveFavorites();
    displayFavorites();
    displayPrimaryData();
    displaySecondaryData();
    updateStats();
}

function displayFavorites() {
    const favoritesList = document.getElementById('favoritesList');
    const savedPlants = document.getElementById('saved-plants');

    if (state.favorites.length === 0) {
        const emptyMsg = 'No favorites yet. Click the ⭐ on items to save them!';
        
        if (favoritesList) {
            favoritesList.innerHTML = `<p class="empty-state">${emptyMsg}</p>`;
        }
        if (savedPlants) {
            savedPlants.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 2rem;">${emptyMsg}</p>`;
        }
        return;
    }

    // Display in favoritesList if it exists (for complex UI)
    if (favoritesList) {
        favoritesList.innerHTML = '';
        state.favorites.forEach(item => {
            const favItem = document.createElement('div');
            favItem.className = 'favorite-item';
            favItem.onclick = () => showDetailModal(item);

            const info = document.createElement('div');
            const title = document.createElement('strong');
            title.textContent = item.title;
            const br = document.createElement('br');
            const meta = document.createElement('small');
            meta.textContent = `${item.source} - ${item.category || 'General'}`;

            info.appendChild(title);
            info.appendChild(br);
            info.appendChild(meta);

            const removeBtn = document.createElement('button');
            removeBtn.className = 'btn-icon';
            removeBtn.textContent = '✕';
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                removeFavorite(item.id, item.source);
            };

            favItem.appendChild(info);
            favItem.appendChild(removeBtn);
            favoritesList.appendChild(favItem);
        });
    }
    
    // Display in saved-plants if it exists (for simple UI)
    if (savedPlants) {
        savedPlants.innerHTML = '<h3>Saved Favorites</h3>';
        state.favorites.forEach(item => {
            const favDiv = document.createElement('div');
            favDiv.className = 'favorite-item';
            favDiv.style.cssText = 'padding: 1rem; margin: 0.5rem 0; border: 1px solid var(--border-color); border-radius: 8px; cursor: pointer; background: var(--bg-secondary);';
            favDiv.innerHTML = `
                <h4 style="margin: 0 0 0.5rem 0; color: var(--text-primary);">${item.title}</h4>
                <p style="margin: 0; color: var(--text-secondary); font-size: 0.9rem;">${item.source} - ${item.category || 'General'}</p>
            `;
            favDiv.addEventListener('click', () => showDetailModal(item));
            
            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'Remove';
            removeBtn.style.cssText = 'margin-top: 0.5rem; padding: 0.25rem 0.5rem; background: var(--accent-color); color: white; border: none; border-radius: 4px; cursor: pointer;';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeFavorite(item.id, item.source);
            });
            
            favDiv.appendChild(removeBtn);
            savedPlants.appendChild(favDiv);
        });
    }

    state.stats.totalFavorites = state.favorites.length;
    updateStats();
}

function removeFavorite(itemId, source) {
    const index = state.favorites.findIndex(fav => fav.id === itemId && fav.source === source);
    if (index > -1) {
        state.favorites.splice(index, 1);
        saveFavorites();
        displayFavorites();
        displayPrimaryData();
        displaySecondaryData();
    }
}

function saveFavorites() {
    try {
        localStorage.setItem('favorites', JSON.stringify(state.favorites));
    } catch (error) {
        console.warn('Failed to save favorites:', error);
    }
}

function loadFavorites() {
    try {
        const saved = localStorage.getItem('favorites');
        if (saved) {
            state.favorites = JSON.parse(saved);
            displayFavorites();
        }
    } catch (error) {
        console.warn('Failed to load favorites:', error);
        state.favorites = [];
    }
}

function clearFavorites() {
    if (confirm('Clear all favorites?')) {
        state.favorites = [];
        saveFavorites();
        displayFavorites();
        displayPrimaryData();
        displaySecondaryData();
    }
}

// ===================================
// Modal Functions (PRE-BUILT)
// ===================================

function showDetailModal(item) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('detailModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'detailModal';
        modal.className = 'modal hidden';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <button class="modal-close">&times;</button>
                <div id="detailContent"></div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Add event listeners for closing
        modal.querySelector('.modal-close').addEventListener('click', closeDetailModal);
        modal.querySelector('.modal-overlay').addEventListener('click', closeDetailModal);
    }
    
    const detailContent = document.getElementById('detailContent');
    
    // Clear content
    detailContent.innerHTML = '';

    // Title
    const title = document.createElement('h2');
    title.textContent = item.title;
    title.style.cssText = 'margin: 0 0 1rem 0; color: var(--text-primary);';
    detailContent.appendChild(title);

    // Image
    if (item.image) {
        const img = document.createElement('img');
        img.src = item.image;
        img.alt = item.title;
        img.style.cssText = 'width: 100%; max-height: 400px; object-fit: cover; border-radius: 12px; margin: 1rem 0;';
        img.onerror = function() { this.style.display = 'none'; };
        detailContent.appendChild(img);
    }

    // Category
    const categoryP = document.createElement('p');
    categoryP.innerHTML = `<strong>Category:</strong> ${item.category || 'General'}`;
    categoryP.style.cssText = 'margin: 0.5rem 0; color: var(--text-secondary);';
    detailContent.appendChild(categoryP);

    // Date
    const dateP = document.createElement('p');
    dateP.innerHTML = `<strong>Date:</strong> ${item.date || 'Recent'}`;
    dateP.style.cssText = 'margin: 0.5rem 0; color: var(--text-secondary);';
    detailContent.appendChild(dateP);

    // Description
    const descP = document.createElement('p');
    descP.textContent = item.description || 'No description available';
    descP.style.cssText = 'margin: 1rem 0; line-height: 1.6; color: var(--text-primary);';
    detailContent.appendChild(descP);

    // Author (if exists)
    if (item.author) {
        const authorP = document.createElement('p');
        authorP.innerHTML = `<strong>Author:</strong> ${item.author}`;
        authorP.style.cssText = 'margin: 0.5rem 0; color: var(--text-secondary);';
        detailContent.appendChild(authorP);
    }

    // URL (if exists and is valid)
    if (item.url && item.url !== '#' && item.url.startsWith('http')) {
        const linkP = document.createElement('p');
        const link = document.createElement('a');
        link.href = item.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'View Source →';
        link.style.cssText = 'color: var(--primary-color); text-decoration: none; font-weight: 600;';
        linkP.appendChild(link);
        detailContent.appendChild(linkP);
    }

    // Show modal
    modal.classList.remove('hidden');
    state.stats.itemsViewed++;
    updateStats();
}

function closeDetailModal() {
    const modal = document.getElementById('detailModal');
    if (modal) modal.classList.add('hidden');
}

// ===================================
// UI Helper Functions (PRE-BUILT)
// ===================================

function showLoading(panelId) {
    const loadingEl = document.getElementById(`${panelId}Loading`);
    const gridEl = document.getElementById(`${panelId}Grid`);
    if (loadingEl) loadingEl.classList.remove('hidden');
    if (gridEl) gridEl.style.opacity = '0.3';
}

function hideLoading(panelId) {
    const loadingEl = document.getElementById(`${panelId}Loading`);
    const gridEl = document.getElementById(`${panelId}Grid`);
    if (loadingEl) loadingEl.classList.add('hidden');
    if (gridEl) gridEl.style.opacity = '1';
}

function showError(panelId, message) {
    const errorEl = document.getElementById(`${panelId}Error`);
    if (errorEl) {
        const messageEl = errorEl.querySelector('.error-message');
        if (messageEl) messageEl.textContent = message;
        errorEl.classList.remove('hidden');
    }
}

function hideError(panelId) {
    const errorEl = document.getElementById(`${panelId}Error`);
    if (errorEl) errorEl.classList.add('hidden');
}

function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', state.theme);
    const themeToggleEl = document.getElementById('themeToggle');
    if (themeToggleEl) themeToggleEl.textContent = state.theme === 'light' ? '🌙' : '☀️';
    localStorage.setItem('theme', state.theme);
}

function updateStats() {
    const itemsViewedEl = document.getElementById('totalItemsViewed');
    const searchesEl = document.getElementById('totalSearches');
    const favoritesEl = document.getElementById('totalFavorites');
    const cacheHitsEl = document.getElementById('cacheHits');
    
    if (itemsViewedEl) itemsViewedEl.textContent = state.stats.itemsViewed;
    if (searchesEl) searchesEl.textContent = state.stats.searches;
    if (favoritesEl) favoritesEl.textContent = state.stats.totalFavorites;
    if (cacheHitsEl) cacheHitsEl.textContent = state.stats.cacheHits;
}

// ===================================
// Sample Data Generator (FOR TESTING)
// Remove this after implementing real API calls
// ===================================

function generateSampleData(source, count) {
    const titles = [
        'Breaking News: Technology Advances',
        'Weather Update: Sunny Skies Ahead',
        'Latest Trends in Web Development',
        'Health Tips for Modern Living',
        'Entertainment News: New Releases',
        'Sports Highlights: Championship Games',
        'Science Discovery: Amazing Findings',
        'Travel Destinations: Top Picks'
    ];

    const categories = ['Technology', 'Weather', 'Health', 'Entertainment', 'Sports', 'Science', 'Travel'];

    return Array.from({ length: count }, (_, i) => ({
        id: `${source}-${Date.now()}-${i}`,
        title: titles[i % titles.length],
        description: 'This is sample data for UI testing. Replace with real API data in TODO 2.',
        image: `https://picsum.photos/300/180?random=${i}`,
        category: categories[i % categories.length],
        date: new Date(Date.now() - i * 86400000).toLocaleDateString(),
        author: `Author ${i + 1}`,
        url: '#'
    }));
}

// ===================================
// Event Listeners (PRE-BUILT)
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize chart
    initChart();

    // Load favorites from localStorage
    loadFavorites();

    // Random recommendation button
    const randomRecommendationBtn = document.getElementById('randomRecommendationBtn');
    const locationInput = document.getElementById('locationInput');

    if (randomRecommendationBtn) {
        randomRecommendationBtn.addEventListener('click', () => {
            const location = locationInput?.value?.trim() || null;
            generateRandomRecommendation(location);
        });
    }

    // Allow pressing Enter to search
    if (locationInput) {
        locationInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const location = locationInput.value.trim() || null;
                generateRandomRecommendation(location);
            }
        });
    }

    // Clear chart button
    const clearChartBtn = document.getElementById('clearChartBtn');
    if (clearChartBtn) {
        clearChartBtn.addEventListener('click', clearChart);
    }

    // Chart type selector
    const chartTypeSelect = document.getElementById('chartType');
    if (chartTypeSelect) {
        chartTypeSelect.addEventListener('change', (e) => {
            const newType = e.target.value;
            initChart(newType);
        });
    }

    // Data type selector
    const dataTypeSelect = document.getElementById('dataType');
    if (dataTypeSelect) {
        dataTypeSelect.addEventListener('change', (e) => {
            const newDataType = e.target.value;
            currentDataType = newDataType;
            // Force reinitialization to ensure clean state
            if (weatherChart) {
                weatherChart.destroy();
            }
            initChart(currentChartType);
        });
    }
});
