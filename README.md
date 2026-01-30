# ZTL-Copilot: Olympic Shield 2026

A PWA for avoiding ZTL fines during Milan 2026 Olympics.

## Features

### 🚗️ Core ZTL Detection
- Real-time GPS tracking with high accuracy
- Automatic ZTL zone detection
- Distance-based approach warnings (200m, 100m, 50m)
- Zone details modal (tap any red zone for info)
- Nearest zone highlighting (red = target, orange = others)
- Real-time distance display in blue info box
- Alert counter with daily free limit (3/day)

### 📱️ PWA Capabilities
- Installable on home screen (iOS & Android)
- Full-screen mode for driving
- Offline caching (map tiles, zone data)
- Service worker for background updates
- Works without internet (cached data)

### 💰 Monetization
- Free tier: 3 alerts per day
- Premium tier: €4.99 one-time payment
- Stripe checkout integration
- Automatic upgrade prompts at limit
- "Maybe later" and "Don't show again" options
- Persistent localStorage (remembers across refreshes)

### 🎯 Business Value
- Prevents €85-150 ZTL fines
- Saves users €100+ per incident
- Clear upgrade path when frustrated
- Professional PWA install prompts
- Mobile-first UX design

## Tech Stack

- Next.js 16.1.6 (App Router)
- React 19 with TypeScript
- Tailwind CSS (mobile-optimized)
- React-Leaflet (interactive maps)
- Turf.js (geospatial calculations)
- PWA (@ducanh2912/next-pwa)
- Stripe Checkout (sandbox for testing)

## Getting Started

### Installation
1. Clone repository
2. Install dependencies: `npm install`
3. Start development: `npm run dev`
4. Build production: `npm run build`
5. Deploy to Vercel: `vercel --prod`

### Testing
- Open app in Chrome on mobile device
- Enable "Developer Tools" → More tools → Sensors → Location
- Test zone boundaries (drive virtually or use GPS simulation)
- Verify alerts trigger at correct distances (200m, 100m, 50m)
- Test PWA install prompt (should appear 5 seconds after load)

### Production Deployment
```bash
# Deploy to production
vercel --prod
```

## Project Structure

```
ztl-copilot/
├── app/
│   ├── api/
│   │   └── checkout.tsx          # Stripe checkout endpoint
│   ├── pricing/
│   │   └── page.tsx              # Free vs Premium tiers
│   └── page.tsx                   # Main map page
├── components/
│   └── Map.tsx                    # Main map + PWA prompts
├── hooks/
│   └── useZtlStatus.ts             # Zone active hours logic
├── public/
│   ├── ztl-zones.json               # Zone data (Milan, Turin, Bergamo)
│   ├── manifest.json                 # PWA manifest
│   ├── icons/                       # App icons (192x192, 512x512)
│   └── siren.mp3                   # Alert sound
├── memory/
│   ├── phase2-complete.md           # Phase 2 documentation
│   └── todays-accomplishments.md    # Today's session summary
└── next.config.mjs                   # PWA configuration
```

## Business Model

### Free Tier (0€)
- 3 ZTL alerts per day
- Real-time GPS tracking
- Map with all zones
- PWA installable
- Ads (optional, not implemented)

### Premium Tier (€4.99 one-time)
- Unlimited ZTL alerts
- Approach warnings (200m, 100m, 50m)
- Zone details modal (hours, exceptions, permits)
- Calm alert sounds vs siren
- Multi-language (EN, IT, FR, DE)
- Offline mode improvements
- Alert history log
- No ads

## Monetization Strategy

### Phase 1: Foundation ✅ COMPLETE
- PWA install prompts
- Stripe checkout integration
- Free tier rate limiting (3/day)
- Automatic upgrade prompts

### Phase 2: Polish UX (IN PROGRESS)
- Calm alert sounds
- Multi-language support
- Alert history page
- Offline mode improvements

### Phase 3: Marketing (READY TO START)
- Landing page with screenshots
- SEO optimization (meta tags, structured data)
- Social media content (Instagram, Twitter/X, LinkedIn)
- Explainer video showing app in action

## Development Notes

### Zone Data Format
Each zone includes:
- `city`: City name (Milan, Turin, Bergamo)
- `name`: Zone name (Area C, ZTL Centrale, etc.)
- `fine`: Potential fine amount (€85-150)
- `note`: Operating hours (if available)
- `coordinates`: Polygon boundary (Lat/Lon pairs)

### Alert Logic
- 50m before zone: "INSIDE ZTL" + siren sound
- 200m before zone: "ZTL in 200m - Turn right in 150m"
- 100m before zone: "ZTL 100m ahead - Prepare to turn"
- Alert count tracks per GPS update
- Daily limit resets at midnight

### PWA Install Prompt
- Detects standalone mode: `window.matchMedia('(display-mode: standalone)')`
- Shows bottom sheet after 5 seconds (non-intrusive)
- Stores dismissal in localStorage with 7-day expiry
- Provides clear CTAs: "Add to Home Screen", "Maybe later", "Don't show again"

### localStorage Keys
- `ztl-alert-count`: Daily alert count
- `ztl-alert-date`: Last reset date
- `pwa-install-dismissed`: User declined PWA install
- `pwa-install-dismissed-date`: When user declined

## Performance Optimizations

- Turf.js filters zones < 1km for performance
- Smooth GPS panning (0.5s animation vs instant)
- Debounced geolocation updates
- Service worker caching (PWA)

## Known Issues

- TypeScript errors with optional chaining (using type guards)
- Turf.js coordinate type mismatches (using `any` for zones)
- Zone precision (polygons approximated for demo)

## Future Enhancements

- [ ] Real-time zone updates (when hours change)
- [ ] Turn-by-turn navigation to avoid zones
- [ ] Traffic-aware routing (live data from city APIs)
- [ ] User-submitted zones (crowdsourced data)
- [ ] Integration with rental car fleets
- [ ] Multi-city expansion (Rome, Venice, Naples)

## License

MIT License - Feel free to fork and use for your own city's ZTL needs.
