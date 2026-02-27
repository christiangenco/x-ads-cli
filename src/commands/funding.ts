import { getAdAccountId, xApiFetchAllPages } from "../config.js";
import { isPretty, outputOk, outputError } from "../output.js";

function formatMicros(micros: number | null | undefined): string {
  if (micros == null) return "—";
  const dollars = micros / 1_000_000;
  return "$" + dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function listFunding(accountId?: string): Promise<void> {
  const id = getAdAccountId(accountId);

  const instruments = await xApiFetchAllPages("GET", `accounts/${id}/funding_instruments`, {
    with_deleted: "false",
  });

  if (instruments.length === 0) {
    if (isPretty()) {
      console.log("No funding instruments found. Add a payment method at ads.x.com");
    } else {
      outputOk([]);
    }
    return;
  }

  if (!isPretty()) {
    outputOk(instruments);
    return;
  }

  const header = [
    "ID".padEnd(22),
    "Type".padEnd(14),
    "Currency".padEnd(10),
    "Credit Limit".padEnd(16),
    "Funded".padEnd(16),
    "Remaining",
  ].join("  ");

  const separator = [
    "─".repeat(22),
    "─".repeat(14),
    "─".repeat(10),
    "─".repeat(16),
    "─".repeat(16),
    "─".repeat(16),
  ].join("  ");

  console.log(header);
  console.log(separator);

  for (const fi of instruments) {
    const row = [
      (fi.id || "").padEnd(22),
      (fi.type || "").padEnd(14),
      (fi.currency || "").padEnd(10),
      formatMicros(fi.credit_limit_local_micro).padEnd(16),
      formatMicros(fi.funded_amount_local_micro).padEnd(16),
      formatMicros(fi.credit_remaining_local_micro),
    ].join("  ");
    console.log(row);
  }
}
