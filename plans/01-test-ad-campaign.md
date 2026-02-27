# Plan: Create a Test X Ad Campaign

## Prerequisites

### Ads API Access Approval
- **Requested**: February 20, 2026 at 11:09 AM CST
- **Method**: DM to @AdsSupport on X
- **Message**: "Hi, I'd like to request Ads API Standard Access for my developer app. App ID: 32438296, app name: x-ads. I'm building a CLI tool for programmatic management of X ad campaigns. My developer account is @cgenco (user ID: 5437912). Thank you!"
- **Response** (11:09 AM): Ads API access requires a dedicated Sales representative. X Ads Support cannot grant it directly — a Sales rep must apply internally on your behalf.
- **Follow-up sent** (Feb 20, ~12:05 PM CST): "Thanks! I don't currently have a dedicated Sales representative. Could you help connect me with one? We're looking to manage ad campaigns programmatically via the API."
- **Next step**: Wait for @AdsSupport to reply with instructions on connecting with a Sales rep. If no response within a few days, follow up again. If Sales rep path stalls, consider using `agent-chrome` to automate the X Ads UI as a workaround.
- **Expected timeline**: Unknown — depends on Sales rep assignment and internal approval process

### How to Check if Approved
```bash
x-ads auth status
# ✅ If approved: prints "✅ Authenticated" and lists ad accounts
# ❌ If not yet approved: prints "UNAUTHORIZED_CLIENT_APPLICATION" error

# Alternative: check directly
x-ads accounts
```

### X Ads Account Setup
Before creating ads, ensure you have:
1. An X Ads account at [ads.x.com](https://ads.x.com) (should already exist for @cgenco)
2. A funding instrument (credit card) added to the ad account
3. Note the Ad Account ID and add it to `.env` as `X_AD_ACCOUNT_ID`

```bash
# Find your ad account ID:
x-ads accounts
# Copy the ID and add to .env:
# X_AD_ACCOUNT_ID=<your_account_id>

# Verify funding instrument exists:
x-ads funding
```

## Steps: Create a Test Ad

### 1. Create a Campaign
```bash
x-ads campaigns create \
  --name "Test Campaign - x-ads CLI" \
  --funding <FUNDING_INSTRUMENT_ID> \
  --budget 5 \
  --status PAUSED
```
- Budget: $5/day (minimum viable)
- Status: PAUSED so it won't spend money yet
- Note the campaign ID from the output

### 2. Create a Line Item
```bash
x-ads line-items create \
  --campaign <CAMPAIGN_ID> \
  --name "Test Line Item - Website Clicks" \
  --objective WEBSITE_CLICKS \
  --placements ALL_ON_TWITTER \
  --bid 1.50 \
  --status PAUSED
```
- Objective: WEBSITE_CLICKS (simplest to test)
- Bid: $1.50 (reasonable for testing)
- Note the line item ID

### 3. Add Targeting
```bash
# Target US only
x-ads targeting locations "United States"
# Note the location key (e.g., "96683cc9126741d1")

x-ads targeting add \
  --line-item <LINE_ITEM_ID> \
  --type LOCATION \
  --value <US_LOCATION_KEY>

# Target adults 25-54
x-ads targeting add \
  --line-item <LINE_ITEM_ID> \
  --type AGE \
  --value AGE_25_TO_34 AGE_35_TO_49 AGE_50_TO_54

# Verify targeting
x-ads targeting show --line-item <LINE_ITEM_ID>
```

### 4. Create a Tweet and Promote It
```bash
# Option A: Promote an existing tweet
x-ads promoted-tweets promote \
  --line-item <LINE_ITEM_ID> \
  --tweet <EXISTING_TWEET_ID>

# Option B: Create a new tweet and promote it
x-ads promoted-tweets create-tweet \
  --text "Testing the x-ads CLI tool! 🚀"

x-ads promoted-tweets promote \
  --line-item <LINE_ITEM_ID> \
  --tweet <NEW_TWEET_ID>
```

### 5. Verify Everything
```bash
# List all the pieces
x-ads campaigns list
x-ads line-items list --campaign <CAMPAIGN_ID>
x-ads promoted-tweets list --line-item <LINE_ITEM_ID>
x-ads targeting show --line-item <LINE_ITEM_ID>
```

### 6. (Optional) Activate and Monitor
```bash
# Only do this if you actually want to spend money:
x-ads line-items update --id <LINE_ITEM_ID> --status ACTIVE
x-ads campaigns update --id <CAMPAIGN_ID> --status ACTIVE

# Check performance after a few hours:
x-ads analytics --campaign <CAMPAIGN_ID> --date-range today
```

### 7. Clean Up
```bash
# Pause everything
x-ads campaigns pause --id <CAMPAIGN_ID>

# Or remove entirely
x-ads promoted-tweets remove --id <PROMOTED_TWEET_ID>
x-ads line-items remove --id <LINE_ITEM_ID>
x-ads campaigns remove --id <CAMPAIGN_ID>
```

## Verification
The test is successful if all commands above execute without errors and the promoted tweet shows `approval_status: UNDER_REVIEW` or `ACCEPTED`.
