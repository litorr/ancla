document.addEventListener('DOMContentLoaded', () => {
    // Inicializar el mapa de Leaflet
    const map = L.map('map').setView([8.2863, -62.7303], 13); // Coordenadas de ejemplo: Guayana City

    // Añadir una capa de mapa (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Conectar al servidor de Socket.IO
    const socket = io('http://localhost:3000'); // **CAMBIA ESTO por la URL de tu servidor backend**

    const startTrackingBtn = document.getElementById('start-tracking-btn');
    const stopTrackingBtn = document.getElementById('stop-tracking-btn');
    const trackingStatus = document.getElementById('tracking-status');
    const statusMessage = document.getElementById('status-message');

    let watchId; // Para guardar el ID del observador de geolocalización
    const busMarkers = {}; // Objeto para guardar los marcadores de los autobuses

    // --- Funciones para manejar el mapa y los datos ---

    function updateBusPosition(busData) {
        const { id, lat, lng, lineId } = busData;
        const busNumber = busData.busNumber || `Bus ${id}`; // Usar un número si está disponible, o el ID

        if (busMarkers[id]) {
            // Si el marcador ya existe, actualiza su posición
            busMarkers[id].setLatLng([lat, lng]);
        } else {
            // Si el marcador no existe, crea uno nuevo
            const customIcon = L.divIcon({
                className: 'bus-marker',
                html: `<div style="transform: rotate(${busData.heading || 0}deg);">🚌</div>`, // Icono de autobús
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });
            const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map)
                .bindPopup(`<b>Línea: ${lineId}</b><br>Autobús: ${busNumber}`);
            busMarkers[id] = marker;
        }
    }

    function removeBusMarker(busId) {
        if (busMarkers[busId]) {
            map.removeLayer(busMarkers[busId]);
            delete busMarkers[busId];
        }
    }

    // --- Funcionalidad de Geolocalización para Choferes ---

    function startTracking() {
        if (navigator.geolocation) {
            trackingStatus.textContent = 'Activo';
            trackingStatus.style.color = 'green';
            statusMessage.style.display = 'none'; // Ocultar mensaje general si el rastreo es activo

            // Opciones de geolocalización: alta precisión y actualización frecuente
            const geoOptions = {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 5000 // 5 segundos
            };

            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude, heading } = position.coords;
                    console.log(`Mi Ubicación: ${latitude}, ${longitude}`);
                    // **IMPORTANTE: En una app real, el 'busId' y 'lineId' vendrían de tu sistema de login/asignación**
                    // Por ahora, usa un ID de ejemplo.
                    const myBusId = 'BUS_CH_001'; // ID de ejemplo para el chofer
                    const myLineId = 'L01'; // Línea de ejemplo

                    socket.emit('sendBusLocation', {
                        id: myBusId,
                        lat: latitude,
                        lng: longitude,
                        lineId: myLineId,
                        heading: heading // Dirección del movimiento, si está disponible
                    });

                    // Centrar el mapa en la ubicación del chofer (opcional)
                    // map.setView([latitude, longitude], map.getZoom());
                },
                (error) => {
                    console.error('Error de geolocalización:', error);
                    trackingStatus.textContent = 'Error';
                    trackingStatus.style.color = 'red';
                    statusMessage.textContent = `Error de ubicación: ${error.message}`;
                    statusMessage.style.backgroundColor = '#f8d7da';
                    statusMessage.style.borderColor = '#f5c6cb';
                    statusMessage.style.color = '#721c24';
                    statusMessage.style.display = 'block';
                },
                geoOptions
            );
        } else {
            alert('La geolocalización no está soportada por este navegador.');
            trackingStatus.textContent = 'No Soportado';
            trackingStatus.style.color = 'grey';
        }
    }

    function stopTracking() {
        if (watchId) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
            trackingStatus.textContent = 'Inactivo';
            trackingStatus.style.color = 'black';

            // Opcional: Notificar al servidor que este autobús ha dejado de emitir
            const myBusId = 'BUS_CH_001'; // Debe coincidir con el ID usado al iniciar
            socket.emit('busStoppedTracking', myBusId);
        }
    }

    // --- Eventos de Socket.IO para Administradores (ver toda la flota) ---

    socket.on('connect', () => {
        console.log('Conectado al servidor de control.');
        statusMessage.textContent = 'Conectado. Monitoreando autobuses...';
        statusMessage.style.backgroundColor = '#d4edda';
        statusMessage.style.borderColor = '#c3e6cb';
        statusMessage.style.color = '#155724';
        statusMessage.style.display = 'block';
        // Para administradores: Solicitar ubicaciones iniciales de todos los autobuses
        socket.emit('requestInitialBusLocations');
    });

    socket.on('disconnect', () => {
        console.log('Desconectado del servidor de control.');
        statusMessage.textContent = 'Desconectado. Reintentando conexión...';
        statusMessage.style.backgroundColor = '#f8d7da';
        statusMessage.style.borderColor = '#f5c6cb';
        statusMessage.style.color = '#721c24';
        statusMessage.style.display = 'block';
    });

    socket.on('busLocationUpdate', (busData) => {
        // Recibe la ubicación de CUALQUIER autobús y la actualiza en el mapa
        updateBusPosition(busData);
    });

    socket.on('busDisconnected', (busId) => {
        // Elimina el marcador de un autobús cuando se desconecta
        removeBusMarker(busId);
        console.log(`Autobús ${busId} desconectado.`);
    });

    socket.on('initialBusLocations', (allBusLocations) => {
        // Recibe las ubicaciones iniciales de todos los autobuses al conectar
        console.log('Ubicaciones iniciales de la flota recibidas:', allBusLocations);
        for (const id in busMarkers) { // Limpiar marcadores antiguos
            map.removeLayer(busMarkers[id]);
            delete busMarkers[id];
        }
        allBusLocations.forEach(busData => updateBusPosition(busData));
    });

    // --- Eventos de UI ---

    startTrackingBtn.addEventListener('click', startTracking);
    stopTrackingBtn.addEventListener('click', stopTracking);
});