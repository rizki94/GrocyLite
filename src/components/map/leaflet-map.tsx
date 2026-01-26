import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

interface MapMarker {
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  type?: 'checkin' | 'checkout' | 'visit' | 'default';
}

interface LeafletMapProps {
  markers?: MapMarker[];
  routeCoordinates?: { latitude: number; longitude: number }[];
  center?: { latitude: number; longitude: number };
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  markers = [],
  routeCoordinates = [],
  center,
}) => {
  // Default to Bandung if no center provided
  const mapCenter = center || { latitude: -6.9175, longitude: 107.6191 };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
        <style>
          body { padding: 0; margin: 0; }
          #map { width: 100%; height: 100vh; }
          .custom-icon {
            display: flex;
            justify-content: center;
            align-items: center;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            font-weight: bold;
            color: white;
            font-family: sans-serif;
            font-size: 10px;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const map = L.map('map').setView([${mapCenter.latitude}, ${mapCenter.longitude}], 13);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }).addTo(map);

          // Data from props
          const markers = ${JSON.stringify(markers)};
          const routeCoords = ${JSON.stringify(
            routeCoordinates.map(c => [c.latitude, c.longitude]),
          )};

          // Add Markers
          markers.forEach(m => {
            let color = '#3b82f6'; // blue
            let label = '';
            
            if (m.type === 'checkin') { color = '#10b981'; label = 'IN'; } // emerald
            else if (m.type === 'checkout') { color = '#ef4444'; label = 'OUT'; } // red
            else if (m.type === 'visit') { color = '#f59e0b'; label = 'V'; } // amber
            
            const icon = L.divIcon({
              className: 'custom-div-icon',
              html: \`<div style="background-color: \${color};" class="custom-icon" style="width: 24px; height: 24px;">\${label}</div>\`,
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            });

            // Fallback simplistic marker if divIcon is complex
            const marker = L.marker([m.latitude, m.longitude]).addTo(map);
            
            if (m.title) {
              marker.bindPopup(\`<b>\${m.title}</b><br>\${m.description || ''}\`);
            }
          });

          // Add Polyline
          if (routeCoords.length > 0) {
            const polyline = L.polyline(routeCoords, {color: '#3b82f6', weight: 4}).addTo(map);
            map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
          } else if (markers.length > 0) {
             const group = new L.featureGroup(markers.map(m => L.marker([m.latitude, m.longitude])));
             map.fitBounds(group.getBounds(), { padding: [50, 50] });
          }
        </script>
      </body>
    </html>
  `;

  return (
    <View style={{ flex: 1 }}>
      <WebView
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={{ flex: 1 }}
        startInLoadingState={true}
        renderLoading={() => <ActivityIndicator size="large" color="#0000ff" />}
      />
    </View>
  );
};
