import { getAdAccountId, xApi, xApiFetchAllPages } from "../config.js";
import { uploadMedia } from "../media.js";
import { isPretty, outputOk, outputError } from "../output.js";

export async function listCards(accountId?: string): Promise<void> {
  const id = getAdAccountId(accountId);

  const cards = await xApiFetchAllPages("GET", `accounts/${id}/cards/website`, {
    with_deleted: "false",
  });

  if (cards.length === 0) {
    if (isPretty()) {
      console.log("No website cards found.");
    } else {
      outputOk([]);
    }
    return;
  }

  if (!isPretty()) {
    outputOk(cards);
    return;
  }

  const header = [
    "ID".padEnd(22),
    "Name".padEnd(22),
    "Title".padEnd(22),
    "URL".padEnd(32),
    "Card URI",
  ].join("  ");

  const separator = [
    "─".repeat(22),
    "─".repeat(22),
    "─".repeat(22),
    "─".repeat(32),
    "─".repeat(22),
  ].join("  ");

  console.log(header);
  console.log(separator);

  for (const card of cards) {
    const row = [
      (card.id || "").padEnd(22),
      (card.name || "").slice(0, 22).padEnd(22),
      (card.website_title || "").slice(0, 22).padEnd(22),
      (card.website_url || "").slice(0, 32).padEnd(32),
      card.card_uri || "",
    ].join("  ");
    console.log(row);
  }
}

interface CreateCardOpts {
  name: string;
  title: string;
  url: string;
  image: string;
}

export async function createWebsiteCard(opts: CreateCardOpts, accountId?: string): Promise<void> {
  const id = getAdAccountId(accountId);

  // Step 1: Upload the image
  if (isPretty()) console.log(`Uploading image: ${opts.image}`);
  const mediaKey = await uploadMedia(opts.image);
  if (isPretty()) console.log(`  Media key: ${mediaKey}`);

  // Step 2: Create the website card
  const body: Record<string, string> = {
    name: opts.name,
    website_title: opts.title,
    website_url: opts.url,
    media_key: mediaKey,
  };

  const response = await xApi("POST", `accounts/${id}/cards/website`, undefined, body);
  const card = response.data;

  if (!isPretty()) {
    outputOk(card);
    return;
  }

  console.log(`✅ Created website card: ${card.id}`);
  console.log(`   Card URI: ${card.card_uri}`);
  console.log(`   Attach to a tweet with: x-ads promoted-tweets create-tweet --text "Check it out!" --card ${card.card_uri}`);
}

interface UpdateCardOpts {
  id: string;
  name?: string;
  title?: string;
  url?: string;
}

export async function updateCard(opts: UpdateCardOpts, accountId?: string): Promise<void> {
  const acctId = getAdAccountId(accountId);

  const body: Record<string, string> = {};

  if (opts.name) {
    body.name = opts.name;
  }

  if (opts.title) {
    body.website_title = opts.title;
  }

  if (opts.url) {
    body.website_url = opts.url;
  }

  if (Object.keys(body).length === 0) {
    outputError("No update fields provided. Use --name, --title, or --url.");
  }

  const response = await xApi("PUT", `accounts/${acctId}/cards/website/${opts.id}`, undefined, body);
  const card = response.data;

  if (!isPretty()) {
    outputOk(card);
    return;
  }

  console.log(`✅ Website card updated`);
  console.log(`   ID:    ${card.id}`);
  console.log(`   Name:  ${card.name}`);
  console.log(`   Title: ${card.website_title}`);
  console.log(`   URL:   ${card.website_url}`);
}

export async function removeCard(cardId: string, accountId?: string): Promise<void> {
  const acctId = getAdAccountId(accountId);

  await xApi("DELETE", `accounts/${acctId}/cards/website/${cardId}`);

  if (!isPretty()) {
    outputOk({ id: cardId, deleted: true });
    return;
  }

  console.log(`✅ Website card ${cardId} removed`);
}

export async function uploadMediaCommand(filePath: string): Promise<void> {
  const mediaKey = await uploadMedia(filePath);

  if (!isPretty()) {
    outputOk({ media_key: mediaKey });
    return;
  }

  console.log(`✅ Uploaded media: media_key=${mediaKey}`);
}
