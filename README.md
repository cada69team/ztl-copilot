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

### 📱️ PWA Capabilities & UX
- Installable on home screen (iOS & Android)
- Professional PWA install prompts (bottom sheet, delayed, instructions modal)
- Full-screen mode for driving
- Offline caching (map tiles, zone data)
- Works without internet (cached data)
- Sound preferences (siren, chime, silent) - NEW!
- Sound settings modal with test sounds - NEW!
- PWA install detection (standalone mode check)
- PWA install instructions for different browsers - NEW!
  - Chrome (Android & Desktop)
  - Safari (iPhone & iPad)
  - Firefox (Android)

### 💰 Monetization
- Free tier: 3 alerts per day
- Premium tier: €4.99 one-time payment
- Stripe checkout integration
- Automatic upgrade prompts at limit
- "Maybe later" and "Don't show again" options
- Persistent localStorage (remembers across sessions)

### 🎯 Business Value
- Prevents €85-150 ZTL fines
- Saves users €100+ per incident
- Clear upgrade path when frustrated
- Professional PWA install prompts increase conversion
- Sound customization increases perceived premium value
- PWA install instructions solve "button doesn't work" issue
- Mobile-first UX design (optimized for driving)

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
- Test PWA install instructions (try different browsers)
- Test zone details modal (tap any red zone for info)
- Test sound settings modal (tap sound icon in header)

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
│   │   └── checkout.tsx             # Stripe checkout endpoint
│   ├── pricing/
│   │   └── page.tsx                  # Free vs Premium tiers
│   └── page.tsx                      # Main map page
├── components/
│   └── Map.tsx                      # Main map + PWA prompts + sound settings
├── hooks/
│   └── useZtlStatus.ts               # Zone active hours logic
├── public/
│   ├── ztl-zones.json               # Zone data (Milan, Turin, Bergamo)
│   ├── manifest.json                 # PWA manifest
│   ├── icons/                        # App icons (192x192, 512x512)
│   ├── siren.mp3                    # Alert sound
│   └── sounds/                       # Sound files directory
│       └── chime.mp3             # Calm alert sound (NEW!)
├── memory/
│   ├── phase2-complete.md              # Phase 2 documentation
│   ├── todays-accomplishments.md       # Daily session summaries
│   └── option-a-phase3-calm-sounds.md  # Phase 3 documentation
└── next.config.mjs                   # PWA configuration
```

## Business Model

### Free Tier (0€)
- 3 ZTL alerts per day
- Real-time GPS tracking
- Map with all zones
- PWA installable
- Default sound: Siren
- Ads (optional, not implemented)

### Premium Tier (€4.99 one-time)
- Unlimited ZTL alerts
- Distance-based warnings (200m, 100m, 50m)
- Zone details modal (hours, exceptions, permits)
- Sound preferences (siren, chime, silent) - NEW!
- Multi-language (EN, IT, FR, DE) - Coming in Phase 4
- Offline mode improvements - Coming in Phase 5
- Alert history log - Coming in Phase 6
- No ads

## Monetization Strategy

### Phase 1: Foundation ✅ COMPLETE
- PWA install prompts (bottom sheet, delayed, instructions)
- Stripe checkout integration
- Free tier rate limiting (3/day)
- Automatic upgrade prompts
- Zone details modal with upgrade CTAs
- PWA install detection and dismissal preference

### Phase 2: Polish UX (IN PROGRESS)
- ✅ Phase 3: Calm alert sounds + sound settings modal
- 🔄 Phase 4: Multi-language support (EN, IT, FR, DE) - NEXT
- ⏳ Phase 5: Offline mode improvements
- ⏳ Phase 6: Alert history log page

### Phase 3: Marketing (PLANNED)
- Landing page with screenshots/demo
- SEO optimization (meta tags, structured data, sitemap)
- Social media content (Instagram, Twitter/X, LinkedIn)
- Explainer video showing app in action
- Create blog content (SEO blog posts about avoiding ZTL fines)

## Development Notes

### Zone Data Format
Each zone includes:
- `city`: City name (Milan, Turin, Bergamo)
- `name`: Zone name (Area C, ZTL Centrale, etc.)
- `fine`: Potential fine amount (€85-150)
- `note`: Operating hours (if available)
- `coordinates`: Polygon boundary (Lat/Lon pairs)

### Alert Logic
- 50m before zone: "INSIDE ZTL" + siren sound (always, regardless of setting)
- 200m before zone: "ZTL in 200m - Turn right in 150m to avoid" (uses selected sound)
- 100m before zone: "ZTL 100m ahead - Prepare to turn" (uses selected sound)
- Alert count tracks per GPS position update
- Daily limit resets at midnight

### Sound System (NEW!)
- **Siren:** Plays for INSIDE ZTL alerts (critical, ignores user preference)
- **Chime:** Pleasant, not scary (user-selectable for approach warnings)
- **Silent:** No alert sounds (user-selectable)
- Sound selector in header (🚨/🔔/🔕 icons based on preference)
- Sound settings modal with test sounds
- Preferences persist in localStorage (`alert-sound-preference`)

### PWA Install Prompt
- Detects standalone mode: `window.matchMedia('(display-mode: standalone)')`
- Shows bottom sheet after 5 seconds (non-intrusive)
- Stores dismissal in localStorage with 7-day expiry
- Provides clear CTAs: "Add to Home Screen", "Maybe later", "Don't show again"
- Uses app icon: `/icons/icon-192.png`
- **NEW:** If `deferredPrompt` not available, shows instructions modal:
  - Chrome: Address bar → "Add to Home Screen..." → "Add"
  - Safari: Share button → "Add to Home Screen" → "Add"
  - Firefox: Menu → "Install App"
- Explains benefits: full-screen mode, offline capability, faster loading

### localStorage Keys
- `ztl-alert-count`: Daily alert count
- `ztl-alert-date`: Last reset date
- `pwa-install-dismissed`: Don't show PWA install prompt flag
- `pwa-install-dismissed-date`: When user declined (7-day expiry)
- `alert-sound-preference`: Sound preference (siren/calm/silent)

## Performance Optimizations

- Turf.js filters zones < 1km for performance
- Smooth GPS panning (0.5s animation vs instant)
- Debounced geolocation updates
- Service worker caching (PWA)
- CSS animations (slide-up transitions) with GPU acceleration

## Known Issues

- TypeScript strict typing (using `any` for ZoneFeature properties)
- Turf.js coordinate type mismatches (using `any` for zones)
- Zone precision (polygons approximated for demo)

## PWA Install Instructions (NEW!)

### Chrome (Android & Desktop)
1. Tap ⋮ in address bar
2. Select "Add Olympic Shield 2026 to Home Screen..."
3. Tap "Add"

### Safari (iPhone & iPad)
1. Tap Share icon in bottom toolbar
2. Tap "Add to Home Screen"
3. Tap "Add" in top right corner

### Firefox (Android)
1. Tap ⋮ in address bar
2. Select "Install App"

## Future Enhancements

- [ ] Real-time zone updates (when hours change)
- [ ] Turn-by-turn navigation to avoid zones
- [ ] Traffic-aware routing (live data from city APIs)
- [ ] User-submitted zones (crowdsourced data)
- [ ] Integration with rental car fleets
- [ ] Multi-city expansion (Rome, Venice, Naples)
- [ ] Multi-language support (EN, IT, FR, DE)
- [ ] Offline mode improvements
- [ ] Alert history log page

## License

MIT License - Feel free to fork and use for your own city's ZTL needs.
