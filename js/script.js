var map = L.map('map').setView([9.9281, -84.0907], 8);

var crTiles = L.tileLayer('tiles/{z}/{x}/{y}.png', {
    minZoom: 6,
    maxZoom: 12,
    attribution: 'Datos: INEC & IGN Costa Rica | Tiles: Tecnológico de Costa Rica',
    tms: false
}).addTo(map);

var currentZoom = map.getZoom();
var legendControl;
var hoveredFeature = null;

// Variables para controlar el estado de los toggles
var hospitalesVisible = true;
var escuelasVisible = true;

var areasPobladas = {
    provincias: ['SAN JOSE', 'ALAJUELA'],
    cantones: [
        'SAN JOSE', 'ALAJUELA', 'DESAMPARADOS', 'SAN CARLOS', 'CARTAGO',
        'POCOCI', 'HEREDIA', 'PUNTARENAS', 'PEREZ ZELEDON', 'GOICOECHEA'
    ],
    distritos: [
        'PAVAS', 'LIBERIA', 'HATILLO', 'LIMON', 'SAN JOSE', 
        'ALAJUELA', 'QUESADA'
    ]
};

var colorSchemes = {
    provincia: {
        colors: ['#f7fbff', '#c6dbef', '#6baed6', '#2171b5', '#08306b'],
        ranges: ['< 500,000', '500,000 - 800,000', '800,000 - 1,200,000', '1,200,000 - 1,500,000', '> 1,500,000'],
        name: 'Provincia'
    },
    canton: {
        colors: ['#f7fcf5', '#c7e9c0', '#74c476', '#238b45', '#005a32'],
        ranges: ['< 30,000', '30,000 - 80,000', '80,000 - 150,000', '150,000 - 250,000', '> 250,000'],
        name: 'Cantón'
    },
    distrito: {
        colors: ['#fff5f0', '#fcbba1', '#fb6a4a', '#cb181d', '#67000d'],
        ranges: ['< 5,000', '5,000 - 15,000', '15,000 - 30,000', '30,000 - 60,000', '> 60,000'],
        name: 'Distrito'
    }
};

function formatNumber(num) {
    return num ? num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : 'No disponible';
}

function estaEnAreaPoblada(feature, zoomLevel) {
    if (zoomLevel >= 6 && zoomLevel < 9) {
        return areasPobladas.provincias.includes(feature.properties.PROVINCIA);
    } else if (zoomLevel >= 9 && zoomLevel < 11) {
        return areasPobladas.cantones.includes(feature.properties.CANTON || feature.properties.CANTóN);
    } else if (zoomLevel >= 11) {
        return areasPobladas.distritos.includes(feature.properties.DISTRITO);
    }
    return false;
}

function updateInfoPanel(feature, layerType) {
    var infoPanel = document.getElementById('feature-info');
    var poblacion = feature.properties.poblacion ? formatNumber(feature.properties.poblacion) : 'No disponible';
    
    var content = '';
    
    switch(layerType) {
        case 'provincia':
            content = `
                <div class="highlight">
                    <h4>🏛️ Provincia: ${feature.properties.nombre}</h4>
                    <p><strong>Población 2022:</strong> ${poblacion} habitantes</p>
                </div>
            `;
            break;
            
        case 'canton':
            content = `
                <div class="highlight">
                    <h4>🏢 Cantón: ${feature.properties.nombre}</h4>
                    <p><strong>Provincia:</strong> ${feature.properties.provincia}</p>
                    <p><strong>Población 2022:</strong> ${poblacion} habitantes</p>
                </div>
            `;
            break;
            
        case 'distrito':
            content = `
                <div class="highlight">
                    <h4>📍 Distrito: ${feature.properties.nombre}</h4>
                    <p><strong>Cantón:</strong> ${feature.properties.canton}</p>
                    <p><strong>Provincia:</strong> ${feature.properties.provincia}</p>
                    <p><strong>Población 2022:</strong> ${poblacion} habitantes</p>
                </div>
            `;
            break;
            
        case 'hospital':
            content = `
                <div class="highlight">
                    <h4>🏥 Hospital: ${feature.properties.NOMBRE}</h4>
                    <p><strong>Provincia:</strong> ${feature.properties.PROVINCIA}</p>
                    <p><strong>Cantón:</strong> ${feature.properties.CANTON}</p>
                    <p><strong>Distrito:</strong> ${feature.properties.DISTRITO}</p>
                </div>
            `;
            break;
            
        case 'escuela':
            var canton = feature.properties.CANTON || feature.properties.CANTóN;
            content = `
                <div class="highlight">
                    <h4>🏫 Escuela: ${feature.properties.NOMBRE}</h4>
                    <p><strong>Provincia:</strong> ${feature.properties.PROVINCIA}</p>
                    <p><strong>Cantón:</strong> ${canton}</p>
                    <p><strong>Distrito:</strong> ${feature.properties.DISTRITO}</p>
                </div>
            `;
            break;
            
        default:
            content = '<p>Haz clic o pasa el mouse sobre el mapa para ver información</p>';
    }
    
    infoPanel.innerHTML = content;
}

function createTooltip(feature, layer, layerType) {
    var poblacion = feature.properties.poblacion ? formatNumber(feature.properties.poblacion) : 'N/A';
    var tooltipContent = '';
    
    switch(layerType) {
        case 'provincia':
            tooltipContent = `<strong>🏛️ Provincia: ${feature.properties.nombre}</strong><br/>Población: ${poblacion}`;
            break;
        case 'canton':
            tooltipContent = `<strong>🏢 Cantón: ${feature.properties.nombre}</strong><br/>Provincia: ${feature.properties.provincia}<br/>Población: ${poblacion}`;
            break;
        case 'distrito':
            tooltipContent = `<strong>📍 Distrito: ${feature.properties.nombre}</strong><br/>Cantón: ${feature.properties.canton}<br/>Población: ${poblacion}`;
            break;
        case 'hospital':
            tooltipContent = `<strong>🏥 Hospital: ${feature.properties.NOMBRE}</strong><br/>${feature.properties.PROVINCIA} - ${feature.properties.CANTON}`;
            break;
        case 'escuela':
            var canton = feature.properties.CANTON || feature.properties.CANTóN;
            tooltipContent = `<strong>🏫 Escuela: ${feature.properties.NOMBRE}</strong><br/>${feature.properties.PROVINCIA} - ${canton}`;
            break;
    }
    
    layer.bindTooltip(tooltipContent, {
        sticky: true,
        direction: 'auto',
        className: 'custom-tooltip'
    });
}

function createPopup(feature, layer, layerType) {
    var poblacion = feature.properties.poblacion ? formatNumber(feature.properties.poblacion) : 'No disponible';
    var popupContent = '';
    
    switch(layerType) {
        case 'provincia':
            popupContent = `<h3>🏛️ Provincia: ${feature.properties.nombre}</h3>
                          <div class="popup-section">
                            <p><strong>Población 2022:</strong> ${poblacion} habitantes</p>
                          </div>`;
            break;
        case 'canton':
            popupContent = `<h3>🏢 Cantón: ${feature.properties.nombre}</h3>
                          <div class="popup-section">
                            <p><strong>Provincia:</strong> ${feature.properties.provincia}</p>
                            <p><strong>Población 2022:</strong> ${poblacion} habitantes</p>
                          </div>`;
            break;
        case 'distrito':
            popupContent = `<h3>📍 Distrito: ${feature.properties.nombre}</h3>
                          <div class="popup-section">
                            <p><strong>Cantón:</strong> ${feature.properties.canton}</p>
                            <p><strong>Provincia:</strong> ${feature.properties.provincia}</p>
                            <p><strong>Población 2022:</strong> ${poblacion} habitantes</p>
                          </div>`;
            break;
        case 'hospital':
            popupContent = `<h3>🏥 Hospital: ${feature.properties.NOMBRE}</h3>
                          <div class="popup-section">
                            <p><strong>Provincia:</strong> ${feature.properties.PROVINCIA}</p>
                            <p><strong>Cantón:</strong> ${feature.properties.CANTON}</p>
                            <p><strong>Distrito:</strong> ${feature.properties.DISTRITO}</p>
                          </div>`;
            break;
        case 'escuela':
            var canton = feature.properties.CANTON || feature.properties.CANTóN;
            popupContent = `<h3>🏫 Escuela: ${feature.properties.NOMBRE}</h3>
                          <div class="popup-section">
                            <p><strong>Provincia:</strong> ${feature.properties.PROVINCIA}</p>
                            <p><strong>Cantón:</strong> ${canton}</p>
                            <p><strong>Distrito:</strong> ${feature.properties.DISTRITO}</p>
                          </div>`;
            break;
    }
    
    layer.bindPopup(popupContent);
}

function setupFeatureInteractions(layer, layerType) {
    createTooltip(layer.feature, layer, layerType);
    createPopup(layer.feature, layer, layerType);
    
    layer.on({
        mouseover: function(e) {
            var layer = e.target;
            layer.setStyle({
                weight: 0,
                fillOpacity: 0.6 // Solo visible al hacer hover
            });
            
            updateInfoPanel(layer.feature, layerType);
            hoveredFeature = layer;
        },
        mouseout: function(e) {
            var layer = e.target;
            var originalColor = getColorForFeature(layer.feature, layerType);
            layer.setStyle({
                weight: 0,
                color: 'transparent',
                fillColor: originalColor,
                fillOpacity: 0 // Completamente transparente
            });
            
            if (hoveredFeature === layer) {
                document.getElementById('feature-info').innerHTML = 
                    '<p>Haz clic o pasa el mouse sobre el mapa para ver información</p>';
                hoveredFeature = null;
            }
        },
        click: function(e) {
            var layer = e.target;
            updateInfoPanel(layer.feature, layerType);
            layer.openPopup();
            
            if (window.hospitalesLayer && map.hasLayer(window.hospitalesLayer)) {
                window.hospitalesLayer.bringToFront();
            }
            if (window.escuelasLayer && map.hasLayer(window.escuelasLayer)) {
                window.escuelasLayer.bringToFront();
            }
        }
    });
}

function setupPointInteractions(layer, layerType) {
    var originalStyle = { ...layer.options };
    
    createTooltip(layer.feature, layer, layerType);
    createPopup(layer.feature, layer, layerType);
    
    layer.on({
        mouseover: function(e) {
            var layer = e.target;
            if (layerType === 'hospital') {
                layer.setStyle({
                    radius: 4,
                    fillOpacity: 1.0,
                    weight: 2
                });
            } else {
                layer.setStyle({
                    radius: 3,
                    fillOpacity: 0.9,
                    weight: 1
                });
            }
            
            layer.bringToFront();
            updateInfoPanel(layer.feature, layerType);
        },
        mouseout: function(e) {
            var layer = e.target;
            layer.setStyle(originalStyle);
        },
        click: function(e) {
            var layer = e.target;
            updateInfoPanel(layer.feature, layerType);
            layer.openPopup();
            layer.bringToFront();
        }
    });
}

function loadFilteredPoints() {
    var currentZoom = map.getZoom();
    
    // Solo remover las capas si existen
    if (window.hospitalesLayer) {
        map.removeLayer(window.hospitalesLayer);
    }
    if (window.escuelasLayer) {
        map.removeLayer(window.escuelasLayer);
    }
    
    // Cargar hospitales solo si el toggle está activado
    if (hospitalesVisible) {
        fetch('data/hospitales.geojson')
            .then(response => response.json())
            .then(data => {
                var filteredHospitales = data.features.filter(feature => 
                    estaEnAreaPoblada(feature, currentZoom)
                );
                
                window.hospitalesLayer = L.geoJSON({
                    type: 'FeatureCollection',
                    features: filteredHospitales
                }, {
                    pointToLayer: function(feature, latlng) {
                        return L.circleMarker(latlng, {
                            radius: 3,
                            fillColor: "#e74c3c",
                            color: "#c0392b",
                            weight: 1,
                            opacity: 1,
                            fillOpacity: 0.8
                        });
                    },
                    onEachFeature: function(feature, layer) {
                        setupPointInteractions(layer, 'hospital');
                    }
                });
                
                window.hospitalesLayer.addTo(map);
                window.hospitalesLayer.bringToFront();
            })
            .catch(error => console.error('Error cargando hospitales:', error));
    }

    // Cargar escuelas solo si el toggle está activado
    if (escuelasVisible) {
        fetch('data/escuelas.geojson')
            .then(response => response.json())
            .then(data => {
                var filteredEscuelas = data.features.filter(feature => 
                    estaEnAreaPoblada(feature, currentZoom)
                );
                
                window.escuelasLayer = L.geoJSON({
                    type: 'FeatureCollection',
                    features: filteredEscuelas
                }, {
                    pointToLayer: function(feature, latlng) {
                        return L.circleMarker(latlng, {
                            radius: 2,
                            fillColor: "#27ae60",
                            color: "#229954",
                            weight: 1,
                            opacity: 1,
                            fillOpacity: 0.7
                        });
                    },
                    onEachFeature: function(feature, layer) {
                        setupPointInteractions(layer, 'escuela');
                    }
                });
                
                window.escuelasLayer.addTo(map);
                window.escuelasLayer.bringToFront();
            })
            .catch(error => console.error('Error cargando escuelas:', error));
    }
}

function getColorForFeature(feature, nivel) {
    var poblacion = feature.properties.poblacion;
    if (!poblacion) return '#ccc';
    
    var scheme = colorSchemes[nivel];
    
    if (nivel === 'provincia') {
        if (poblacion < 500000) return scheme.colors[0];
        if (poblacion < 800000) return scheme.colors[1];
        if (poblacion < 1200000) return scheme.colors[2];
        if (poblacion < 1500000) return scheme.colors[3];
        return scheme.colors[4];
    } else if (nivel === 'canton') {
        if (poblacion < 30000) return scheme.colors[0];
        if (poblacion < 80000) return scheme.colors[1];
        if (poblacion < 150000) return scheme.colors[2];
        if (poblacion < 250000) return scheme.colors[3];
        return scheme.colors[4];
    } else if (nivel === 'distrito') {
        if (poblacion < 5000) return scheme.colors[0];
        if (poblacion < 15000) return scheme.colors[1];
        if (poblacion < 30000) return scheme.colors[2];
        if (poblacion < 60000) return scheme.colors[3];
        return scheme.colors[4];
    }
    
    return '#ccc';
}

function updateLegend() {
    if (legendControl) {
        map.removeControl(legendControl);
    }
    
    legendControl = L.control({position: 'topright'});
    
    legendControl.onAdd = function(map) {
        var div = L.DomUtil.create('div', 'legend');
        var zoomLevel = map.getZoom();
        var currentLevel = '';
        
        if (zoomLevel < 9) {
            currentLevel = 'provincia';
            div.innerHTML = '<h4>Población por Provincia</h4>';
        } else if (zoomLevel < 11) {
            currentLevel = 'canton';
            div.innerHTML = '<h4>Población por Cantón</h4>';
        } else {
            currentLevel = 'distrito';
            div.innerHTML = '<h4>Población por Distrito</h4>';
        }
        
        var scheme = colorSchemes[currentLevel];
        for (var i = 0; i < scheme.colors.length; i++) {
            div.innerHTML += `
                <div class="legend-item">
                    <div class="legend-color" style="background:${scheme.colors[i]}"></div>
                    <span>${scheme.ranges[i]}</span>
                </div>
            `;
        }
        
        if (hospitalesVisible || escuelasVisible) {
            div.innerHTML += `
                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #ecf0f1;">
                    <h4>Servicios</h4>
            `;
            
            if (hospitalesVisible) {
                div.innerHTML += `
                    <div class="legend-item">
                        <div class="legend-color" style="background:#e74c3c; border-radius: 50%;"></div>
                        <span>🏥 Hospitales</span>
                    </div>
                `;
            }
            
            if (escuelasVisible) {
                div.innerHTML += `
                    <div class="legend-item">
                        <div class="legend-color" style="background:#27ae60; border-radius: 50%;"></div>
                        <span>🏫 Escuelas</span>
                    </div>
                `;
            }
            
            div.innerHTML += `</div>`;
        }
        
        return div;
    };
    
    legendControl.addTo(map);
}

function updateZoomInfo() {
    currentZoom = map.getZoom();
    document.getElementById('zoom-level').textContent = currentZoom;
    updateLegend();
    loadFilteredPoints();
}

// Controladores de eventos para los toggles
document.getElementById('hospitales-toggle').addEventListener('change', function(e) {
    hospitalesVisible = e.target.checked;
    loadFilteredPoints();
    updateLegend();
});

document.getElementById('escuelas-toggle').addEventListener('change', function(e) {
    escuelasVisible = e.target.checked;
    loadFilteredPoints();
    updateLegend();
});

document.getElementById('reset-view').addEventListener('click', function() {
    map.setView([9.9281, -84.0907], 8);
});

map.on('zoomend', updateZoomInfo);
map.on('moveend', updateZoomInfo);

function loadGeographicData() {
    // Cargar provincias completamente transparentes
    fetch('data/poblacion_provincias_2022.geojson')
        .then(response => {
            if (!response.ok) {
                throw new Error('Error cargando provincias: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            L.geoJSON(data, {
                style: function(feature) {
                    return {
                        fillColor: getColorForFeature(feature, 'provincia'),
                        weight: 0,
                        opacity: 0,
                        color: 'transparent',
                        fillOpacity: 0 // Completamente transparente
                    };
                },
                onEachFeature: function(feature, layer) {
                    setupFeatureInteractions(layer, 'provincia');
                }
            }).addTo(map);
            console.log('Provincias cargadas correctamente');
        })
        .catch(error => console.error('Error:', error));

    // Cargar cantones completamente transparentes
    fetch('data/poblacion_cantones_2022.geojson')
        .then(response => {
            if (!response.ok) {
                throw new Error('Error cargando cantones: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            window.cantonesLayer = L.geoJSON(data, {
                style: function(feature) {
                    return {
                        fillColor: getColorForFeature(feature, 'canton'),
                        weight: 0,
                        opacity: 0,
                        color: 'transparent',
                        fillOpacity: 0 // Completamente transparente
                    };
                },
                onEachFeature: function(feature, layer) {
                    setupFeatureInteractions(layer, 'canton');
                }
            });
            
            map.on('zoomend', function() {
                if (map.getZoom() >= 9) {
                    if (!map.hasLayer(window.cantonesLayer)) {
                        map.addLayer(window.cantonesLayer);
                    }
                } else {
                    if (map.hasLayer(window.cantonesLayer)) {
                        map.removeLayer(window.cantonesLayer);
                    }
                }
            });
            console.log('Cantones cargados correctamente');
        })
        .catch(error => console.error('Error:', error));

    // Cargar distritos completamente transparentes
    fetch('data/poblacion_distritos_2022.geojson')
        .then(response => {
            if (!response.ok) {
                throw new Error('Error cargando distritos: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            window.distritosLayer = L.geoJSON(data, {
                style: function(feature) {
                    return {
                        fillColor: getColorForFeature(feature, 'distrito'),
                        weight: 0,
                        opacity: 0,
                        color: 'transparent',
                        fillOpacity: 0 // Completamente transparente
                    };
                },
                onEachFeature: function(feature, layer) {
                    setupFeatureInteractions(layer, 'distrito');
                }
            });
            
            map.on('zoomend', function() {
                if (map.getZoom() >= 11) {
                    if (!map.hasLayer(window.distritosLayer)) {
                        map.addLayer(window.distritosLayer);
                    }
                } else {
                    if (map.hasLayer(window.distritosLayer)) {
                        map.removeLayer(window.distritosLayer);
                    }
                }
            });
            console.log('Distritos cargados correctamente');
        })
        .catch(error => console.error('Error:', error));
}

map.whenReady(function() {
    loadGeographicData();
    loadFilteredPoints();
    setTimeout(updateZoomInfo, 1000);
    
    L.control.scale({
        imperial: false,
        position: 'bottomleft'
    }).addTo(map);
    
    console.log('🗺️ Mapa de Población Costa Rica 2022 - Inicializado');
});