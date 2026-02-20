import { Command } from "commander";

const program = new Command();

program
  .name("x-ads")
  .description("CLI tool for managing X (Twitter) ad campaigns")
  .version("0.1.0");

const auth = program
  .command("auth")
  .description("Authenticate with X (OAuth 1.0a)");

auth
  .command("login", { isDefault: true })
  .description("Run OAuth 1.0a 3-legged flow to obtain access tokens")
  .action(async () => {
    const { runAuth } = await import("./auth.js");
    await runAuth();
  });

auth
  .command("status")
  .description("Verify tokens work and list accessible ad accounts")
  .action(async () => {
    const { authStatus } = await import("./auth.js");
    await authStatus();
  });

program
  .command("accounts")
  .description("List accessible ad accounts")
  .action(async () => {
    const { listAccounts } = await import("./commands/accounts.js");
    await listAccounts();
  });

const funding = program
  .command("funding")
  .description("Manage funding instruments (payment methods)");

funding
  .command("list", { isDefault: true })
  .description("List funding instruments for an ad account")
  .option("--account <id>", "Ad account ID (overrides X_AD_ACCOUNT_ID)")
  .action(async (opts) => {
    const { listFunding } = await import("./commands/funding.js");
    await listFunding(opts.account);
  });

const campaigns = program
  .command("campaigns")
  .description("Manage campaigns");

campaigns
  .command("list", { isDefault: true })
  .description("List campaigns for an ad account")
  .option("--account <id>", "Ad account ID (overrides X_AD_ACCOUNT_ID)")
  .action(async (opts) => {
    const { listCampaigns } = await import("./commands/campaigns.js");
    await listCampaigns(opts.account);
  });

campaigns
  .command("create")
  .description("Create a new campaign")
  .requiredOption("--name <name>", "Campaign name")
  .requiredOption("--funding <id>", "Funding instrument ID")
  .option("--budget <usd>", "Daily budget in USD")
  .option("--total-budget <usd>", "Total/lifetime budget in USD")
  .option("--status <status>", "Entity status: ACTIVE, PAUSED, or DRAFT", "PAUSED")
  .option("--start-time <date>", "Start time (ISO 8601)")
  .option("--end-time <date>", "End time (ISO 8601)")
  .option("--account <id>", "Ad account ID (overrides X_AD_ACCOUNT_ID)")
  .action(async (opts) => {
    const { createCampaign } = await import("./commands/campaigns.js");
    await createCampaign(opts, opts.account);
  });

campaigns
  .command("update")
  .description("Update an existing campaign")
  .requiredOption("--id <id>", "Campaign ID")
  .option("--name <name>", "New campaign name")
  .option("--status <status>", "Entity status: ACTIVE, PAUSED, or DRAFT")
  .option("--budget <usd>", "Daily budget in USD")
  .option("--total-budget <usd>", "Total/lifetime budget in USD")
  .option("--account <id>", "Ad account ID (overrides X_AD_ACCOUNT_ID)")
  .action(async (opts) => {
    const { updateCampaign } = await import("./commands/campaigns.js");
    await updateCampaign(opts, opts.account);
  });

campaigns
  .command("pause")
  .description("Pause a campaign")
  .requiredOption("--id <id>", "Campaign ID")
  .option("--account <id>", "Ad account ID (overrides X_AD_ACCOUNT_ID)")
  .action(async (opts) => {
    const { pauseCampaign } = await import("./commands/campaigns.js");
    await pauseCampaign(opts.id, opts.account);
  });

campaigns
  .command("remove")
  .description("Remove (soft-delete) a campaign")
  .requiredOption("--id <id>", "Campaign ID")
  .option("--account <id>", "Ad account ID (overrides X_AD_ACCOUNT_ID)")
  .action(async (opts) => {
    const { removeCampaign } = await import("./commands/campaigns.js");
    await removeCampaign(opts.id, opts.account);
  });

program.parse();
