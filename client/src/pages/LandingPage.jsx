import React, { useState, useEffect, useRef, useMemo } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';
import { X, ChevronRight, Compass, Anchor } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchExpeditionsForGlobe } from '../api/expeditions.js';

// CSS custom properties resolve fine inside the DOM, but the WebGL globe
// reads raw color strings — so pins get resolved hex, everything in the
// 2D chrome keeps the CSS variable so a future palette tweak stays in one place.
const REGION_HEX = {
  Antarctic: '#5b8fd9',
  Arctic: '#6fd4c9',
  Himalaya: '#d99456',
  Southern_Ocean: '#7fbf8f',
};

const DEFAULT_YEAR_RANGE = { min: 2015, max: new Date().getFullYear() };

export default function LandingPage() {
  const [expeditions, setExpeditions] = useState([]);
  const [loadStatus, setLoadStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [selectedPin, setSelectedPin] = useState(null);
  const [yearFilter, setYearFilter] = useState(DEFAULT_YEAR_RANGE.max);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 768);
  const globeRef = useRef();
  const globeBoxRef = useRef();
  const [globeSize, setGlobeSize] = useState({ width: 0, height: 0 });

  // Load real expeditions from the backend on mount.
  useEffect(() => {
    let cancelled = false;
    fetchExpeditionsForGlobe()
      .then((data) => {
        if (cancelled) return;
        setExpeditions(data);
        setLoadStatus('ready');

        const years = data.map((e) => e.year).filter(Boolean);
        if (years.length) {
          setYearFilter(Math.max(...years));
        }
      })
      .catch((err) => {
        console.error('Failed to load expeditions', err);
        if (!cancelled) setLoadStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const yearRange = useMemo(() => {
    const years = expeditions.map((e) => e.year).filter(Boolean);
    if (!years.length) return DEFAULT_YEAR_RANGE;
    return { min: Math.min(...years), max: Math.max(...years) };
  }, [expeditions]);

  const yearTicks = useMemo(() => {
    const { min, max } = yearRange;
    if (min === max) return [min];
    const step = (max - min) / 4;
    return Array.from({ length: 5 }, (_, i) => Math.round(min + step * i));
  }, [yearRange]);

  const filteredExpeditions = useMemo(
    () => expeditions
      // Expeditions without a recorded start date are always shown —
      // there's no year to filter them by, so hiding them would just lose data.
      .filter((exp) => exp.year == null || exp.year <= yearFilter)
      .map((exp) => ({ ...exp, hex: REGION_HEX[exp.region] || '#8fb3b8' })),
    [expeditions, yearFilter]
  );

  // Track viewport for the mobile/desktop layout switch below.
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth > 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // react-globe.gl doesn't auto-fill its parent — it needs explicit
  // width/height. Watch the card's actual size (including when the detail
  // panel opens/closes and resizes it) and feed that in directly.
  useEffect(() => {
    if (!globeBoxRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setGlobeSize({ width, height });
    });
    ro.observe(globeBoxRef.current);
    return () => ro.disconnect();
  }, []);

  const activeRegions = new Set(filteredExpeditions.map(e => e.region));

  return (
    <div className="chart-backdrop absolute inset-0 w-full h-full flex flex-col p-4 md:p-6 gap-4 overflow-hidden">

      {/* Main row: globe porthole + log panel side by side */}
      <div className="flex-1 flex gap-4 min-h-0">

        {/* Globe porthole */}
        <div
          ref={globeBoxRef}
          className="relative flex-1 rounded-[28px] overflow-hidden"
          style={{ background: 'radial-gradient(circle at 50% 45%, #143440, #071620 72%)' }}
        >
          {globeSize.width > 0 && (
            <Globe
              ref={globeRef}
              width={globeSize.width}
              height={globeSize.height}
              globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
              bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
              backgroundColor="rgba(0,0,0,0)"
              showAtmosphere={true}
              atmosphereColor="#5ec8ff"
              atmosphereAltitude={0.22}
              pointsData={filteredExpeditions}
              pointLat="lat"
              pointLng="lng"
              pointColor="hex"
              pointAltitude={0.1}
              pointRadius={0.7}
              pointsMerge={false}
              ringsData={selectedPin ? [selectedPin] : []}
              ringLat="lat"
              ringLng="lng"
              ringColor={() => t => `rgba(232, 198, 136, ${1 - t})`}
              ringMaxRadius={4}
              ringPropagationSpeed={2.4}
              ringRepeatPeriod={900}
              onGlobeReady={() => {
                if (!globeRef.current) return;
                const scene = globeRef.current.scene();
                scene.add(new THREE.AmbientLight(0xffffff, 1.2));
                const sun = new THREE.DirectionalLight(0xffffff, 1.4);
                sun.position.set(1, 1, 1);
                scene.add(sun);

                // Idle drift, like a globe left turning on a chart table —
                // stops feeling inert without demanding attention.
                const controls = globeRef.current.controls();
                controls.autoRotate = true;
                controls.autoRotateSpeed = 0.35;
              }}
              onPointClick={(point) => {
                setSelectedPin(point);
                if (globeRef.current) {
                  globeRef.current.controls().autoRotate = false;
                  globeRef.current.pointOfView({ lat: point.lat, lng: point.lng, altitude: 1.5 }, 1000);
                }
              }}
            />
          )}

          {/* Status overlay — loading / connection error / no located expeditions yet */}
          {(loadStatus !== 'ready' || filteredExpeditions.length === 0) && (
            <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
              <div className="brass-plate rounded-md px-6 py-4 text-center max-w-xs pointer-events-auto">
                <span className="rivet-tl" /><span className="rivet-tr" /><span className="rivet-bl" /><span className="rivet-br" />
                {loadStatus === 'loading' && (
                  <p className="text-sm" style={{ color: 'var(--ice-dim)' }}>Charting expeditions…</p>
                )}
                {loadStatus === 'error' && (
                  <>
                    <p className="text-sm" style={{ color: 'var(--brass-bright)' }}>Can't reach the archive</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--ice-dim)' }}>Check that the API server is running.</p>
                  </>
                )}
                {loadStatus === 'ready' && filteredExpeditions.length === 0 && (
                  <p className="text-sm" style={{ color: 'var(--ice-dim)' }}>No charted expeditions yet.</p>
                )}
              </div>
            </div>
          )}

          {/* Porthole vignette + brass ring, sits above the canvas, lets clicks fall through */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div
              className="absolute inset-0"
              style={{ background: 'radial-gradient(circle at 50% 50%, transparent 42%, rgba(7,22,32,0.55) 62%, rgba(7,22,32,0.92) 78%)' }}
            />
            <div
              className="absolute top-1/2 left-1/2 rounded-full"
              style={{
                width: 'min(78vh, 92%)',
                aspectRatio: '1 / 1',
                maxWidth: '94%',
                transform: 'translate(-50%, -50%)',
                border: '3px solid var(--brass-dim)',
                boxShadow: '0 0 0 1px rgba(232,198,136,0.35), 0 0 32px rgba(0,0,0,0.5), inset 0 0 24px rgba(0,0,0,0.5)',
              }}
            />
            {/* Rivets around the porthole ring */}
            <div className="absolute top-1/2 left-1/2" style={{ width: 'min(78vh, 92%)', maxWidth: '94%', aspectRatio: '1 / 1', transform: 'translate(-50%, -50%)' }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <span
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: 6, height: 6, top: '50%', left: '50%',
                    background: 'radial-gradient(circle at 35% 30%, var(--brass-bright), var(--brass-dim) 70%)',
                    transform: `rotate(${i * 30}deg) translate(0, calc(min(39vh, 46%) * -1)) translate(-50%, -50%)`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Title cartouche, top-left — a chart's corner label, not a hero banner */}
          <div className="absolute top-5 left-5 md:top-7 md:left-7 z-10 pointer-events-none max-w-[280px]">
            <div className="flex items-center gap-2 text-[var(--brass-bright)]">
              <Compass className="w-4 h-4" strokeWidth={1.5} />
              <span className="gauge-text text-[11px] tracking-wide">{filteredExpeditions.length} stations charted</span>
            </div>
            <h1 className="mt-1 text-[28px] md:text-[32px] leading-tight italic" style={{ fontFamily: 'var(--font-display)', color: 'var(--ice)' }}>
              Expedition Atlas
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--ice-dim)' }}>
              India's polar and ocean field stations, charted by hand.
            </p>
          </div>

          {/* Filters plate */}
          <div className="brass-plate rounded-md absolute top-5 right-5 md:top-7 md:right-7 z-10 px-4 py-3 pointer-events-auto">
            <span className="rivet-tl" /><span className="rivet-tr" /><span className="rivet-bl" /><span className="rivet-br" />
            <h3 className="plate-label text-sm text-[var(--brass-bright)]">Chart filters</h3>
            <div className="text-xs mt-0.5" style={{ color: 'var(--ice-dim)' }}>Region and status</div>
          </div>

          {/* Stats plate */}
          <div className="brass-plate rounded-md absolute bottom-5 right-5 z-10 px-4 py-3 pointer-events-none">
            <span className="rivet-tl" /><span className="rivet-tr" /><span className="rivet-bl" /><span className="rivet-br" />
            <div className="flex items-center gap-4">
              <div>
                <div className="gauge-text text-xl" style={{ color: 'var(--brass-bright)' }}>{filteredExpeditions.length}</div>
                <div className="text-[11px]" style={{ color: 'var(--ice-dim)' }}>Expeditions logged</div>
              </div>
              <div className="w-px self-stretch" style={{ background: 'var(--brass-dim)' }} />
              <div>
                <div className="gauge-text text-xl" style={{ color: 'var(--brass-bright)' }}>{activeRegions.size}</div>
                <div className="text-[11px]" style={{ color: 'var(--ice-dim)' }}>Regions active</div>
              </div>
            </div>
          </div>

          {/* Legend plate */}
          <div className="brass-plate rounded-md absolute bottom-5 left-5 z-10 px-4 py-3 pointer-events-none">
            <span className="rivet-tl" /><span className="rivet-tr" /><span className="rivet-bl" /><span className="rivet-br" />
            <h3 className="plate-label text-sm text-[var(--brass-bright)] mb-2">Key</h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs" style={{ color: 'var(--ice-dim)' }}>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--region-arctic)' }}></span>Arctic</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--region-antarctic)' }}></span>Antarctic</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--region-himalaya)' }}></span>Himalaya</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--region-southern-ocean)' }}></span>Southern Ocean</span>
            </div>
          </div>
        </div>

        {/* Right side: expedition log entry */}
        {selectedPin && isDesktop && (
          <div className="w-[420px] shrink-0 rounded-[20px] shadow-2xl flex flex-col overflow-hidden" style={{ background: 'linear-gradient(165deg, var(--hull-light), var(--hull))', border: '1px solid var(--brass-dim)' }}>
            <div className="px-6 pt-6 pb-4 relative flex items-start gap-4" style={{ borderBottom: '1px solid rgba(195,154,94,0.25)' }}>
              {/* Wax-seal style region stamp */}
              <div
                className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: `radial-gradient(circle at 35% 30%, ${selectedPin.hex}, ${selectedPin.hex}99 70%)`, boxShadow: 'inset 0 0 0 2px rgba(7,22,32,0.35), 0 2px 6px rgba(0,0,0,0.4)' }}
              >
                <Anchor className="w-5 h-5" color="#071620" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <h2 className="italic text-xl leading-snug" style={{ fontFamily: 'var(--font-display)', color: 'var(--ice)' }}>{selectedPin.name}</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--ice-dim)' }}>{selectedPin.region.replace('_', ' ')}</p>
              </div>
              <button onClick={() => setSelectedPin(null)} className="absolute right-4 top-4 p-1 rounded hover:bg-white/10 transition-colors" style={{ color: 'var(--ice-dim)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 overflow-y-auto flex-1 custom-scrollbar">

              <div className="flex gap-6 mb-4">
                <div>
                  <div className="text-[11px]" style={{ color: 'var(--ice-dim)' }}>Year</div>
                  <div className="gauge-text text-sm" style={{ color: 'var(--brass-bright)' }}>{selectedPin.year}</div>
                </div>
                <div>
                  <div className="text-[11px]" style={{ color: 'var(--ice-dim)' }}>Principal investigator</div>
                  <div className="text-sm" style={{ color: 'var(--ice)' }}>{selectedPin.pi}</div>
                </div>
              </div>

              <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--ice-dim)' }}>{selectedPin.desc}</p>

              <div className="flex gap-6 px-0.5 mb-4" style={{ borderBottom: '1px solid rgba(195,154,94,0.25)' }}>
                <button className="pb-2 text-sm font-medium" style={{ color: 'var(--brass-bright)', borderBottom: '2px solid var(--brass-bright)' }}>Reports</button>
                <button className="pb-2 text-sm" style={{ color: 'var(--ice-dim)' }}>Photos</button>
                <button className="pb-2 text-sm" style={{ color: 'var(--ice-dim)' }}>Data</button>
              </div>

              <div className="rounded-lg p-8 flex items-center justify-center min-h-[140px] mb-6 text-center" style={{ background: 'rgba(7,22,32,0.35)', border: '1px dashed rgba(195,154,94,0.3)' }}>
                <span className="text-sm" style={{ color: 'var(--ice-dim)' }}>No reports logged yet for this expedition.</span>
              </div>

            </div>

            <div className="px-6 pb-6 pt-2">
              <Link
                to="/"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-lg font-medium transition-colors hover:bg-white/5"
                style={{ border: '1px solid var(--brass-dim)', color: 'var(--brass-bright)' }}
              >
                <span>View full expedition record</span>
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Depth-gauge timeline */}
      <div className="h-14 shrink-0 flex items-center gap-4">
        <span className="gauge-text text-sm" style={{ color: 'var(--brass-bright)' }}>{yearRange.min}</span>
        <div className="relative flex-1 h-6 flex items-center">
          <div className="absolute w-full h-px" style={{ background: 'rgba(195,154,94,0.35)' }} />
          {yearTicks.map(yr => (
            <div key={yr} className="absolute flex flex-col items-center" style={{ left: `${yearRange.max === yearRange.min ? 0 : ((yr - yearRange.min) / (yearRange.max - yearRange.min)) * 100}%`, transform: 'translateX(-50%)' }}>
              <div className="w-px h-2" style={{ background: 'rgba(195,154,94,0.5)' }} />
            </div>
          ))}
          <input
            type="range"
            min={yearRange.min} max={yearRange.max}
            value={yearFilter}
            onChange={(e) => setYearFilter(parseInt(e.target.value))}
            className="absolute w-full opacity-0 cursor-pointer h-full z-10"
          />
          <div
            className="absolute rounded-full flex items-center justify-center"
            style={{
              left: `calc(${yearRange.max === yearRange.min ? 0 : ((yearFilter - yearRange.min) / (yearRange.max - yearRange.min)) * 100}% - 9px)`,
              width: 18, height: 18,
              background: 'radial-gradient(circle at 35% 30%, var(--brass-bright), var(--brass-dim) 70%)',
              boxShadow: '0 0 0 3px rgba(7,22,32,0.6)',
            }}
          >
            <Anchor className="w-2.5 h-2.5" color="#071620" strokeWidth={2.5} />
          </div>
        </div>
        <span className="gauge-text text-sm" style={{ color: 'var(--brass-bright)' }}>{yearRange.max}</span>
        <div className="hidden sm:block ml-4 text-sm" style={{ color: 'var(--ice-dim)' }}>Drag to explore expeditions by year</div>
      </div>
    </div>
  );
}
