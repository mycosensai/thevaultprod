/** Public carrier quote pages. Retired calculators (postcalc, FedEx rates, DHL quote) 404. */
export const CARRIER_QUOTE_PAGES = [
  { id: "usps", name: "USPS", url: "https://www.usps.com/ship/mail-shipping-services.htm" },
  { id: "ups", name: "UPS", url: "https://wwwapps.ups.com/calTimeCost?loc=en_US" },
  { id: "fedex", name: "FedEx", url: "https://www.fedex.com/en-us/online/rating.html" },
  { id: "dhl", name: "DHL", url: "https://www.dhl.com/us-en/home/get-a-quote.html" },
] as const;

const byId = Object.fromEntries(CARRIER_QUOTE_PAGES.map((carrier) => [carrier.id, carrier.url]));

export function carrierQuoteUrl(carrier: string): string {
  return byId[carrier] ?? byId.usps;
}
