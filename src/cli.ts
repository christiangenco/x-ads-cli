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

program.parse();
