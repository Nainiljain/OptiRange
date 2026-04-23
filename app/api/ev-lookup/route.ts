/**
 * /api/ev-lookup — CarAPI.app proxy with auto JWT refresh
 *
 * Query params:
 *   ?action=makes                            → list EV makes
 *   ?action=models&make=Tesla               → list models for a make
 *   ?action=specs&make=Tesla&model=Model+3  → EV specs / trim data
 *
 * JWT is auto-fetched on each cold start using CARAPI_API_TOKEN + CARAPI_API_SECRET.
 * Falls back to NREL AFDC (free, no key needed beyond NREL_API_KEY) if CarAPI fails.
 */

import { NextRequest, NextResponse } from 'next/server';

const CARAPI_BASE  = 'https://carapi.app/api';
const CARAPI_AUTH  = 'https://carapi.app/api/auth/login';
const NREL_BASE    = 'https://developer.nrel.gov/api/vehicles/v1/vehicles.json';

// ── JWT cache (per serverless instance lifetime) ─────────────────────────────
let cachedJWT: string | null = null;
let jwtFetchedAt  = 0;
const JWT_TTL_MS  = 6 * 24 * 60 * 60 * 1000; // 6 days (token lasts 7, refresh early)

let nrelCache: any[] | null = null;
let nrelCacheTime = 0;
const NREL_CACHE_TTL = 1000 * 60 * 60 * 24; // 1 day

async function getCarAPIJWT(): Promise<string | null> {
  const apiToken  = process.env.CARAPI_API_TOKEN;
  const apiSecret = process.env.CARAPI_API_SECRET;
  if (!apiToken || !apiSecret) return null;

  const now = Date.now();
  if (cachedJWT && now - jwtFetchedAt < JWT_TTL_MS) return cachedJWT;

  try {
    const res = await fetch(CARAPI_AUTH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/plain' },
      body: JSON.stringify({ api_token: apiToken, api_secret: apiSecret }),
    });
    if (!res.ok) {
      console.error('[CarAPI JWT] Auth failed:', res.status, await res.text());
      return null;
    }
    const jwt = (await res.text()).trim();
    cachedJWT     = jwt;
    jwtFetchedAt  = now;
    console.log('[CarAPI JWT] Fresh JWT obtained');
    return jwt;
  } catch (err: any) {
    console.error('[CarAPI JWT] Network error:', err.message);
    return null;
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'makes';
  const make   = searchParams.get('make')   || '';
  const model  = searchParams.get('model')  || '';
  const year   = searchParams.get('year')   || '2024';

  const jwt = await getCarAPIJWT();

  // ── CarAPI.app path ────────────────────────────────────────────────────────
  if (jwt) {
    try {
      let url = '';

      if (action === 'makes') {
        url = `${CARAPI_BASE}/makes?year=${year}&ev=true`;
      } else if (action === 'models' && make) {
        url = `${CARAPI_BASE}/models?year=${year}&make=${encodeURIComponent(make)}`;
      } else if (action === 'specs' && make && model) {
        url = `${CARAPI_BASE}/trims?year=${year}&make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&verbose=yes`;
      } else {
        return NextResponse.json({ error: 'Invalid action or missing parameters' }, { status: 400 });
      }

      const res  = await fetch(url, {
        headers: { Authorization: `Bearer ${jwt}`, Accept: 'application/json' },
        next: { revalidate: 86400 },
      });

      if (!res.ok) throw new Error(`CarAPI ${res.status}`);

      const data = await res.json();

      if (action === 'makes') {
        const makes = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
        return NextResponse.json({
          source: 'carapi',
          data: makes.map((m: any) => ({ name: m.name || m })),
        });
      }

      if (action === 'models') {
        const models = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
        return NextResponse.json({
          source: 'carapi',
          data: models.map((m: any) => ({ name: m.name || m })),
        });
      }

      if (action === 'specs') {
        const trims: any[] = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
        const normalised = trims.map((t: any) => {
          const attrs: any[] = t.attributes || [];
          const get = (name: string) => attrs.find((a: any) => a.name === name)?.value ?? null;
          return {
            id:                 t.id,
            year:               t.year,
            make:               t.make_model?.make?.name || make,
            model:              t.make_model?.name || model,
            trim:               t.name || t.description || '',
            batteryCapacityKwh: get('battery_capacity_kwh') ? parseFloat(get('battery_capacity_kwh')) : null,
            rangeKm:            get('range') ? parseFloat(get('range')) : null,
            rangeMiles:         get('range_miles') ? parseFloat(get('range_miles')) : null,
            chargerType:        get('ev_charger_type') || get('charger_type') || null,
            driveType:          get('drive_type') || null,
          };
        }).filter((t: any) => t.batteryCapacityKwh || t.rangeKm || t.rangeMiles);

        return NextResponse.json({ source: 'carapi', data: normalised });
      }
    } catch (err: any) {
      console.error('[ev-lookup] CarAPI error, falling back to NREL:', err.message);
    }
  }

  // ── NREL AFDC fallback ─────────────────────────────────────────────────────
  try {
    const nrelKey = process.env.NREL_API_KEY || 'DEMO_KEY';

    if (action === 'makes') {
      const evMakes = [
        'Tesla','Chevrolet','Nissan','Ford','BMW','Hyundai','Kia',
        'Volkswagen','Audi','Porsche','Rivian','Lucid','Polestar',
        'Volvo','Mercedes-Benz','Toyota','Honda','Jeep','BYD','Mazda',
        'Mini','Subaru','Cadillac','GMC','Ram',
      ];
      return NextResponse.json({ source: 'static', data: evMakes.map(m => ({ name: m })) });
    }

    const now = Date.now();
    let list: any[] = [];

    if (nrelCache && now - nrelCacheTime < NREL_CACHE_TTL) {
      list = nrelCache;
    } else {
      const params = new URLSearchParams({
        api_key: nrelKey,
        fuel_type: 'ELEC'
      });
      // disable next cache to prevent "items over 2MB can not be cached" warning
      const res = await fetch(`${NREL_BASE}?${params}`, { cache: 'no-store' });
      const raw = await res.json();
      list = raw?.result || [];
      nrelCache = list;
      nrelCacheTime = now;
    }

    // copy list before filtering to avoid mutating cache reference
    let filteredList = [...list];

    if (make) {
      filteredList = filteredList.filter((v: any) => {
        const vMake = v.make || v.manufacturer_name;
        return vMake && vMake.toLowerCase() === make.toLowerCase();
      });
    }
    if (model) {
      filteredList = filteredList.filter((v: any) => v.model && v.model.toLowerCase() === model.toLowerCase());
    }

    // Filter out PHEVs (Plug-in Hybrids), keeping only pure EVs
    filteredList = filteredList.filter((v: any) => v.fuel_code !== 'PHEV' && !v.fuel_name?.includes('Plug-in Hybrid'));

    if (action === 'models') {
      const unique = [...new Set(filteredList.map((v: any) => v.model))].filter(Boolean);
      return NextResponse.json({ source: 'nrel', data: unique.map(m => ({ name: m })) });
    }

    if (action === 'specs') {
      const normalised = filteredList.map((v: any) => ({
        id:                 v.id,
        year:               v.model_year || v.year || parseInt(year),
        make:               v.make || v.manufacturer_name || '',
        model:              v.model,
        trim:               v.category?.trim || v.trim || '',
        batteryCapacityKwh: v.battery_capacity_kwh ? parseFloat(v.battery_capacity_kwh) : null,
        rangeKm:            v.electric_range ? Math.round(parseFloat(v.electric_range) * 1.60934) : null,
        rangeMiles:         v.electric_range ? parseFloat(v.electric_range) : null,
        chargerType:        v.ev_connector_type || v.charger_type || null,
        driveType:          v.category?.drive || v.drive_type || null,
      })).filter((v: any) => v.rangeMiles || v.rangeKm || v.batteryCapacityKwh);
      return NextResponse.json({ source: 'nrel', data: normalised });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (err: any) {
    console.error('[ev-lookup] NREL error:', err.message);
    return NextResponse.json({ error: 'EV lookup unavailable', detail: err.message }, { status: 500 });
  }
}
