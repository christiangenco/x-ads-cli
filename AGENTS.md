# x-ads

CLI tool for managing X (Twitter) ad campaigns, built with Node/TypeScript.

## Project Conventions

Follow the same patterns established by `~/tools/meta-ads` and `~/tools/google-ads`:

- **Language**: TypeScript, compiled with `tsc` to `dist/`, run during dev with `tsx`
- **CLI framework**: `commander` (same version/patterns as meta-ads)
- **Config**: `dotenv` loading `.env`, validated in `src/config.ts`
- **Entry point**: `bin/x-ads.js` → `import "../dist/cli.js"`
- **ESM**: `"type": "module"` in package.json, `.js` extensions in imports
- **tsconfig**: target ES2022, module Node16, moduleResolution Node16, strict true
- **Output style**: Formatted tables with padEnd alignment (matching meta-ads/google-ads), `✅` for success messages, `console.error` + `process.exit(1)` for errors
- **Budget handling**: X API uses micro-currency (1 USD = 1,000,000 micros). CLI accepts dollars, converts internally.
- **No third-party SDK**: X has no official Node Ads SDK. All API calls are raw `fetch()` with OAuth 1.0a signing.

## X Ads API Reference

- **Base URL**: `https://ads-api.x.com/12/` (API version 12)
- **Auth**: OAuth 1.0a — every request must include an `Authorization: OAuth ...` header signed with HMAC-SHA1
- **Rate limits**: Most endpoints allow 100 requests per 15-minute window. The API returns `x-rate-limit-remaining` and `x-rate-limit-reset` headers.
- **Pagination**: Cursor-based. Responses include `next_cursor` in the `request` object. Pass `?cursor=CURSOR` for the next page.
- **Error format**: `{ "errors": [{ "code": "...", "message": "..." }], "request": { ... } }`
- **Success format**: `{ "data": [...], "total_count": N, "request": { "params": { "cursor": "..." } } }`

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

## .env Variables

```
X_API_KEY=                    # Consumer Key (from X Developer Portal)
X_API_SECRET=                 # Consumer Secret
X_ACCESS_TOKEN=               # User OAuth access token
X_ACCESS_TOKEN_SECRET=        # User OAuth access token secret
X_AD_ACCOUNT_ID=              # Default ad account ID
```

## Key API Endpoints

| Resource | List | Create | Update | Delete |
|----------|------|--------|--------|--------|
| Accounts | `GET /accounts` | — | — | — |
| Funding Instruments | `GET /accounts/:id/funding_instruments` | — | — | — |
| Campaigns | `GET /accounts/:id/campaigns` | `POST /accounts/:id/campaigns` | `PUT /accounts/:id/campaigns/:id` | `DELETE /accounts/:id/campaigns/:id` |
| Line Items | `GET /accounts/:id/line_items` | `POST /accounts/:id/line_items` | `PUT /accounts/:id/line_items/:id` | `DELETE /accounts/:id/line_items/:id` |
| Promoted Tweets | `GET /accounts/:id/promoted_tweets` | `POST /accounts/:id/promoted_tweets` | — | `DELETE /accounts/:id/promoted_tweets/:id` |
| Cards (Website) | `GET /accounts/:id/cards/website` | `POST /accounts/:id/cards/website` | `PUT /accounts/:id/cards/website/:id` | `DELETE /accounts/:id/cards/website/:id` |
| Targeting Criteria | `GET /accounts/:id/targeting_criteria` | `POST /accounts/:id/targeting_criteria` | — | `DELETE /accounts/:id/targeting_criteria/:id` |
| Tailored Audiences | `GET /accounts/:id/tailored_audiences` | `POST /accounts/:id/tailored_audiences` | — | `DELETE /accounts/:id/tailored_audiences/:id` |
| Analytics | `GET /stats/accounts/:id` | — | — | — |
| Targeting Options | `GET /targeting_criteria/:type` | — | — | — |
| Media Upload | `POST https://upload.twitter.com/1.1/media/upload.json` | — | — | — |

## Campaign Objectives

`AWARENESS`, `TWEET_ENGAGEMENTS`, `VIDEO_VIEWS`, `WEBSITE_CLICKS`, `WEBSITE_CONVERSIONS`, `FOLLOWERS`, `APP_INSTALLS`, `APP_ENGAGEMENTS`, `REACH`, `PREROLL_VIEWS`

## Line Item Product Types

`PROMOTED_TWEETS`, `PROMOTED_ACCOUNT`, `PROMOTED_TREND`

## Line Item Placements

`ALL_ON_TWITTER`, `TWITTER_TIMELINE`, `TWITTER_PROFILE`, `TWITTER_SEARCH`, `TAP_BANNER`, `TAP_FULL`, `TAP_NATIVE`, `PUBLISHER_NETWORK`

## Targeting Criteria Types

`LOCATION`, `FOLLOWERS_OF_USER`, `SIMILAR_TO_FOLLOWERS_OF_USER`, `INTEREST`, `PLATFORM`, `PLATFORM_VERSION`, `DEVICE`, `WIFI_ONLY`, `GENDER`, `TV_SHOW`, `TV_MARKET`, `TV_GENRE`, `NETWORK_OPERATOR`, `BROAD_KEYWORD`, `UNORDERED_KEYWORD`, `PHRASE_KEYWORD`, `EXACT_KEYWORD`, `NEGATIVE_PHRASE_KEYWORD`, `NEGATIVE_UNORDERED_KEYWORD`, `NEGATIVE_EXACT_KEYWORD`, `TAILORED_AUDIENCE`, `TAILORED_AUDIENCE_EXPANDED`, `TAILORED_AUDIENCE_LOOKALIKE`, `AGE`, `BEHAVIOR`, `NEGATIVE_BEHAVIOR`, `LANGUAGE`, `NETWORK_ACTIVATION_DURATION`, `CONVERSATION`, `EVENT`

## CLI Usage

```bash
x-ads auth login                   # OAuth 1.0a flow → access tokens
x-ads auth status                  # Verify tokens, list accessible ad accounts

x-ads accounts                     # List accessible ad accounts

x-ads funding                      # List funding instruments (payment methods)

x-ads campaigns list [--account ID]
x-ads campaigns create --name "Sale" --funding FI_ID --budget 50
x-ads campaigns update --id 123 --name "Summer Sale" --status ACTIVE
x-ads campaigns pause --id 123
x-ads campaigns remove --id 123

x-ads line-items list [--campaign 123]
x-ads line-items create --campaign 123 --name "US Traffic" \
  --objective WEBSITE_CLICKS --bid 1.50 --bid-type AUTO
x-ads line-items update --id 456 --total-budget 200
x-ads line-items pause --id 456
x-ads line-items remove --id 456

x-ads promoted-tweets list [--line-item 456]
x-ads promoted-tweets promote --line-item 456 --tweet-ids 789,012
x-ads promoted-tweets create-tweet --text "Check this out" --line-item 456
x-ads promoted-tweets remove --id 101

x-ads cards list
x-ads cards create --name "Card" --title "Visit" --url "https://example.com" --media-key MK123
x-ads cards update --id C123 --title "New Title"
x-ads cards remove --id C123

x-ads targeting locations "New York"
x-ads targeting interests
x-ads targeting conversations "fitness"
x-ads targeting platforms
x-ads targeting show --line-item 456
x-ads targeting add --line-item 456 --type LOCATION --value "abc123"
x-ads targeting remove --id TC123

x-ads audiences list
x-ads audiences create --name "Customers" --list-type EMAIL

x-ads analytics --entity CAMPAIGN --date-range last_7d
x-ads analytics --campaign 123 --granularity DAY
x-ads analytics --line-item 456 --date-range 2026-01-01..2026-01-31

x-ads media upload ./image.jpg     # Upload media, get media_key

# Global flag: --pretty for human-readable output (default is JSON)
# Most commands accept --account ID to override X_AD_ACCOUNT_ID
```

## File Structure

```
x-ads/
├── bin/x-ads.js
├── src/
│   ├── cli.ts
│   ├── config.ts
│   ├── auth.ts
│   └── commands/
│       ├── accounts.ts
│       ├── funding.ts
│       ├── campaigns.ts
│       ├── line-items.ts
│       ├── promoted-tweets.ts
│       ├── cards.ts
│       ├── targeting.ts
│       ├── audiences.ts
│       └── analytics.ts
├── plans/
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
├── AGENTS.md
└── README.md
```
