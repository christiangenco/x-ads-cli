import { getAdAccountId, xApi, xApiFetchAllPages } from "../config.js";
import { isPretty, outputOk, outputError } from "../output.js";

export async function searchLocations(query: string): Promise<void> {
  const response = await xApi("GET", "targeting_criteria/locations", {
    q: query,
    location_type: "CITY,STATE,COUNTRY,POSTAL_CODE",
  });

  const locations = response.data || [];

  if (locations.length === 0) {
    if (isPretty()) {
      console.log("No locations found.");
    } else {
      outputOk([]);
    }
    return;
  }

  if (!isPretty()) {
    outputOk(locations);
    return;
  }

  const header = [
    "Key".padEnd(24),
    "Name".padEnd(30),
    "Type".padEnd(14),
    "Country Code",
  ].join("  ");

  const separator = [
    "─".repeat(24),
    "─".repeat(30),
    "─".repeat(14),
    "─".repeat(12),
  ].join("  ");

  console.log(header);
  console.log(separator);

  for (const loc of locations) {
    const row = [
      (loc.targeting_value || "").padEnd(24),
      (loc.name || "").slice(0, 30).padEnd(30),
      (loc.location_type || "").padEnd(14),
      loc.country_code || "",
    ].join("  ");
    console.log(row);
  }

  console.log();
  console.log("Add to line item: x-ads targeting add --line-item <ID> --type LOCATION --value <KEY>");
}

export async function listInterests(): Promise<void> {
  const response = await xApi("GET", "targeting_criteria/interests");

  const interests = response.data || [];

  if (interests.length === 0) {
    if (isPretty()) {
      console.log("No interests found.");
    } else {
      outputOk([]);
    }
    return;
  }

  if (!isPretty()) {
    outputOk(interests);
    return;
  }

  const header = [
    "ID".padEnd(16),
    "Name".padEnd(36),
    "Parent",
  ].join("  ");

  const separator = [
    "─".repeat(16),
    "─".repeat(36),
    "─".repeat(16),
  ].join("  ");

  console.log(header);
  console.log(separator);

  for (const interest of interests) {
    const row = [
      (interest.targeting_value || "").padEnd(16),
      (interest.name || "").slice(0, 36).padEnd(36),
      interest.partner_source || "",
    ].join("  ");
    console.log(row);
  }

  console.log();
  console.log("Add to line item: x-ads targeting add --line-item <ID> --type INTEREST --value <ID>");
}

export async function searchConversations(query: string): Promise<void> {
  const response = await xApi("GET", "targeting_criteria/conversations", {
    q: query,
  });

  const conversations = response.data || [];

  if (conversations.length === 0) {
    if (isPretty()) {
      console.log("No conversations found.");
    } else {
      outputOk([]);
    }
    return;
  }

  if (!isPretty()) {
    outputOk(conversations);
    return;
  }

  const header = [
    "ID".padEnd(16),
    "Name".padEnd(36),
    "Topic",
  ].join("  ");

  const separator = [
    "─".repeat(16),
    "─".repeat(36),
    "─".repeat(24),
  ].join("  ");

  console.log(header);
  console.log(separator);

  for (const conv of conversations) {
    const row = [
      (conv.targeting_value || "").padEnd(16),
      (conv.name || "").slice(0, 36).padEnd(36),
      conv.topic_type || conv.conversation_type || "",
    ].join("  ");
    console.log(row);
  }

  console.log();
  console.log("Add to line item: x-ads targeting add --line-item <ID> --type CONVERSATION --value <ID>");
}

export async function listPlatforms(): Promise<void> {
  const response = await xApi("GET", "targeting_criteria/platforms");

  const platforms = response.data || [];

  if (platforms.length === 0) {
    if (isPretty()) {
      console.log("No platforms found.");
    } else {
      outputOk([]);
    }
    return;
  }

  if (!isPretty()) {
    outputOk(platforms);
    return;
  }

  const header = [
    "ID".padEnd(10),
    "Name",
  ].join("  ");

  const separator = [
    "─".repeat(10),
    "─".repeat(24),
  ].join("  ");

  console.log(header);
  console.log(separator);

  for (const platform of platforms) {
    const row = [
      (platform.targeting_value || "").padEnd(10),
      platform.name || "",
    ].join("  ");
    console.log(row);
  }
}

export async function showTargeting(lineItemId: string, accountId?: string): Promise<void> {
  const id = getAdAccountId(accountId);

  const criteria = await xApiFetchAllPages("GET", `accounts/${id}/targeting_criteria`, {
    line_item_ids: lineItemId,
    with_deleted: "false",
  });

  if (criteria.length === 0) {
    if (isPretty()) {
      console.log(`No targeting criteria for line item ${lineItemId}.`);
    } else {
      outputOk([]);
    }
    return;
  }

  if (!isPretty()) {
    outputOk(criteria);
    return;
  }

  // Group by targeting_type
  const groups: Record<string, any[]> = {};
  for (const c of criteria) {
    const type = c.targeting_type || "UNKNOWN";
    if (!groups[type]) groups[type] = [];
    groups[type].push(c);
  }

  console.log(`Targeting for line item ${lineItemId}:`);

  for (const [type, items] of Object.entries(groups)) {
    console.log();
    console.log(`${type}:`);
    for (const item of items) {
      const name = item.name ? `${item.name} (${item.targeting_value})` : item.targeting_value;
      console.log(`  - ${name}  [${item.id}]`);
    }
  }
}

export async function addTargeting(
  lineItemId: string,
  type: string,
  values: string[],
  accountId?: string
): Promise<void> {
  const id = getAdAccountId(accountId);

  const added: any[] = [];

  for (const value of values) {
    const body: Record<string, string> = {
      line_item_id: lineItemId,
      targeting_type: type,
      targeting_value: value,
    };

    const response = await xApi("POST", `accounts/${id}/targeting_criteria`, undefined, body);
    const c = response.data;
    added.push(c);

    if (isPretty()) {
      const name = c.name ? `${c.name} (${c.targeting_value})` : c.targeting_value;
      console.log(`✅ Added ${type}: ${name}  [${c.id}]`);
    }
  }

  if (!isPretty()) {
    outputOk(added);
    return;
  }

  // Print updated targeting summary
  console.log();
  await showTargeting(lineItemId, accountId);
}

export async function removeTargeting(targetingCriteriaId: string, accountId?: string): Promise<void> {
  const id = getAdAccountId(accountId);

  await xApi("DELETE", `accounts/${id}/targeting_criteria/${targetingCriteriaId}`);

  if (!isPretty()) {
    outputOk({ id: targetingCriteriaId, deleted: true });
    return;
  }

  console.log(`✅ Targeting criterion ${targetingCriteriaId} removed`);
}
