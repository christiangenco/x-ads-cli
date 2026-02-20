# X Ads CLI (`x-ads`)

A command-line tool for managing X (Twitter) ad campaigns, line items, promoted tweets, and targeting.

## Setup

### Prerequisites

- Node.js 22+
- An X (Twitter) account
- X Ads API access

### 1. Apply for X Developer Access

1. Go to [developer.x.com](https://developer.x.com).
2. Create a project and app.
3. Apply for **Ads API access** — this requires a separate application beyond basic developer access. See: [developer.x.com/en/docs/twitter-ads-api/getting-started](https://developer.x.com/en/docs/twitter-ads-api/getting-started).
4. Copy the **API Key** (Consumer Key) and **API Secret** (Consumer Secret) from the app settings.

### 2. Set Up an X Ads Account

1. Go to [ads.x.com](https://ads.x.com).
2. Create an ad account and add a payment method (funding instrument).
3. Note the **Ad Account ID** (visible in the URL or account settings).

### 3. Configure Callback URL

1. In the X Developer Portal, go to your app → **Authentication Settings**.
2. Add `http://localhost:3456/callback` as a callback URL.
3. Ensure the app has **Read and Write** permissions.

### 4. Configure `.env`

```bash
cp .env.example .env
```

Fill in the values:

```env
X_API_KEY=your-consumer-key
X_API_SECRET=your-consumer-secret
X_ACCESS_TOKEN=               # filled in by step 5
X_ACCESS_TOKEN_SECRET=        # filled in by step 5
X_AD_ACCOUNT_ID=abc123        # your default ad account ID
```

### 5. Authenticate via OAuth

Run the OAuth 1.0a 3-legged flow to obtain access tokens:

```bash
x-ads auth
```

This will:
1. Start a local server on `http://localhost:3456`
2. Open your browser to X's OAuth consent page
3. After you grant access, obtain a permanent access token and secret
4. Automatically save the tokens to your `.env` file

Unlike Meta's 60-day tokens, X OAuth 1.0a tokens are **permanent** — no need to re-auth unless you revoke access.

### 6. Verify Authentication

```bash
x-ads auth status
```

## Usage

All commands default to the ad account set in `X_AD_ACCOUNT_ID`. Use `--account <id>` on any command to override.

### Auth

```bash
# Run OAuth 1.0a 3-legged flow to obtain access tokens
x-ads auth

# Verify tokens work and list accessible ad accounts
x-ads auth status
```

### Accounts

```bash
# List accessible ad accounts
x-ads accounts
```

### Funding

```bash
# List funding instruments (payment methods)
x-ads funding
```

### Campaigns

```bash
# List all campaigns
x-ads campaigns list

# Create a new campaign ($50/day budget, starts paused)
x-ads campaigns create --name "Summer Sale" --funding fi_abc123 --budget 50

# Create with total/lifetime budget
x-ads campaigns create --name "Launch" --funding fi_abc123 --total-budget 500

# Update a campaign
x-ads campaigns update --id abc123 --name "Winter Sale" --status ACTIVE --budget 25

# Pause a campaign
x-ads campaigns pause --id abc123

# Remove (soft-delete) a campaign
x-ads campaigns remove --id abc123
```

### Line Items

```bash
# List all line items
x-ads line-items list

# List line items in a specific campaign
x-ads line-items list --campaign abc123

# Create a line item (objective is set here, not on campaign)
x-ads line-items create --campaign abc123 --name "Broad Audience" \
  --objective WEBSITE_CLICKS --bid 2

# Create with placements and auto-bidding
x-ads line-items create --campaign abc123 --name "Timeline Only" \
  --objective TWEET_ENGAGEMENTS --placements TWITTER_TIMELINE --auto-bid

# Update a line item
x-ads line-items update --id li_abc123 --name "Narrow Audience" --status ACTIVE

# Pause a line item
x-ads line-items pause --id li_abc123

# Remove (soft-delete) a line item
x-ads line-items remove --id li_abc123
```

### Promoted Tweets

```bash
# List promoted tweets
x-ads promoted-tweets list

# List promoted tweets for a specific line item
x-ads promoted-tweets list --line-item li_abc123

# Promote existing tweet(s) to a line item
x-ads promoted-tweets promote --line-item li_abc123 --tweet 1234567890

# Promote multiple tweets
x-ads promoted-tweets promote --line-item li_abc123 --tweet 111,222,333

# Create a new tweet (does NOT promote it)
x-ads promoted-tweets create-tweet --text "Check out our summer sale!"

# Create a tweet with a card attached
x-ads promoted-tweets create-tweet --text "Visit us" --card card_abc123

# Remove (un-promote) a promoted tweet
x-ads promoted-tweets remove --id pt_abc123
```

### Cards

```bash
# List website cards
x-ads cards list

# Create a website card (image is uploaded automatically)
x-ads cards create --name "Sale Banner" --title "50% Off Everything" \
  --url "https://example.com/sale" --image ./banner.jpg

# Update a website card
x-ads cards update --id card_abc123 --title "60% Off Everything"

# Remove a website card
x-ads cards remove --id card_abc123
```

### Media

```bash
# Upload a media file and print the media_key
x-ads media upload ./image.jpg
x-ads media upload ./video.mp4
```

### Targeting

```bash
# Search for location targeting options
x-ads targeting locations "Dallas"

# List interest targeting categories
x-ads targeting interests

# Search for conversation topic targeting options
x-ads targeting conversations "technology"

# List platform targeting options
x-ads targeting platforms

# Show targeting criteria for a line item
x-ads targeting show --line-item li_abc123

# Add targeting criteria to a line item
x-ads targeting add --line-item li_abc123 --type LOCATION --value 00a2a6e6682a5b41
x-ads targeting add --line-item li_abc123 --type GENDER --value 1 2
x-ads targeting add --line-item li_abc123 --type AGE --value AGE_25_TO_49
x-ads targeting add --line-item li_abc123 --type INTEREST --value 12345

# Remove a targeting criterion
x-ads targeting remove --id tc_abc123
```

### Audiences

```bash
# List tailored audiences
x-ads audiences list

# Create a tailored audience container
x-ads audiences create --name "Email List" --list-type EMAIL

# Remove a tailored audience
x-ads audiences remove --id ta_abc123
```

### Analytics

```bash
# Campaign performance (last 7 days, default)
x-ads analytics

# Line item performance
x-ads analytics --entity LINE_ITEM

# Promoted tweet performance
x-ads analytics --entity PROMOTED_TWEET

# Custom date range
x-ads analytics --date-range 2026-01-01..2026-01-31

# Date presets: today, yesterday, last_7d, last_14d, last_30d, this_month, last_month
x-ads analytics --date-range last_30d

# Specific entity IDs
x-ads analytics --ids abc123,def456

# Shortcut for a specific campaign
x-ads analytics --campaign abc123

# Shortcut for a specific line item
x-ads analytics --line-item li_abc123

# Daily granularity
x-ads analytics --granularity DAY
```

## X Ads Hierarchy

```
Ad Account                          ← billing unit (has funding instruments)
  ├── Funding Instrument            ← payment method (credit card, etc.)
  ├── Campaign                      ← objective + total budget + status
  │     └── Line Item               ← targeting + bid + schedule + placements (≈ Meta's Ad Set)
  │           └── Promoted Tweet    ← the actual ad unit (references a tweet)
  ├── Cards                         ← website/app cards (reusable, attached to tweets)
  └── Tailored Audience             ← custom audiences
```

## Comparison with Meta/Google

| Aspect | Meta Ads | Google Ads | X Ads |
|--------|----------|------------|-------|
| Auth | OAuth 2.0 (60-day tokens) | OAuth 2.0 (refresh tokens) | OAuth 1.0a (permanent) |
| Structure | Campaign → Ad Set → Ad | Campaign → Ad Group → Ad | Campaign → Line Item → Promoted Tweet |
| Objective | On Campaign | On Campaign (channel type) | On Line Item |
| Targeting | JSON spec on Ad Set | Keywords on Ad Group | Separate criteria objects on Line Item |
| Creative | Reusable AdCreative object | Ad text in Ad | Tweet (organic or created) + optional Card |
| Budget unit | Cents | Micros | Micros |

## Development

```bash
# Run any command during development (without building)
npx tsx src/cli.ts campaigns list

# Type-check
npx tsc --noEmit

# Build to dist/
npm run build
```

## Gotchas

- **Ads API access requires separate approval** from X — a basic developer account is NOT sufficient. You must apply specifically for Ads API access.
- **OAuth 1.0a tokens are permanent** — no need to refresh (unlike Meta's 60-day tokens). Tokens remain valid unless you revoke access.
- **Campaigns don't have objectives** — objectives are set on line items, not campaigns. This is different from Meta and Google where objectives live on the campaign.
- **Targeting is separate from line items** — targeting criteria are their own objects added to line items (additive criteria model), not a JSON spec on the line item itself.
- **Promoted tweets can be organic tweets** from your timeline — you don't need to create special ad-only tweets.
- **Media must be uploaded separately** before creating cards. Use `x-ads media upload` first, then reference the media key when creating a card.
- **Budget in micros**: The X API uses micro-currency internally. $1 = 1,000,000 micros. This CLI accepts dollars and converts automatically.
- **Stats endpoint requires explicit entity IDs** — you can't query "all campaigns" without listing them first. The analytics command handles this automatically.
- **Rate limits**: Most endpoints allow 100 requests per 15-minute window. The API returns `x-rate-limit-remaining` and `x-rate-limit-reset` headers.
