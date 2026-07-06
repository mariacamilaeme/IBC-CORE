// ─── Shipping Tracking Links ────────────────────────────────
// Returns relevant tracking URLs based on shipping company,
// shipment type, vessel name, and BL number.
// ─────────────────────────────────────────────────────────────

export interface TrackingLink {
  name: string;
  url: string;
  icon: string; // emoji
}

// ── Container shipping lines ──────────────────────────────
// These are ALWAYS container lines (FCL), never bulk/breakbulk.
const CONTAINER_LINE_KEYWORDS = [
  "EVERGREEN",
  "CMA",       // matches CMA CGM
  "MAERSK",
  "PIL",
  "MSC",
  "HAPAG",
  "ONE LINE",
  "OCEAN NETWORK",
];

/**
 * Returns true if the shipping company is a known container line.
 */
export function isContainerLine(shippingCompany?: string | null): boolean {
  if (!shippingCompany) return false;
  const upper = shippingCompany.toUpperCase();
  return CONTAINER_LINE_KEYWORDS.some((kw) => upper.includes(kw));
}

/**
 * For container shipments with a known single carrier, returns the direct
 * tracking URL so the UI can skip the popover and open it directly.
 * Returns null if multiple or no carrier-specific links match.
 */
export function getDirectContainerTrackingUrl(contract: {
  shipping_company?: string | null;
  bl_number?: string | null;
  shipment_type?: string | null;
}): string | null {
  const company = (contract.shipping_company ?? "").toUpperCase();
  if (!isContainerLine(contract.shipping_company)) return null;

  const bl = contract.bl_number ?? "";

  if (company.includes("PIL")) {
    return `https://www.pilship.com/digital-solutions/?tab=customer&id=track-trace&label=containerTandT&module=TrackTraceBL&refNo=${encodeURIComponent(bl)}`;
  }
  if (company.includes("EVERGREEN")) {
    return "https://ct.shipmentlink.com/servlet/TDB1_CargoTracking.do";
  }
  if (company.includes("CMA")) {
    return `https://www.cma-cgm.com/ebusiness/tracking/search?SearchBy=BL&Reference=${encodeURIComponent(bl)}`;
  }
  if (company.includes("MAERSK")) {
    return `https://www.maersk.com/tracking/${encodeURIComponent(bl)}`;
  }
  if (company.includes("MSC")) {
    return `https://www.msc.com/track-a-shipment?agencyPath=col&trackingNumber=${encodeURIComponent(bl)}`;
  }
  if (company.includes("HAPAG")) {
    return `https://www.hapag-lloyd.com/en/online-business/track/track-by-booking-solution.html?blno=${encodeURIComponent(bl)}`;
  }
  if (company.includes("ONE") || company.includes("OCEAN NETWORK")) {
    return `https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking?trkNo=${encodeURIComponent(bl)}`;
  }

  return null;
}

/**
 * For non-container (LCL/breakbulk) shipments, returns the MarineTraffic
 * direct URL so the UI can open it directly without a popover.
 * Returns null if no vessel name is available.
 */
export function getDirectVesselTrackingUrl(vesselName?: string | null): string | null {
  if (!vesselName) return null;
  return `https://www.marinetraffic.com/en/ais/home/shipname:${encodeURIComponent(vesselName)}/centerx:-80/centery:10/zoom:4`;
}

export function getTrackingLinks(contract: {
  shipping_company?: string | null;
  vessel_name?: string | null;
  bl_number?: string | null;
  shipment_type?: string | null;
}): TrackingLink[] {
  const links: TrackingLink[] = [];
  const company = (contract.shipping_company ?? "").toUpperCase();
  const bl = contract.bl_number ?? "";
  const vessel = contract.vessel_name ?? "";
  const type = (contract.shipment_type ?? "").toUpperCase();
  const isFCL = type.includes("FCL") || type.includes("CONTENEDOR") || type.includes("CONTAINER");
  const isLCL = type.includes("LCL") || type.includes("BREAK") || type.includes("SUELT") || type.includes("GRANEL");

  // ── FCL tracking (container) ──────────────────────────────
  if (isFCL || (!isLCL && company)) {
    const fclLinks: TrackingLink[] = [];

    if (company.includes("PIL")) {
      fclLinks.push({
        name: "PIL",
        url: `https://www.pilship.com/digital-solutions/?tab=customer&id=track-trace&label=containerTandT&module=TrackTraceBL&refNo=${encodeURIComponent(bl)}`,
        icon: "\u{1F4E6}",
      });
    }

    if (company.includes("EVERGREEN")) {
      fclLinks.push({
        name: "Evergreen",
        url: "https://ct.shipmentlink.com/servlet/TDB1_CargoTracking.do",
        icon: "\u{1F333}",
      });
    }

    if (company.includes("CMA")) {
      fclLinks.push({
        name: "CMA CGM",
        url: `https://www.cma-cgm.com/ebusiness/tracking/search?SearchBy=BL&Reference=${encodeURIComponent(bl)}`,
        icon: "\u{1F6A2}",
      });
    }

    if (company.includes("MAERSK")) {
      fclLinks.push({
        name: "Maersk",
        url: `https://www.maersk.com/tracking/${encodeURIComponent(bl)}`,
        icon: "\u{2693}",
      });
    }

    if (company.includes("MSC")) {
      fclLinks.push({
        name: "MSC",
        url: `https://www.msc.com/track-a-shipment?agencyPath=col&trackingNumber=${encodeURIComponent(bl)}`,
        icon: "\u{1F30A}",
      });
    }

    if (company.includes("HAPAG")) {
      fclLinks.push({
        name: "Hapag-Lloyd",
        url: `https://www.hapag-lloyd.com/en/online-business/track/track-by-booking-solution.html?blno=${encodeURIComponent(bl)}`,
        icon: "\u{1F4CB}",
      });
    }

    if (company.includes("ONE") || company.includes("OCEAN NETWORK")) {
      fclLinks.push({
        name: "ONE Line",
        url: `https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking?trkNo=${encodeURIComponent(bl)}`,
        icon: "\u{1F7E3}",
      });
    }

    // If we matched at least one known FCL carrier, add those
    if (fclLinks.length > 0) {
      links.push(...fclLinks);
    } else if (isFCL) {
      // Default FCL: show all container tracking links so user can choose
      links.push(
        { name: "PIL", url: `https://www.pilship.com/digital-solutions/?tab=customer&id=track-trace&label=containerTandT&module=TrackTraceBL&refNo=${encodeURIComponent(bl)}`, icon: "\u{1F4E6}" },
        { name: "Evergreen", url: "https://ct.shipmentlink.com/servlet/TDB1_CargoTracking.do", icon: "\u{1F333}" },
        { name: "CMA CGM", url: `https://www.cma-cgm.com/ebusiness/tracking/search?SearchBy=BL&Reference=${encodeURIComponent(bl)}`, icon: "\u{1F6A2}" },
        { name: "Maersk", url: `https://www.maersk.com/tracking/${encodeURIComponent(bl)}`, icon: "\u{2693}" },
        { name: "MSC", url: `https://www.msc.com/track-a-shipment?agencyPath=col&trackingNumber=${encodeURIComponent(bl)}`, icon: "\u{1F30A}" },
        { name: "Hapag-Lloyd", url: `https://www.hapag-lloyd.com/en/online-business/track/track-by-booking-solution.html?blno=${encodeURIComponent(bl)}`, icon: "\u{1F4CB}" },
        { name: "ONE Line", url: `https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking?trkNo=${encodeURIComponent(bl)}`, icon: "\u{1F7E3}" },
      );
    }
  }

  // ── LCL tracking (breakbulk / loose cargo) ────────────────
  if (isLCL && vessel) {
    links.push({
      name: "VesselFinder",
      url: `https://www.vesselfinder.com/es/vessels?name=${encodeURIComponent(vessel)}`,
      icon: "\u{1F50D}",
    });
  }

  // ── Always include MarineTraffic if vessel name exists ────
  if (vessel) {
    links.push({
      name: "MarineTraffic",
      url: `https://www.marinetraffic.com/en/ais/home/shipname:${encodeURIComponent(vessel)}/centerx:-80/centery:10/zoom:4`,
      icon: "\u{1F6F0}\u{FE0F}",
    });
  }

  return links;
}
