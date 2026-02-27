import { getAdAccountId, xApi, xApiFetchAllPages } from "../config.js";
import { isPretty, outputOk, outputError } from "../output.js";

function formatMicros(micros: number | null | undefined): string {
  if (micros == null) return "—";
  const dollars = micros / 1_000_000;
  return "$" + dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dollarsToMicros(dollars: number): string {
  return String(Math.round(dollars * 1_000_000));
}

export async function listCampaigns(accountId?: string): Promise<void> {
  const id = getAdAccountId(accountId);

  const campaigns = await xApiFetchAllPages("GET", `accounts/${id}/campaigns`, {
    with_deleted: "false",
  });

  if (campaigns.length === 0) {
    if (isPretty()) {
      console.log("No campaigns found.");
    } else {
      outputOk([]);
    }
    return;
  }

  if (!isPretty()) {
    outputOk(campaigns);
    return;
  }

  const header = [
    "ID".padEnd(22),
    "Name".padEnd(30),
    "Status".padEnd(10),
    "Daily Budget".padEnd(14),
    "Total Budget".padEnd(14),
    "Servable",
  ].join("  ");

  const separator = [
    "─".repeat(22),
    "─".repeat(30),
    "─".repeat(10),
    "─".repeat(14),
    "─".repeat(14),
    "─".repeat(10),
  ].join("  ");

  console.log(header);
  console.log(separator);

  for (const campaign of campaigns) {
    const row = [
      (campaign.id || "").padEnd(22),
      (campaign.name || "").slice(0, 30).padEnd(30),
      (campaign.entity_status || "").padEnd(10),
      formatMicros(campaign.daily_budget_amount_local_micro).padEnd(14),
      formatMicros(campaign.total_budget_amount_local_micro).padEnd(14),
      String(campaign.servable ?? ""),
    ].join("  ");
    console.log(row);

    if (campaign.reasons_not_servable && campaign.reasons_not_servable.length > 0) {
      console.log(`${"".padEnd(22)}  ⚠ ${campaign.reasons_not_servable.join(", ")}`);
    }
  }
}

interface CreateCampaignOpts {
  name: string;
  funding: string;
  budget?: string;
  totalBudget?: string;
  status?: string;
  startTime?: string;
  endTime?: string;
}

export async function createCampaign(opts: CreateCampaignOpts, accountId?: string): Promise<void> {
  const id = getAdAccountId(accountId);

  const body: Record<string, string> = {
    name: opts.name,
    funding_instrument_id: opts.funding,
    entity_status: opts.status || "PAUSED",
  };

  if (opts.budget) {
    body.daily_budget_amount_local_micro = dollarsToMicros(parseFloat(opts.budget));
  }

  if (opts.totalBudget) {
    body.total_budget_amount_local_micro = dollarsToMicros(parseFloat(opts.totalBudget));
  }

  if (opts.startTime) {
    body.start_time = opts.startTime;
  }

  if (opts.endTime) {
    body.end_time = opts.endTime;
  }

  const response = await xApi("POST", `accounts/${id}/campaigns`, undefined, body);
  const campaign = response.data;

  if (!isPretty()) {
    outputOk(campaign);
    return;
  }

  console.log(`✅ Campaign created`);
  console.log(`   ID:           ${campaign.id}`);
  console.log(`   Name:         ${campaign.name}`);
  console.log(`   Status:       ${campaign.entity_status}`);
  console.log(`   Daily Budget: ${formatMicros(campaign.daily_budget_amount_local_micro)}`);
  console.log(`   Total Budget: ${formatMicros(campaign.total_budget_amount_local_micro)}`);
}

interface UpdateCampaignOpts {
  id: string;
  name?: string;
  status?: string;
  budget?: string;
  totalBudget?: string;
}

export async function updateCampaign(opts: UpdateCampaignOpts, accountId?: string): Promise<void> {
  const acctId = getAdAccountId(accountId);

  const body: Record<string, string> = {};

  if (opts.name) {
    body.name = opts.name;
  }

  if (opts.status) {
    body.entity_status = opts.status;
  }

  if (opts.budget) {
    body.daily_budget_amount_local_micro = dollarsToMicros(parseFloat(opts.budget));
  }

  if (opts.totalBudget) {
    body.total_budget_amount_local_micro = dollarsToMicros(parseFloat(opts.totalBudget));
  }

  if (Object.keys(body).length === 0) {
    outputError("No update fields provided. Use --name, --status, --budget, or --total-budget.");
  }

  const response = await xApi("PUT", `accounts/${acctId}/campaigns/${opts.id}`, undefined, body);
  const campaign = response.data;

  if (!isPretty()) {
    outputOk(campaign);
    return;
  }

  console.log(`✅ Campaign updated`);
  console.log(`   ID:           ${campaign.id}`);
  console.log(`   Name:         ${campaign.name}`);
  console.log(`   Status:       ${campaign.entity_status}`);
  console.log(`   Daily Budget: ${formatMicros(campaign.daily_budget_amount_local_micro)}`);
  console.log(`   Total Budget: ${formatMicros(campaign.total_budget_amount_local_micro)}`);
}

export async function pauseCampaign(campaignId: string, accountId?: string): Promise<void> {
  await updateCampaign({ id: campaignId, status: "PAUSED" }, accountId);
}

export async function removeCampaign(campaignId: string, accountId?: string): Promise<void> {
  const acctId = getAdAccountId(accountId);

  await xApi("DELETE", `accounts/${acctId}/campaigns/${campaignId}`);

  if (!isPretty()) {
    outputOk({ id: campaignId, deleted: true });
    return;
  }

  console.log(`✅ Campaign ${campaignId} removed`);
}
