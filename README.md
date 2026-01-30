# ZTL-Copilot: Olympic Shield 2026

A PWA for avoiding ZTL fines during Milan 2026 Olympics.

## Features

### 🚗️ Core ZTL Detection
- Real-time GPS tracking with high accuracy
- Automatic ZTL zone detection
- Distance-based approach warnings (200m, 100m, 50m)
- Zone details modal (tap any red zone for info)
- **Nearest zone highlighting (RED = target, ORANGE = others)** - FIXED! ✅
- Real-time distance display in blue info box
- Alert counter with daily free limit (3/day)

### 📱️ PWA Capabilities & UX
- **Installable on home screen (iOS & Android)** - WORKING! ✅
- **Professional PWA install prompts:**
  - **Bottom sheet** (mobile-first design)
  - **Delayed prompt** (shows 5 seconds after load)
  - **Instructions modal** (fallback when deferredPrompt not available) - NEW!
  - **Browser-specific instructions:**
    - **Chrome (Android & Desktop):** Address bar → "Add" → "Add"
    - **Safari (iPhone & iPad):** Share button → "Add to Home Screen" → "Add"
    - **Firefox (Android):** Menu → "Install App"
  - **Explains benefits:** Full-screen mode, offline, faster loading
- Full-screen mode for driving
- Offline caching (map tiles, zone data)
- Works without internet (cached data)
- Install prompt remembers user preference (7-day expiry)

### 🔊 Sound Preferences - NEW! ✅
- **Sound selector in header** (🚨/🔔/🔕 icons)
- **Sound settings modal** with test sounds:
  - **🚨 Siren:** For critical ZTL alerts (INSIDE zone, always plays)
  - **🔔 Chime:** Pleasant, not scary (user-selectable for approach warnings)
  - **🔕 Silent:** No alert sounds (user-selectable)
- **Sound preferences persist in localStorage** (`alert-sound-preference`)
- **Tap to test sounds** before selecting

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
- **Sound customization increases perceived premium value** - NEW!
- **PWA install instructions solve "button doesn't work" issue** - NEW!
- **Nearest zone highlighting provides clear visual feedback** - FIXED! ✅
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
- **Verify RED zone highlights when you're nearest** - CRITICAL TEST! ✅
- **Verify ORANGE zones for other zones** - CRITICAL TEST! ✅
- Test PWA install prompt (should appear 5 seconds after load)
- **Test PWA install instructions modal** (try different browsers) - NEW!
- **Test sound settings modal** (tap sound icon in header) - NEW!
- **Test all three sound options** (siren, chime, silent) - NEW!
- **Verify sound preferences persist across sessions** - NEW!
- Test zone details modal (tap any red zone for info)

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
│   └── sounds/                       # Sound files directory (NEW!)
├── memory/
│   ├── phase2-complete.md              # Phase 2 documentation
│   ├── todays-accomplishments.md       # Daily session summaries
│   └── option-a-phase3-calm-sounds.md # Phase 3 documentation
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
- **Unlimited ZTL alerts** - Premium!
- **Distance-based warnings** (200m, 100m, 50m)
- **Zone details modal** (hours, exceptions, permits)
- **Sound preferences** (siren, chime, silent) - Premium! NEW!
- Multi-language (EN, IT, FR, DE) - Coming in Phase 4
- Offline mode improvements - Coming in Phase 5
- Alert history log - Coming in Phase 6
- No ads

## Monetization Strategy

### Phase 1: Foundation ✅ COMPLETE
- PWA install prompts (bottom sheet, delayed, instructions) - FIXED! ✅
- Stripe checkout integration
- Free tier rate limiting (3/day)
- Automatic upgrade prompts
- Zone details modal with upgrade CTAs
- PWA install detection and dismissal preference
- **Sound preferences (siren/calm/silent)** - NEW! ✅
- **PWA install instructions modal** - NEW! ✅
- **Nearest zone highlighting** - FIXED! ✅

### Phase 2: Polish UX (IN PROGRESS)
- ✅ Phase 3: Calm alert sounds + sound settings modal - COMPLETE! ✅
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
- 50m before zone: "INSIDE ZTL" + siren sound (always, regardless of setting) - CRITICAL!
- 200m before zone: "ZTL in 200m - Turn right in 150m to avoid" + selected sound (siren/chime)
- 100m before zone: "ZTL 100m ahead - Prepare to turn" + selected sound (siren/chime/silent)
- Alert count tracks per GPS position update
- Daily limit resets at midnight

### Sound System (NEW!) ✅
- **Siren:** Plays for INSIDE ZTL alerts (critical, ignores user preference) - ALWAYS PLAYS!
- **Chime:** Plays for approach warnings (200m, 100m) when user selects "Chime"
- **Silent:** No alert sounds (when user selects "Silent")
- **Sound selector:** Tap sound icon in header (🚨/🔔/🔕) to open settings modal
- **Sound settings modal:** Three buttons with test sounds
- **Preferences:** Persist in localStorage (`alert-sound-preference`)
- **Visual feedback:** Sound icon changes based on selection

### PWA Install Prompt
- **Detects standalone mode:** `window.matchMedia('(display-mode: standalone)')`
- **Shows bottom sheet** after 5 seconds (non-intrusive)
- **Stores dismissal** in localStorage with 7-day expiry
- **NEW:** If `deferredPrompt` not available, shows instructions modal:
  - **Chrome (Android & Desktop):** Address bar → "Add to Home Screen..." → "Add"
  - **Safari (iPhone & iPad):** Share button → "Add to Home Screen" → "Add"
  - **Firefox (Android):** Menu → "Install App"
- **NEW:** Explains benefits: full-screen mode, offline capability, faster loading
- **NEW:** Provides clear CTAs: "Add to Home Screen", "Maybe later", "Don't show again"
- Uses app icon: `/icons/icon-192.png`

### Nearest Zone Highlighting (FIXED!) ✅
- **RED zone:** Nearest zone (target you're closest to)
- **ORANGE zones:** All other zones
- **Real-time updates:** When GPS position changes, nearest zone recalculates and highlights correctly
- **Distance indicator:** Shows city name, zone name, and distance when < 1000m away
- **Visual feedback:** User always knows which zone they're approaching

### localStorage Keys
- `ztl-alert-count`: Daily alert count
- `ztl-alert-date`: Last reset date
- `pwa-install-dismissed`: User declined PWA install
- `pwa-install-dismissed-date`: When user declined (7-day expiry)
- `alert-sound-preference`: Sound preference (siren/calm/silent) - NEW!
- `user-language`: Language preference (coming in Phase 4)

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
- **Console debug logs** present in code (will be removed in production)

## PWA Install Instructions (NEW!) ✅

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

### Why Install?
- Get full-screen ZTL alerts while driving
- Never miss a ZTL warning
- Works offline (cached zone data)
- Faster loading with service worker caching

## Future Enhancements

- [x] Real-time zone updates (when hours change)
- [ ] Turn-by-turn navigation to avoid zones
- [ ] Traffic-aware routing (live data from city APIs)
- [ ] User-submitted zones (crowdsourced data)
- [ ] Integration with rental car fleets
- [ ] Multi-city expansion (Rome, Venice, Naples)
- [x] Sound preferences (siren/calm/silent) - COMPLETE! ✅
- [x] PWA install instructions modal - COMPLETE! ✅
- [ ] Multi-language support (EN, IT, FR, DE) - Phase 4 (NEXT)
- [ ] Offline mode improvements - Phase 5
- [ ] Alert history log page - Phase 6

## License

MIT License - Feel free to fork and use for your own city's ZTL needs.
