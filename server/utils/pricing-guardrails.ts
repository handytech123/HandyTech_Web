export const HANDYTECH_PRICING_POLICY = {
  ownerBillRate: 75,
  ownerInternalRate: 45,
  helperBillRate: 45,
  helperInternalRate: 25,
  suppliedMaterialMarkupPercent: 15,
  targetGrossMarginPercent: 35,
  optionalContingencyPercent: 10,
  localMinimum: 75,
  extendedMinimum: 150,
  includedTravelMiles: 10,
  monthlyFuelOverhead: 250,
  plannedBillableHoursPerMonth: 40 * 52 / 12,
  marketWarningTolerancePercent: 20,
  marketReviewMonths: 6,
  serviceOriginZip: "63031",
} as const;

export type PricingGuardrailInput = {
  serviceName: string;
  proposedPrice: number;
  ownerHours: number;
  helperHours: number;
  suppliedMaterialsCost: number;
  distanceMiles: number;
  includeContingency: boolean;
};

export type MarketReference = {
  label: string;
  low: number;
  high: number;
  sourceLabel: string;
  sourceUrl: string;
  reviewedAt: string;
  applicable: boolean;
  limitation?: string;
};

const MARKET_REFERENCES: Array<{ pattern: RegExp; reference: MarketReference }> = [
  { pattern: /drywall|wall patch|ceiling patch/i, reference: { label: "Small drywall patch/repair", low: 115, high: 335, sourceLabel: "Angi St. Louis cost guide", sourceUrl: "https://www.angi.com/articles/what-are-common-handyman-prices/mo/st-louis", reviewedAt: "2026-09-17", applicable: true } },
  { pattern: /faucet|fixture plumbing/i, reference: { label: "Faucet replacement", low: 100, high: 290, sourceLabel: "Angi St. Louis cost guide", sourceUrl: "https://www.angi.com/articles/what-are-common-handyman-prices/mo/st-louis", reviewedAt: "2026-09-17", applicable: true } },
  { pattern: /shelf|shelving/i, reference: { label: "Shelf installation", low: 145, high: 480, sourceLabel: "Angi St. Louis cost guide", sourceUrl: "https://www.angi.com/articles/what-are-common-handyman-prices/mo/st-louis", reviewedAt: "2026-09-17", applicable: true } },
  { pattern: /ceiling fan/i, reference: { label: "Ceiling fan installation", low: 100, high: 400, sourceLabel: "Angi national cost guide", sourceUrl: "https://www.angi.com/articles/what-are-common-handyman-prices.htm", reviewedAt: "2026-09-17", applicable: true } },
  { pattern: /tv|television.*mount|mount.*television/i, reference: { label: "TV mounting", low: 300, high: 400, sourceLabel: "Angi national cost guide", sourceUrl: "https://www.angi.com/articles/what-are-common-handyman-prices.htm", reviewedAt: "2026-09-17", applicable: true } },
  { pattern: /door.*adjust|adjust.*door/i, reference: { label: "Door adjustment", low: 75, high: 220, sourceLabel: "Angi national cost guide", sourceUrl: "https://www.angi.com/articles/what-are-common-handyman-prices.htm", reviewedAt: "2026-09-17", applicable: true } },
  { pattern: /paint|painting/i, reference: { label: "Single-room painting", low: 200, high: 1600, sourceLabel: "Angi national cost guide", sourceUrl: "https://www.angi.com/articles/what-are-common-handyman-prices.htm", reviewedAt: "2026-09-17", applicable: true } },
];

const DEFAULT_MARKET_REFERENCE: MarketReference = {
  label: "General handyman project",
  low: 154,
  high: 629,
  sourceLabel: "Angi St. Louis cost guide",
  sourceUrl: "https://www.angi.com/articles/what-are-common-handyman-prices/mo/st-louis",
  reviewedAt: "2026-09-17",
  applicable: true,
};

const money = (value: number) => Math.round(value * 100) / 100;

export function marketReferenceFor(serviceName: string): MarketReference {
  return MARKET_REFERENCES.find((entry) => entry.pattern.test(serviceName))?.reference || DEFAULT_MARKET_REFERENCE;
}

export function calculatePricingGuardrails(input: PricingGuardrailInput) {
  const ownerHours = Math.max(0, Math.ceil(input.ownerHours));
  const helperHours = Math.max(0, Math.ceil(input.helperHours));
  const suppliedMaterialsCost = Math.max(0, input.suppliedMaterialsCost);
  const proposedPrice = Math.max(0, input.proposedPrice);
  const distanceMiles = Math.max(0, input.distanceMiles);
  const minimumPrice = distanceMiles > HANDYTECH_PRICING_POLICY.includedTravelMiles
    ? HANDYTECH_PRICING_POLICY.extendedMinimum
    : HANDYTECH_PRICING_POLICY.localMinimum;
  const fuelAllocation = ownerHours * (HANDYTECH_PRICING_POLICY.monthlyFuelOverhead / HANDYTECH_PRICING_POLICY.plannedBillableHoursPerMonth);
  const ownerLaborCost = ownerHours * HANDYTECH_PRICING_POLICY.ownerInternalRate;
  const helperLaborCost = helperHours * HANDYTECH_PRICING_POLICY.helperInternalRate;
  const internalLaborCost = ownerLaborCost + helperLaborCost;
  const customerLaborPrice = ownerHours * HANDYTECH_PRICING_POLICY.ownerBillRate + helperHours * HANDYTECH_PRICING_POLICY.helperBillRate;
  const customerMaterialsPrice = suppliedMaterialsCost * (1 + HANDYTECH_PRICING_POLICY.suppliedMaterialMarkupPercent / 100);
  const directCost = internalLaborCost + suppliedMaterialsCost + fuelAllocation;
  const marginFloor = directCost / (1 - HANDYTECH_PRICING_POLICY.targetGrossMarginPercent / 100);
  const workingPrice = Math.max(minimumPrice, customerLaborPrice + customerMaterialsPrice, marginFloor);
  const contingency = input.includeContingency ? workingPrice * HANDYTECH_PRICING_POLICY.optionalContingencyPercent / 100 : 0;
  const recommendedPrice = money(workingPrice + contingency);
  const expectedGrossProfit = money(proposedPrice - directCost);
  const expectedGrossMarginPercent = proposedPrice > 0 ? money(expectedGrossProfit / proposedPrice * 100) : 0;
  const matchedMarket = marketReferenceFor(input.serviceName);
  const isLargeCustomProject = ownerHours + helperHours > 8 || proposedPrice > 2500;
  const market = isLargeCustomProject ? { ...matchedMarket, applicable: false, limitation: "This is a multi-day or large custom scope. Public small-project ranges are not comparable; use documented labor, materials, overhead, and completed-job history." } : matchedMarket;
  const tolerance = HANDYTECH_PRICING_POLICY.marketWarningTolerancePercent / 100;
  const marketWarningLow = market.low * (1 - tolerance);
  const marketWarningHigh = market.high * (1 + tolerance);
  const warnings: string[] = [];
  if (proposedPrice < minimumPrice) warnings.push(`Below the $${minimumPrice.toFixed(0)} minimum for this travel distance.`);
  if (proposedPrice < recommendedPrice) warnings.push(`Below the $${recommendedPrice.toFixed(2)} sustainable-price recommendation.`);
  if (proposedPrice > 0 && expectedGrossMarginPercent < HANDYTECH_PRICING_POLICY.targetGrossMarginPercent) warnings.push(`Expected gross margin is ${expectedGrossMarginPercent.toFixed(1)}%, below the 35% target.`);
  if (market.applicable && proposedPrice < marketWarningLow) warnings.push(`More than 20% below the public ${market.label.toLowerCase()} range.`);
  if (market.applicable && proposedPrice > marketWarningHigh) warnings.push(`More than 20% above the public ${market.label.toLowerCase()} range. Confirm scope differences justify it.`);
  if (input.includeContingency) warnings.push("A 10% uncertainty contingency is included; document the hidden-condition risk in the scope.");

  return {
    policy: HANDYTECH_PRICING_POLICY,
    roundedHours: { owner: ownerHours, helper: helperHours },
    costs: { ownerLabor: money(ownerLaborCost), helperLabor: money(helperLaborCost), internalLabor: money(internalLaborCost), suppliedMaterials: money(suppliedMaterialsCost), fuelAllocation: money(fuelAllocation), directCost: money(directCost) },
    pricing: { customerLabor: money(customerLaborPrice), customerMaterials: money(customerMaterialsPrice), contingency: money(contingency), minimumPrice, recommendedPrice, proposedPrice: money(proposedPrice), expectedGrossProfit, expectedGrossMarginPercent },
    market,
    warnings,
  };
}
