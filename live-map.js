// Live Map JavaScript
let map;
let isFullscreen = false;
let userLocationMarker = null;

// Aircraft tracking variables
let aircraftMarkers = new Map();
let websocket = null;
let reconnectAttempts = 0;
let maxReconnectAttempts = 5;
let reconnectTimeout = null;

// Initialize the map when page loads
document.addEventListener('DOMContentLoaded', () => {
    initializeMap();
    initializeControls();
    initializeParticles();
    initializeSidebar();
});

function initializeMap() {
    // Show loading overlay
    const loading = document.getElementById('mapLoading');
    
    // Initialize map centered on a default location (can be changed)
    map = L.map('liveMap', {
        center: [20, 0], // Default center
        zoom: 3,
        zoomControl: true,
        attributionControl: false // Disable attribution control
    });

    // Add dark OpenStreetMap tiles
    const darkTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        className: 'dark-tiles'
    });

    darkTileLayer.addTo(map);

    // Update map info when view changes
    map.on('moveend', updateMapInfo);
    map.on('zoomend', updateMapInfo);

    // Hide loading overlay when map is ready
    map.whenReady(() => {
        setTimeout(() => {
            loading.classList.add('hidden');
            updateMapInfo();
            
            // Initialize WebSocket connection after map is ready
            initializeWebSocket();
        }, 1000);
    });

    // Try to get user's location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                // Add user location marker
                userLocationMarker = L.marker([lat, lng], {
                    title: 'Your Location'
                }).addTo(map);
                
                userLocationMarker.bindPopup(`
                    <div style="text-align: center; padding: 10px;">
                        <i class="fas fa-map-marker-alt" style="color: #64b5f6; font-size: 20px; margin-bottom: 8px;"></i>
                        <h4 style="margin: 0 0 5px 0; color: #64b5f6;">Your Location</h4>
                        <p style="margin: 0; color: #b0b0b0; font-size: 12px;">
                            ${lat.toFixed(6)}, ${lng.toFixed(6)}
                        </p>
                    </div>
                `);
                
                // Optionally center on user location (uncomment if desired)
                // map.setView([lat, lng], 10);
            },
            (error) => {
                console.log('Geolocation error:', error.message);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 600000
            }
        );
    }
}

// Initialize WebSocket connection for aircraft tracking
function initializeWebSocket() {
    // Determine WebSocket URL based on current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `https://horizon-backend-4f8h.onrender.com`;
    
    console.log('Connecting to aircraft tracking:', wsUrl);
    
    try {
        websocket = new WebSocket(wsUrl);
        
        websocket.onopen = () => {
            console.log('Connected to aircraft tracking server');
            showMessage('Connected to live aircraft tracking', 'success');
            reconnectAttempts = 0; // Reset reconnect attempts on successful connection
        };
        
        websocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleWebSocketMessage(data);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };
        
        websocket.onclose = (event) => {
            console.log('Disconnected from aircraft tracking server');
            showMessage('Aircraft tracking disconnected', 'warning');
            
            // Clear all aircraft markers when disconnected
            clearAllAircraft();
            
            // Attempt to reconnect
            scheduleReconnect();
        };
        
        websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
            showMessage('Aircraft tracking connection error', 'error');
        };
        
    } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        scheduleReconnect();
    }
}

// Handle different types of WebSocket messages
function handleWebSocketMessage(data) {
    switch (data.type) {
        case 'initial_data':
            console.log('Received initial aircraft data:', data.aircraft.length, 'aircraft');
            updateAircraft(data.aircraft);
            break;
        case 'aircraft_update':
            console.log('Aircraft update:', data.aircraft.length, 'aircraft');
            updateAircraft(data.aircraft);
            break;
        case 'aircraft_removed':
            console.log('Aircraft removed:', data.id);
            removeAircraft(data.id);
            break;
        case 'server_shutdown':
            showMessage('Server is shutting down', 'warning');
            clearAllAircraft();
            break;
        default:
            console.log('Unknown message type:', data.type);
    }
}

// Schedule reconnection with exponential backoff
function scheduleReconnect() {
    if (reconnectAttempts >= maxReconnectAttempts) {
        showMessage('Failed to reconnect to aircraft tracking', 'error');
        return;
    }
    
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Max 30 seconds
    reconnectAttempts++;
    
    console.log(`Scheduling reconnect attempt ${reconnectAttempts} in ${delay}ms`);
    
    reconnectTimeout = setTimeout(() => {
        initializeWebSocket();
    }, delay);
}

// Update aircraft on map
function updateAircraft(aircraftArray) {
    aircraftArray.forEach(aircraft => {
        if (aircraftMarkers.has(aircraft.id)) {
            // Update existing aircraft
            const marker = aircraftMarkers.get(aircraft.id);
            marker.setLatLng([aircraft.latitude, aircraft.longitude]);
            
            // Update the icon with new heading
            const newIcon = createAircraftIcon(aircraft.heading);
            marker.setIcon(newIcon);
            
            // Update popup content
            marker.bindPopup(createAircraftPopup(aircraft));
        } else {
            // Create new aircraft marker
            const aircraftIcon = createAircraftIcon(aircraft.heading);
            
            const marker = L.marker([aircraft.latitude, aircraft.longitude], {
                icon: aircraftIcon,
                title: aircraft.callsign || aircraft.id
            }).addTo(map);
            
            marker.bindPopup(createAircraftPopup(aircraft));
            aircraftMarkers.set(aircraft.id, marker);
            
            console.log('Added new aircraft:', aircraft.callsign || aircraft.id);
        }
    });
}

// Create aircraft icon with rotation
function createAircraftIcon(heading) {
    return L.divIcon({
        className: 'aircraft-marker',
        html: `
            <div style="transform: rotate(${heading}deg); width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
                <i class="fas fa-fighter-jet" style="color: #64b5f6; font-size: 18px;"></i>
            </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
    });
}

// Remove aircraft from map
function removeAircraft(aircraftId) {
    if (aircraftMarkers.has(aircraftId)) {
        const marker = aircraftMarkers.get(aircraftId);
        map.removeLayer(marker);
        aircraftMarkers.delete(aircraftId);
        console.log('Removed aircraft:', aircraftId);
    }
}

// Clear all aircraft markers
function clearAllAircraft() {
    aircraftMarkers.forEach((marker, id) => {
        map.removeLayer(marker);
    });
    aircraftMarkers.clear();
    console.log('Cleared all aircraft markers');
}

// Create aircraft popup content
function createAircraftPopup(aircraft) {
    const altitude = aircraft.altitude ? `${Math.round(aircraft.altitude)} ft` : 'Unknown';
    const speed = aircraft.speed ? `${Math.round(aircraft.speed)} kts` : 'Unknown';
    const aircraftType = aircraft.aircraft_type || 'Unknown';
    const callsign = aircraft.callsign || aircraft.id;
    
    return `
        <div style="text-align: center; padding: 12px; min-width: 200px;">
            <i class="fas fa-plane" style="color: #64b5f6; font-size: 24px; margin-bottom: 8px;"></i>
            <h4 style="margin: 0 0 12px 0; color: #64b5f6; font-size: 16px;">${callsign}</h4>
            <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px 12px; text-align: left; font-size: 13px;">
                <div style="color: #b0b0b0;">Type:</div>
                <div style="color: #ffffff; font-weight: 500;">${aircraftType}</div>
                <div style="color: #b0b0b0;">Altitude:</div>
                <div style="color: #ffffff; font-weight: 500;">${altitude}</div>
                <div style="color: #b0b0b0;">Speed:</div>
                <div style="color: #ffffff; font-weight: 500;">${speed}</div>
                <div style="color: #b0b0b0;">Heading:</div>
                <div style="color: #ffffff; font-weight: 500;">${Math.round(aircraft.heading)}°</div>
                <div style="color: #b0b0b0;">Position:</div>
                <div style="color: #ffffff; font-weight: 500;">${aircraft.latitude.toFixed(4)}, ${aircraft.longitude.toFixed(4)}</div>
            </div>
        </div>
    `;
}

function initializeControls() {
    // Center map button (if exists)
    const centerBtn = document.getElementById('centerMapBtn');
    if (centerBtn) {
        centerBtn.addEventListener('click', () => {
            if (userLocationMarker) {
                const latLng = userLocationMarker.getLatLng();
                map.setView(latLng, 10);
                userLocationMarker.openPopup();
            } else if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        map.setView([position.coords.latitude, position.coords.longitude], 10);
                    },
                    () => {
                        showMessage('Unable to access your location', 'error');
                    }
                );
            } else {
                showMessage('Geolocation not supported', 'error');
            }
        });
    }
}

function toggleFullscreen() {
    const mapContainer = document.querySelector('.map-container');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    
    if (!fullscreenBtn) return;
    
    const icon = fullscreenBtn.querySelector('i');

    if (!isFullscreen) {
        mapContainer.classList.add('fullscreen-mode');
        icon.className = 'fas fa-compress';
        isFullscreen = true;
        
        // Request fullscreen if available
        if (mapContainer.requestFullscreen) {
            mapContainer.requestFullscreen();
        }
    } else {
        mapContainer.classList.remove('fullscreen-mode');
        icon.className = 'fas fa-expand';
        isFullscreen = false;
        
        // Exit fullscreen if active
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
    }

    // Invalidate map size to prevent display issues
    setTimeout(() => {
        map.invalidateSize();
    }, 100);
}

function updateMapInfo() {
    const center = map.getCenter();
    const zoom = map.getZoom();
    
    const zoomElement = document.getElementById('zoomLevel');
    const centerElement = document.getElementById('mapCenter');
    
    if (zoomElement) zoomElement.textContent = zoom;
    if (centerElement) {
        centerElement.textContent = `${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`;
    }
}

// Initialize particles (placeholder - implement if needed)
function initializeParticles() {
    // Placeholder for particle system initialization
    // Add your existing particle system code here if you have one
}

// Message display function
function showMessage(text, type) {
    // Remove existing messages
    document.querySelectorAll('.flight-message').forEach(msg => msg.remove());

    const message = document.createElement('div');
    message.className = `flight-message flight-message-${type}`;
    message.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#2d5a27' : type === 'warning' ? '#5a4a27' : '#5a2727'};
        color: white;
        border-radius: 4px;
        border-left: 4px solid ${type === 'success' ? '#4caf50' : type === 'warning' ? '#ff9800' : '#f44336'};
        z-index: 10000;
        font-size: 14px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        transition: opacity 0.3s ease;
    `;
    message.textContent = text;

    document.body.appendChild(message);

    setTimeout(() => {
        message.style.opacity = '0';
        setTimeout(() => {
            if (message.parentNode) {
                message.remove();
            }
        }, 300);
    }, 4000);
}

// Handle ESC key for exiting fullscreen
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isFullscreen) {
        toggleFullscreen();
    }
});

// Handle browser fullscreen change events
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && isFullscreen) {
        toggleFullscreen();
    }
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (websocket) {
        websocket.close();
    }
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
    }
});

// Debug function to check aircraft tracking status
window.checkAircraftStatus = () => {
    console.log('Aircraft tracking status:');
    console.log('- WebSocket state:', websocket ? websocket.readyState : 'Not initialized');
    console.log('- Active aircraft:', aircraftMarkers.size);
    console.log('- Reconnect attempts:', reconnectAttempts);
    
    return {
        websocketState: websocket ? websocket.readyState : 'Not initialized',
        aircraftCount: aircraftMarkers.size,
        reconnectAttempts: reconnectAttempts
    };
};