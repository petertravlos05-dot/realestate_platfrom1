'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FaUndo, FaRedo, FaTimes } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { GoogleMap, LoadScript, DrawingManager } from '@react-google-maps/api';

const libraries = ['drawing'];

export default function DrawArea() {
  const router = useRouter();
  const [drawnArea, setDrawnArea] = useState<any>(null);
  const mapRef = useRef<google.maps.Map>();
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager>();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const mapContainerStyle = {
    width: '100%',
    height: 'calc(100vh - 64px)', // Full height minus header
  };

  const center = {
    lat: 37.9838,
    lng: 23.7275
  };

  const mapOptions = {
    zoomControl: true,
    mapTypeControl: false,
    scaleControl: true,
    streetViewControl: false,
    rotateControl: false,
    fullscreenControl: true
  };

  const getDrawingManagerOptions = () => {
    if (!isClient) return {};
    
    return {
      drawingMode: window.google?.maps.drawing.OverlayType.POLYGON,
      drawingControl: true,
      drawingControlOptions: {
        position: window.google?.maps.ControlPosition.TOP_CENTER,
        drawingModes: [window.google?.maps.drawing.OverlayType.POLYGON]
      },
      polygonOptions: {
        fillColor: '#001f3f',
        fillOpacity: 0.3,
        strokeWeight: 2,
        strokeColor: '#001f3f',
        clickable: true,
        editable: true,
        draggable: true
      }
    };
  };

  if (!isClient) {
    return null;
  }

  const onLoad = (map: google.maps.Map) => {
    mapRef.current = map;
  };

  const onDrawingManagerLoad = (drawingManager: google.maps.drawing.DrawingManager) => {
    drawingManagerRef.current = drawingManager;
  };

  const onPolygonComplete = (polygon: google.maps.Polygon) => {
    if (drawnArea) {
      drawnArea.setMap(null);
    }
    setDrawnArea(polygon);
  };

  const handleSaveArea = () => {
    if (drawnArea) {
      const path = drawnArea.getPath();
      const coordinates = path.getArray().map((latLng: google.maps.LatLng) => ({
        lat: latLng.lat(),
        lng: latLng.lng()
      }));
      // Αποθήκευση των συντεταγμένων και επιστροφή στη σελίδα αναζήτησης
      router.push('/properties');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white shadow-md z-10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-bold text-gray-800">
              Σχεδιάστε την Περιοχή Αναζήτησης
            </h1>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Map Container */}
      <div className="pt-16 relative h-[calc(100vh-64px)]">
        <LoadScript
          googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}
          libraries={libraries as any}
        >
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={13}
            options={mapOptions}
            onLoad={onLoad}
          >
            <DrawingManager
              onLoad={onDrawingManagerLoad}
              onPolygonComplete={onPolygonComplete}
              options={getDrawingManagerOptions()}
            />
          </GoogleMap>
        </LoadScript>

        {/* Instructions */}
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-xs">
          <h3 className="font-bold text-gray-800 mb-2">Οδηγίες</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• Σχεδιάστε την περιοχή που σας ενδιαφέρει στο χάρτη</li>
            <li>• Χρησιμοποιήστε τα εργαλεία για αναίρεση/επανάληψη</li>
            <li>• Πατήστε "Αποθήκευση Περιοχής" όταν τελειώσετε</li>
          </ul>
        </div>

        {/* Save Area Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <button
            onClick={handleSaveArea}
            className="px-8 py-3 bg-[#001f3f] text-white rounded-lg hover:bg-[#003366] transition-colors shadow-lg"
          >
            Αποθήκευση Περιοχής
          </button>
        </motion.div>
      </div>
    </div>
  );
} 