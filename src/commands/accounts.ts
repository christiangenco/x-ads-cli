import { xApiFetchAllPages } from "../config.js";

export async function listAccounts(): Promise<void> {
  const accounts = await xApiFetchAllPages("GET", "accounts", {
    with_deleted: "false",
  });

  if (accounts.length === 0) {
    console.log("No ad accounts found. Set up an ad account at ads.x.com");
    return;
  }

  const header = [
    "ID".padEnd(22),
    "Name".padEnd(22),
    "Status".padEnd(12),
    "Currency".padEnd(10),
    "Timezone",
  ].join("  ");

  const separator = [
    "─".repeat(22),
    "─".repeat(22),
    "─".repeat(12),
    "─".repeat(10),
    "─".repeat(22),
  ].join("  ");

  console.log(header);
  console.log(separator);

  for (const account of accounts) {
    const row = [
      (account.id || "").padEnd(22),
      (account.name || "").padEnd(22),
      (account.approval_status || "").padEnd(12),
      (account.currency || "").padEnd(10),
      account.timezone || "",
    ].join("  ");
    console.log(row);
  }
}
