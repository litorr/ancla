document.addEventListener('DOMContentLoaded', () => {
    // Inicializar el mapa de Leaflet en Guayana City
    const map = L.map('map').setView([8.2863, -62.7303], 13); // Coordenadas de Guayana City

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const busMarkers = {}; // Para almacenar los marcadores de los autobuses
    const statusMessage = document.getElementById('status-message');
    const lineSelect = document.getElementById('line-select');

    const simulatedBuses = [
        { id: 'bus001', lineId: 'L01', busNumber: '001', lat: 8.30, lng: -62.75, heading: 45, routeIndex: 0, speed: 0.0005 },
        { id: 'bus002', lineId: 'L02', busNumber: '002', lat: 8.28, lng: -62.70, heading: 180, routeIndex: 0, speed: 0.0004 },
        { id: 'bus003', lineId: 'L03', busNumber: '003', lat: 8.25, lng: -62.72, heading: 90, routeIndex: 0, speed: 0.0006 }
    ];

    // Rutas simuladas (simplificadas para demostración)
    const simulatedRoutes = {
        'L01': [
            [8.30, -62.75], [8.31, -62.76], [8.32, -62.77], [8.33, -62.76], [8.32, -62.75]
        ],
        'L02': [
            [8.28, -62.70], [8.27, -62.69], [8.26, -62.70], [8.27, -62.71], [8.28, -62.70]
        ],
        'L03': [
            [8.25, -62.72], [8.26, -62.73], [8.27, -62.72], [8.26, -62.71], [8.25, -62.72]
        ]
    };

    // Función para crear o actualizar marcadores de autobús
    function updateBusPosition(busData) {
        const { id, lat, lng, lineId, busNumber, heading } = busData;
        const selectedLine = lineSelect.value;
        const isVisible = selectedLine === 'all' || selectedLine === lineId;

        if (busMarkers[id]) {
            busMarkers[id].setLatLng([lat, lng]);
            if (!isVisible) {
                map.removeLayer(busMarkers[id]);
            } else if (!map.hasLayer(busMarkers[id])) {
                map.addLayer(busMarkers[id]);
            }
            // Actualiza el HTML del icono para la rotación (si el icono lo soporta)
            const iconElement = busMarkers[id]._icon.querySelector('div');
            if (iconElement) {
                iconElement.style.transform = `rotate(${heading || 0}deg)`;
            }

        } else if (isVisible) {
            const customIcon = L.divIcon({
                className: 'bus-marker-icon', // Usaremos una clase CSS para el icono
                html: `<div style="transform: rotate(${heading || 0}deg);">🚌</div>`, // Icono de autobús
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });
            const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map)
                .bindPopup(`<b>Línea: ${lineId}</b><br>Autobús: ${busNumber}`);
            busMarkers[id] = marker;
        }
    }

    // Función para simular el movimiento
    function simulateBusMovement() {
        simulatedBuses.forEach(bus => {
            const route = simulatedRoutes[bus.lineId];
            if (!route || route.length === 0) return;

            const currentPoint = [bus.lat, bus.lng];
            const targetPoint = route[bus.routeIndex];

            // Calcula la distancia al punto objetivo
            const distance = Math.sqrt(
                Math.pow(targetPoint[0] - currentPoint[0], 2) +
                Math.pow(targetPoint[1] - currentPoint[1], 2)
            );

            // Si está cerca del objetivo, pasa al siguiente punto
            if (distance < bus.speed * 2) {
                bus.routeIndex = (bus.routeIndex + 1) % route.length;
                const nextTarget = route[bus.routeIndex];
                // Calcula el nuevo heading (dirección)
                bus.heading = Math.atan2(nextTarget[0] - currentPoint[0], nextTarget[1] - currentPoint[1]) * 180 / Math.PI + 90; // +90 para ajustar la rotación del icono de autobús
            }

            // Mueve el autobús hacia el objetivo
            const deltaLat = (targetPoint[0] - currentPoint[0]);
            const deltaLng = (targetPoint[1] - currentPoint[1]);
            bus.lat += deltaLat * bus.speed / distance;
            bus.lng += deltaLng * bus.speed / distance;

            updateBusPosition(bus);
        });
    }

    // Inicializar y simular
    function initializeSimulations() {
        statusMessage.textContent = 'Autobuses simulados en movimiento.';
        statusMessage.classList.remove('info');
        statusMessage.classList.add('success');
        statusMessage.style.display = 'block';

        // Dibujar todos los autobuses inicialmente
        simulatedBuses.forEach(bus => updateBusPosition(bus));

        // Iniciar la simulación de movimiento cada 200ms
        setInterval(simulateBusMovement, 200);
    }

    // Evento de cambio en el selector de línea
    lineSelect.addEventListener('change', () => {
        // Al cambiar el filtro, actualiza la visibilidad de todos los marcadores
        simulatedBuses.forEach(bus => updateBusPosition(bus));
        statusMessage.textContent = `Mostrando línea: ${lineSelect.options[lineSelect.selectedIndex].textContent}`;
        statusMessage.classList.remove('success');
        statusMessage.classList.add('info');
        statusMessage.style.display = 'block';
    });

    initializeSimulations(); // Inicia la simulación al cargar la página

    // Lógica simulada para Planificar Ruta
    document.getElementById('plan-route-btn').addEventListener('click', () => {
        const origin = document.getElementById('origin-input').value;
        const destination = document.getElementById('destination-input').value;
        const routePlanResult = document.getElementById('route-plan-result');

        if (origin && destination) {
            routePlanResult.textContent = `Simulando ruta de "${origin}" a "${destination}". Tomar L01, luego L03.`;
            routePlanResult.classList.remove('info');
            routePlanResult.classList.add('success');
        } else {
            routePlanResult.textContent = 'Por favor, introduce origen y destino.';
            routePlanResult.classList.remove('success');
            routePlanResult.classList.add('info');
        }
        routePlanResult.style.display = 'block';
    });

    // Añadir estilo al icono personalizado del bus
    const style = document.createElement('style');
    style.innerHTML = `
        .bus-marker-icon {
            background-color: var(--button-primary); /* Color de fondo del icono */
            color: white;
            border-radius: 50%; /* Forma circular */
            width: 30px;
            height: 30px;
            display: flex;
            justify-content: center;
            align-items: center;
            font-weight: bold;
            border: 2px solid white;
            box-shadow: 0 0 8px rgba(0,0,0,0.4);
            font-size: 1.2em; /* Tamaño del icono del autobús dentro del círculo */
        }
        .bus-marker-icon div {
            transition: transform 0.1s linear; /* Suavizar la rotación */
        }
    `;
    document.head.appendChild(style);
});