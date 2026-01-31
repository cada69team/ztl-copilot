"use client"

import { useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, useMap, ZoomControl } from 'react-leaflet';
import * as turf from '@turf/turf';
import { isZoneActive } from '@/hooks/useZtlStatus';
import { useAlertHistory } from '@/hooks/useAlertHistory';
import { useGpsHistory } from '@/hooks/useGpsHistory';
import { useZoneInteractions } from '@/hooks/useZoneInteractions';

export interface ZoneFeature {
  type: string;
  properties: {
    city: string;
    name: string;
    fine: number;
    note?: string;
  };
  geometry: {
    type: string;
    coordinates: any;
  };
}
