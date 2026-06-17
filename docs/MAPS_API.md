# Google Maps API Architecture — Ride Share

## Security model

| Key | Env variable | Used for | Exposure |
|-----|----------------|----------|----------|
| **Server** | `GOOGLE_MAPS_SERVER_KEY` | Places Autocomplete, Place Details, Directions, Distance Matrix, Geocoding | Backend only — never sent to browser |
| **Browser** | `GOOGLE_MAPS_BROWSER_KEY` | Maps JavaScript API rendering | Returned via `GET /api/v1/maps/bootstrap` to **authenticated** users only |

Restrict keys in [Google Cloud Console](https://console.cloud.google.com/google/maps-apis):

- **Server key**: IP restrictions + APIs: Directions, Distance Matrix, Places, Geocoding  
- **Browser key**: HTTP referrer restrictions + Maps JavaScript API  

Optional dev fallback: `VITE_GOOGLE_MAPS_API_KEY` (referrer-restricted).

## API routes (all require JWT + rate limit 40/min)

```
GET  /api/v1/maps/bootstrap
GET  /api/v1/maps/places/autocomplete?input=&sessionToken=&lat=&lng=
GET  /api/v1/maps/places/details?placeId=&sessionToken=
GET  /api/v1/maps/geocode/reverse?lat=&lng=
POST /api/v1/maps/directions          { origin, destination, mode? }
POST /api/v1/maps/distance-matrix     { origins[], destinations[], mode? }
POST /api/v1/maps/nearby-rides        { pickup, destination?, communityId?, departureDate? }
POST /api/v1/maps/route-suggestions   { pickup, destination }
```

## Frontend module (`src/features/maps/`)

| Piece | Role |
|-------|------|
| `useMapsBootstrap` | Loads browser key from backend |
| `useUserLocation` | Live GPS watch |
| `useTripRoute` | Distance + ETA via directions API |
| `PlaceAutocomplete` | Proxied search (no client Places key) |
| `GoogleMapCanvas` | Markers, polyline, fit bounds |
| `LiveMapPage` | Full trip planner UI |

## Route optimization

`route-suggestions` and `nearby-rides` score carpools by:

1. Haversine deviation from your pickup to ride origin  
2. Haversine deviation from your destination to ride destination  
3. Optional Google Distance Matrix ETA to pickup  
4. Labels: `EXCELLENT_MATCH`, `GOOD_MATCH`, `FAR_DETOUR`

## Setup

```env
# backend/.env
GOOGLE_MAPS_SERVER_KEY=your_server_key
GOOGLE_MAPS_BROWSER_KEY=your_browser_key
```

Enable billing on the Google Cloud project and enable required APIs.
