// ── Service interval thresholds by EV brand (in km) ──────────────────────────
// Based on manufacturer recommended first service intervals

export interface ServiceThreshold {
  firstService: number;   // km
  label: string;
  bookingUrl: string;
  dealerSearch: string;   // search term for Google Places
}

const THRESHOLDS: Record<string, ServiceThreshold> = {
  tesla: {
    firstService: 19312,   // 12,000 miles
    label: 'Tesla Annual Service',
    bookingUrl: 'https://www.tesla.com/support/service-visit',
    dealerSearch: 'Tesla Service Center',
  },
  rivian: {
    firstService: 16093,
    label: 'Rivian Service',
    bookingUrl: 'https://rivian.com/support/article/how-do-i-schedule-a-service-appointment',
    dealerSearch: 'Rivian Service Center',
  },
  bmw: {
    firstService: 10000,
    label: 'BMW Service',
    bookingUrl: 'https://www.bmw.com/en/topics/offers-and-services/service-and-accessories/service-appointment.html',
    dealerSearch: 'BMW dealership',
  },
  mercedes: {
    firstService: 10000,
    label: 'Mercedes-Benz Service',
    bookingUrl: 'https://www.mbusa.com/en/service/schedule',
    dealerSearch: 'Mercedes-Benz dealership',
  },
  'mercedes-benz': {
    firstService: 10000,
    label: 'Mercedes-Benz Service',
    bookingUrl: 'https://www.mbusa.com/en/service/schedule',
    dealerSearch: 'Mercedes-Benz dealership',
  },
  audi: {
    firstService: 10000,
    label: 'Audi Service',
    bookingUrl: 'https://www.audiusa.com/us/web/en/service.html',
    dealerSearch: 'Audi dealership',
  },
  volkswagen: {
    firstService: 10000,
    label: 'Volkswagen Service',
    bookingUrl: 'https://www.vw.com/en/models/service.html',
    dealerSearch: 'Volkswagen dealership',
  },
  porsche: {
    firstService: 10000,
    label: 'Porsche Service',
    bookingUrl: 'https://www.porsche.com/usa/accessoriesandservice/porscheservice/',
    dealerSearch: 'Porsche dealership',
  },
  ford: {
    firstService: 12000,
    label: 'Ford Service',
    bookingUrl: 'https://owner.ford.com/tools/account/services/maintenance.html',
    dealerSearch: 'Ford dealership',
  },
  chevrolet: {
    firstService: 12000,
    label: 'Chevrolet Service',
    bookingUrl: 'https://www.chevrolet.com/dealer-locator',
    dealerSearch: 'Chevrolet dealership',
  },
  gmc: {
    firstService: 12000,
    label: 'GMC Service',
    bookingUrl: 'https://www.gmc.com/dealer-locator',
    dealerSearch: 'GMC dealership',
  },
  cadillac: {
    firstService: 12000,
    label: 'Cadillac Service',
    bookingUrl: 'https://www.cadillac.com/dealer-locator',
    dealerSearch: 'Cadillac dealership',
  },
  hyundai: {
    firstService: 10000,
    label: 'Hyundai Service',
    bookingUrl: 'https://www.hyundaiusa.com/us/en/dealer-locator',
    dealerSearch: 'Hyundai dealership',
  },
  kia: {
    firstService: 10000,
    label: 'Kia Service',
    bookingUrl: 'https://www.kia.com/us/en/find-a-dealer',
    dealerSearch: 'Kia dealership',
  },
  nissan: {
    firstService: 12000,
    label: 'Nissan Service',
    bookingUrl: 'https://www.nissanusa.com/dealer-locator.html',
    dealerSearch: 'Nissan dealership',
  },
  toyota: {
    firstService: 10000,
    label: 'Toyota Service',
    bookingUrl: 'https://www.toyota.com/configurator/api/lexicon/models/tme_service',
    dealerSearch: 'Toyota dealership',
  },
  honda: {
    firstService: 10000,
    label: 'Honda Service',
    bookingUrl: 'https://owners.honda.com/service/schedule',
    dealerSearch: 'Honda dealership',
  },
  volvo: {
    firstService: 10000,
    label: 'Volvo Service',
    bookingUrl: 'https://www.volvocars.com/en-us/support/dealer-locator',
    dealerSearch: 'Volvo dealership',
  },
  polestar: {
    firstService: 10000,
    label: 'Polestar Service',
    bookingUrl: 'https://www.polestar.com/en/support/service/',
    dealerSearch: 'Polestar Service Center',
  },
  lucid: {
    firstService: 16093,
    label: 'Lucid Service',
    bookingUrl: 'https://lucidmotors.com/service',
    dealerSearch: 'Lucid Motors Service Center',
  },
  byd: {
    firstService: 10000,
    label: 'BYD Service',
    bookingUrl: 'https://www.byd.com/en/contact.html',
    dealerSearch: 'BYD dealership',
  },
};

export function getServiceThreshold(make: string): ServiceThreshold {
  const key = make.toLowerCase().trim();
  return THRESHOLDS[key] ?? {
    firstService: 10000,   // universal 10,000 km default
    label: `${make} Service`,
    bookingUrl: `https://www.google.com/search?q=${encodeURIComponent(make + ' EV service booking')}`,
    dealerSearch: `${make} dealership`,
  };
}
