import Decimal from "decimal.js";
import { D, type MoneyInput } from "@/lib/money";

/**
 * Delivery fee = location (zone -> rate) + weight OR quantity surcharge.
 * Weight and quantity surcharges are only combined when the rate's method
 * is explicitly COMBINED.
 */

export type RateMethod = "WEIGHT" | "QUANTITY" | "COMBINED";

export interface DeliveryRateConfig {
  method: RateMethod;
  baseFee: MoneyInput;
  includedGrams?: number | null;
  stepGrams?: number | null;
  feePerWeightStep?: MoneyInput | null;
  maxWeightGrams?: number | null;
  includedQty?: number | null;
  qtyStep?: number | null;
  feePerQtyStep?: MoneyInput | null;
  freeThreshold?: MoneyInput | null;
}

export interface ShipmentInput {
  weightGrams: number; // product + packaging
  quantity: number; // packs
  subtotal: MoneyInput; // goods subtotal after discounts
}

export interface DeliveryFeeResult {
  fee: Decimal;
  baseFee: Decimal;
  weightCharge: Decimal;
  quantityCharge: Decimal;
  extraWeightSteps: number;
  extraQtySteps: number;
  free: boolean;
}

export class DeliveryError extends Error {}

/** Number of started steps beyond what is included. 0 if within included amount. */
export function extraSteps(amount: number, included: number, step: number): number {
  if (step <= 0) throw new DeliveryError("Step size must be positive");
  const over = amount - included;
  return over > 0 ? Math.ceil(over / step) : 0;
}

export function computeDeliveryFee(
  rate: DeliveryRateConfig,
  shipment: ShipmentInput,
): DeliveryFeeResult {
  const baseFee = D(rate.baseFee);
  let weightCharge = new Decimal(0);
  let quantityCharge = new Decimal(0);
  let extraWeightSteps = 0;
  let extraQtySteps = 0;

  if (rate.maxWeightGrams != null && shipment.weightGrams > rate.maxWeightGrams) {
    throw new DeliveryError(
      `Shipment weight ${shipment.weightGrams}g exceeds the rate maximum ${rate.maxWeightGrams}g`,
    );
  }

  const useWeight = rate.method === "WEIGHT" || rate.method === "COMBINED";
  const useQty = rate.method === "QUANTITY" || rate.method === "COMBINED";

  if (useWeight) {
    if (rate.stepGrams == null || rate.feePerWeightStep == null) {
      throw new DeliveryError("Weight rate needs stepGrams and feePerWeightStep");
    }
    extraWeightSteps = extraSteps(shipment.weightGrams, rate.includedGrams ?? 0, rate.stepGrams);
    weightCharge = D(rate.feePerWeightStep).mul(extraWeightSteps);
  }
  if (useQty) {
    if (rate.qtyStep == null || rate.feePerQtyStep == null) {
      throw new DeliveryError("Quantity rate needs qtyStep and feePerQtyStep");
    }
    extraQtySteps = extraSteps(shipment.quantity, rate.includedQty ?? 0, rate.qtyStep);
    quantityCharge = D(rate.feePerQtyStep).mul(extraQtySteps);
  }

  const free = rate.freeThreshold != null && D(shipment.subtotal).gte(D(rate.freeThreshold));
  const fee = free ? new Decimal(0) : baseFee.plus(weightCharge).plus(quantityCharge);
  return { fee, baseFee, weightCharge, quantityCharge, extraWeightSteps, extraQtySteps, free };
}

/** Total shipped weight: sum(qty * (net + packaging)). */
export function shipmentWeight(
  lines: { quantity: number; weightGrams: number; packagingGrams: number }[],
): number {
  return lines.reduce((g, l) => g + l.quantity * (l.weightGrams + l.packagingGrams), 0);
}
