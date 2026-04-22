/**
 * lib/serviceReminder.ts
 * Service reminder system — checks mileage thresholds, sends emails via Resend,
 * and looks up nearby dealerships via Google Places API.
 */

// ── Brand-specific service thresholds (km) ──────────────────────────────────
// These are real first-service intervals for each major EV brand
const BRAND_THRESHOLDS: Record<string, number[]> = {
  tesla:           [20000, 40000, 60000],
  nissan:          [15000, 30000, 45000],
  chevrolet:       [12000, 24000, 36000],
  chevy:           [12000, 24000, 36000],
  ford:            [16000, 32000, 48000],
  bmw:             [15000, 30000, 45000],
  hyundai:         [15000, 30000, 45000],
  kia:             [15000, 30000, 45000],
  volkswagen:      [20000, 40000, 60000],
  vw:              [20000, 40000, 60000],
  audi:            [15000, 30000, 45000],
  porsche:         [20000, 40000, 60000],
  rivian:          [16000, 32000, 48000],
  lucid:           [20000, 40000, 60000],
  polestar:        [20000, 40000, 60000],
  volvo:           [15000, 30000, 45000],
  'mercedes-benz': [15000, 30000, 45000],
  mercedes:        [15000, 30000, 45000],
  toyota:          [15000, 30000, 45000],
  honda:           [12000, 24000, 36000],
  default:         [10000, 20000, 30000],
};

// ── Brand booking URLs ────────────────────────────────────────────────────────
const BRAND_BOOKING_URLS: Record<string, string> = {
  tesla:           'https://www.tesla.com/support/service',
  nissan:          'https://www.nissan.ca/en/services/schedule-service.html',
  chevrolet:       'https://www.chevrolet.com/dealer-locator',
  chevy:           'https://www.chevrolet.com/dealer-locator',
  ford:            'https://owner.ford.com/service/schedule-a-service.html',
  bmw:             'https://www.bmw.ca/en/topics/fascination-bmw/service/schedule-service.html',
  hyundai:         'https://www.hyundaicanada.com/en/owners/book-a-service',
  kia:             'https://www.kia.com/ca/en/service-and-maintenance/schedule-service.html',
  volkswagen:      'https://www.vw.ca/en/models/id4/service.html',
  vw:              'https://www.vw.ca/en/models/id4/service.html',
  audi:            'https://www.audi.ca/en/service.html',
  porsche:         'https://www.porsche.com/canada/en/service/',
  rivian:          'https://rivian.com/support/service',
  lucid:           'https://lucidmotors.com/service',
  polestar:        'https://www.polestar.com/ca-en/service/',
  volvo:           'https://www.volvocars.com/ca-en/support/article/booking-service',
  'mercedes-benz': 'https://www.mercedes-benz.ca/en/service.html',
  mercedes:        'https://www.mercedes-benz.ca/en/service.html',
  toyota:          'https://www.toyota.ca/en/service',
  honda:           'https://www.honda.ca/service',
  default:         'https://www.google.com/search?q=ev+dealership+service+near+me',
};

export function getServiceThresholds(make: string): number[] {
  const key = make.toLowerCase().trim();
  return BRAND_THRESHOLDS[key] || BRAND_THRESHOLDS.default;
}

export function getBookingUrl(make: string): string {
  const key = make.toLowerCase().trim();
  return BRAND_BOOKING_URLS[key] || BRAND_BOOKING_URLS.default;
}

export function getNextServiceMilestone(make: string, totalKm: number): number | null {
  const thresholds = getServiceThresholds(make);
  return thresholds.find(t => t > totalKm) ?? null;
}

export function isDueForService(make: string, totalKm: number): { due: boolean; milestone: number | null } {
  const thresholds = getServiceThresholds(make);
  // Due if total mileage has crossed any threshold
  const crossed = thresholds.filter(t => totalKm >= t);
  if (crossed.length === 0) return { due: false, milestone: null };
  return { due: true, milestone: crossed[crossed.length - 1] };
}

// ── Nearby dealerships via Google Places API ─────────────────────────────────

export interface Dealership {
  name: string;
  address: string;
  phone: string;
  rating: number;
  mapsUrl: string;
  placeId: string;
}

export async function getNearbyDealerships(
  lat: number,
  lon: number,
  make: string,
  apiKey: string
): Promise<Dealership[]> {
  if (!apiKey || apiKey.startsWith('YOUR_')) return [];
  try {
    const query = encodeURIComponent(`${make} EV dealership service`);
    const url =
      `https://maps.googleapis.com/maps/api/place/textsearch/json` +
      `?query=${query}&location=${lat},${lon}&radius=50000&key=${apiKey}`;

    const res  = await fetch(url);
    const data = await res.json();

    if (data.status !== 'OK' || !data.results) return [];

    return data.results.slice(0, 3).map((p: any) => ({
      name:     p.name,
      address:  p.formatted_address || p.vicinity || '',
      phone:    '',
      rating:   p.rating || 0,
      mapsUrl:  `https://www.google.com/maps/place/?q=place_id:${p.place_id}`,
      placeId:  p.place_id,
    }));
  } catch {
    return [];
  }
}

// ── Service email HTML template ───────────────────────────────────────────────

export function buildServiceEmailHtml(opts: {
  firstName: string;
  make: string;
  model: string;
  totalKm: number;
  milestone: number;
  dealerships: Dealership[];
  bookingUrl: string;
}): string {
  const { firstName, make, model, totalKm, milestone, dealerships, bookingUrl } = opts;

  const dealershipRows = dealerships.length > 0
    ? dealerships.map(d => `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #1e293b;">
            <strong style="color:#f1f5f9;">${d.name}</strong><br/>
            <span style="color:#94a3b8;font-size:13px;">${d.address}</span>
            ${d.rating ? `<br/><span style="color:#fbbf24;font-size:12px;">★ ${d.rating}</span>` : ''}
          </td>
          <td style="padding:12px 16px;border-bottom:1px solid #1e293b;text-align:right;vertical-align:middle;">
            <a href="${d.mapsUrl}" style="background:#3b82f6;color:#fff;padding:8px 16px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;">
              View on Maps
            </a>
          </td>
        </tr>`).join('')
    : `<tr><td colspan="2" style="padding:16px;color:#94a3b8;text-align:center;">
        Search for nearby dealerships on <a href="https://www.google.com/maps/search/${encodeURIComponent(make + ' service center')}" style="color:#3b82f6;">Google Maps</a>
       </td></tr>`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-flex;align-items:center;gap:8px;background:#1e293b;padding:12px 24px;border-radius:16px;border:1px solid #334155;">
        <span style="color:#3b82f6;font-size:20px;">⚡</span>
        <span style="color:#f1f5f9;font-size:20px;font-weight:800;letter-spacing:-0.5px;">OptiRange</span>
      </div>
    </div>

    <!-- Alert Banner -->
    <div style="background:linear-gradient(135deg,#f59e0b22,#ef444422);border:1px solid #f59e0b44;border-radius:16px;padding:24px;margin-bottom:24px;text-align:center;">
      <div style="font-size:40px;margin-bottom:12px;">🔧</div>
      <h1 style="color:#fbbf24;margin:0 0 8px;font-size:24px;font-weight:800;">Service Due</h1>
      <p style="color:#fde68a;margin:0;font-size:15px;">Your ${make} ${model} has reached a service milestone</p>
    </div>

    <!-- Body -->
    <div style="background:#1e293b;border-radius:16px;padding:32px;margin-bottom:24px;border:1px solid #334155;">
      <p style="color:#e2e8f0;margin:0 0 24px;font-size:16px;">Hi ${firstName},</p>
      <p style="color:#cbd5e1;margin:0 0 20px;font-size:15px;line-height:1.6;">
        Your <strong style="color:#f1f5f9;">${make} ${model}</strong> has reached 
        <strong style="color:#fbbf24;">${totalKm.toLocaleString()} km</strong> — 
        crossing the recommended service milestone of <strong style="color:#10b981;">${milestone.toLocaleString()} km</strong>.
      </p>
      <p style="color:#cbd5e1;margin:0 0 24px;font-size:15px;line-height:1.6;">
        To keep your EV performing at its best, we recommend scheduling a service appointment soon.
      </p>

      <!-- Stats -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:28px;">
        <div style="background:#0f172a;border-radius:12px;padding:16px;border:1px solid #334155;text-align:center;">
          <p style="color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;margin:0 0 6px;">Total Distance</p>
          <p style="color:#f1f5f9;font-size:22px;font-weight:800;margin:0;">${totalKm.toLocaleString()} km</p>
        </div>
        <div style="background:#0f172a;border-radius:12px;padding:16px;border:1px solid #334155;text-align:center;">
          <p style="color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;margin:0 0 6px;">Service At</p>
          <p style="color:#10b981;font-size:22px;font-weight:800;margin:0;">${milestone.toLocaleString()} km</p>
        </div>
      </div>

      <!-- Book CTA -->
      <div style="text-align:center;margin-bottom:28px;">
        <a href="${bookingUrl}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;padding:16px 40px;border-radius:14px;text-decoration:none;font-size:16px;font-weight:700;letter-spacing:-0.3px;">
          🗓️ Book Service Appointment
        </a>
        <p style="color:#64748b;font-size:12px;margin:12px 0 0;">Opens official ${make} service booking page</p>
      </div>
    </div>

    ${dealerships.length > 0 ? `
    <!-- Nearby Dealerships -->
    <div style="background:#1e293b;border-radius:16px;padding:24px;margin-bottom:24px;border:1px solid #334155;">
      <h2 style="color:#f1f5f9;margin:0 0 16px;font-size:18px;font-weight:700;">📍 Nearby ${make} Service Centres</h2>
      <table style="width:100%;border-collapse:collapse;">
        ${dealershipRows}
      </table>
    </div>` : ''}

    <!-- Footer -->
    <div style="text-align:center;color:#475569;font-size:13px;">
      <p style="margin:0 0 8px;">This reminder was sent by <strong style="color:#64748b;">OptiRange AI</strong></p>
      <p style="margin:0;">You're receiving this because your EV reached a service milestone.</p>
    </div>

  </div>
</body>
</html>`;
}
