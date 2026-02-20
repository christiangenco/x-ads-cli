import { getAdAccountId, xApi, xApiFetchAllPages } from "../config.js";

type EntityType = "CAMPAIGN" | "LINE_ITEM" | "PROMOTED_TWEET";
type Granularity = "TOTAL" | "DAY" | "HOUR";

interface DateRange {
  startTime: string;
  endTime: string;
}

interface AnalyticsOpts {
  entity?: string;
  ids?: string;
  dateRange?: string;
  granularity?: string;
  account?: string;
  campaign?: string;
  lineItem?: string;
}

function parseDateRange(input: string): DateRange {
  const now = new Date();

  // Custom range: YYYY-MM-DD..YYYY-MM-DD
  if (input.includes("..")) {
    const [startStr, endStr] = input.split("..");
    if (!startStr || !endStr) {
      console.error(`Invalid date range format: "${input}". Use YYYY-MM-DD..YYYY-MM-DD`);
      process.exit(1);
    }
    return {
      startTime: new Date(startStr + "T00:00:00Z").toISOString().replace(".000Z", "Z"),
      endTime: new Date(endStr + "T23:59:59Z").toISOString().replace(".000Z", "Z"),
    };
  }

  // Presets
  const startOfDay = (d: Date): Date => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const endOfDay = (d: Date): Date => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59));

  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  switch (input) {
    case "today":
      return {
        startTime: todayStart.toISOString().replace(".000Z", "Z"),
        endTime: todayEnd.toISOString().replace(".000Z", "Z"),
      };
    case "yesterday": {
      const yesterday = new Date(todayStart);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      return {
        startTime: startOfDay(yesterday).toISOString().replace(".000Z", "Z"),
        endTime: endOfDay(yesterday).toISOString().replace(".000Z", "Z"),
      };
    }
    case "last_7d": {
      const start = new Date(todayStart);
      start.setUTCDate(start.getUTCDate() - 7);
      return {
        startTime: startOfDay(start).toISOString().replace(".000Z", "Z"),
        endTime: todayEnd.toISOString().replace(".000Z", "Z"),
      };
    }
    case "last_14d": {
      const start = new Date(todayStart);
      start.setUTCDate(start.getUTCDate() - 14);
      return {
        startTime: startOfDay(start).toISOString().replace(".000Z", "Z"),
        endTime: todayEnd.toISOString().replace(".000Z", "Z"),
      };
    }
    case "last_30d": {
      const start = new Date(todayStart);
      start.setUTCDate(start.getUTCDate() - 30);
      return {
        startTime: startOfDay(start).toISOString().replace(".000Z", "Z"),
        endTime: todayEnd.toISOString().replace(".000Z", "Z"),
      };
    }
    case "this_month": {
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      return {
        startTime: monthStart.toISOString().replace(".000Z", "Z"),
        endTime: todayEnd.toISOString().replace(".000Z", "Z"),
      };
    }
    case "last_month": {
      const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      const lastMonthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59));
      return {
        startTime: lastMonthStart.toISOString().replace(".000Z", "Z"),
        endTime: lastMonthEnd.toISOString().replace(".000Z", "Z"),
      };
    }
    default:
      console.error(`Unknown date range preset: "${input}". Use: today, yesterday, last_7d, last_14d, last_30d, this_month, last_month, or YYYY-MM-DD..YYYY-MM-DD`);
      process.exit(1);
  }
}

function formatNumber(n: number | null | undefined): string {
  if (n == null) return "0";
  return n.toLocaleString("en-US");
}

function formatMicros(micros: number | null | undefined): string {
  if (micros == null) return "$0.00";
  const dollars = micros / 1_000_000;
  return "$" + dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPercent(n: number | null | undefined): string {
  if (n == null || isNaN(n) || !isFinite(n)) return "0.00%";
  return n.toFixed(2) + "%";
}

function formatDollars(n: number | null | undefined): string {
  if (n == null || isNaN(n) || !isFinite(n)) return "$0.00";
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function extractMetric(metrics: Record<string, any> | null | undefined, key: string): number {
  if (!metrics) return 0;
  const val = metrics[key];
  if (val == null) return 0;
  if (Array.isArray(val)) {
    const v = val[0];
    return v == null ? 0 : Number(v);
  }
  return Number(val) || 0;
}

function batch<T>(arr: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    batches.push(arr.slice(i, i + size));
  }
  return batches;
}

async function fetchEntityList(
  entity: EntityType,
  accountId: string
): Promise<{ id: string; name: string }[]> {
  let path: string;
  switch (entity) {
    case "CAMPAIGN":
      path = `accounts/${accountId}/campaigns`;
      break;
    case "LINE_ITEM":
      path = `accounts/${accountId}/line_items`;
      break;
    case "PROMOTED_TWEET":
      path = `accounts/${accountId}/promoted_tweets`;
      break;
  }

  const data = await xApiFetchAllPages("GET", path, { with_deleted: "false" });

  return data.map((item: any) => ({
    id: item.id,
    name: item.name || item.tweet_id || item.id,
  }));
}

interface StatsRow {
  id: string;
  name: string;
  impressions: number;
  clicks: number;
  urlClicks: number;
  spend: number;
  engagements: number;
  follows: number;
  date?: string;
}

export async function getAnalytics(opts: AnalyticsOpts): Promise<void> {
  // Resolve entity type and IDs from shortcut options
  let entity: EntityType = "CAMPAIGN";
  let entityIds: string[] | undefined;

  if (opts.campaign) {
    entity = "CAMPAIGN";
    entityIds = [opts.campaign];
  } else if (opts.lineItem) {
    entity = "LINE_ITEM";
    entityIds = [opts.lineItem];
  } else if (opts.entity) {
    entity = opts.entity.toUpperCase() as EntityType;
  }

  if (opts.ids) {
    entityIds = opts.ids.split(",").map((s) => s.trim()).filter(Boolean);
  }

  const granularity: Granularity = (opts.granularity?.toUpperCase() || "TOTAL") as Granularity;
  const dateRangeInput = opts.dateRange || "last_7d";
  const accountId = getAdAccountId(opts.account);
  const { startTime, endTime } = parseDateRange(dateRangeInput);

  // Fetch entity list for names (and IDs if not provided)
  const entityList = await fetchEntityList(entity, accountId);
  const nameMap = new Map<string, string>();
  for (const item of entityList) {
    nameMap.set(item.id, item.name);
  }

  if (!entityIds) {
    entityIds = entityList.map((item) => item.id);
  }

  if (entityIds.length === 0) {
    console.log(`No ${entity.toLowerCase().replace("_", " ")}s found.`);
    return;
  }

  // Fetch stats in batches of 20
  const allStats: any[] = [];
  const idBatches = batch(entityIds, 20);

  for (const idBatch of idBatches) {
    const response = await xApi("GET", `stats/accounts/${accountId}`, {
      entity: entity,
      entity_ids: idBatch.join(","),
      start_time: startTime,
      end_time: endTime,
      granularity: granularity,
      metric_groups: "ENGAGEMENT,BILLING",
    });

    if (response.data) {
      allStats.push(...response.data);
    }
  }

  // Build rows
  const rows: StatsRow[] = [];

  if (granularity === "TOTAL") {
    for (const stat of allStats) {
      const metrics = stat.id_data?.[0]?.metrics;
      rows.push({
        id: stat.id,
        name: nameMap.get(stat.id) || stat.id,
        impressions: extractMetric(metrics, "impressions"),
        clicks: extractMetric(metrics, "clicks"),
        urlClicks: extractMetric(metrics, "url_clicks"),
        spend: extractMetric(metrics, "billed_charge_local_micro"),
        engagements: extractMetric(metrics, "engagements"),
        follows: extractMetric(metrics, "follows"),
      });
    }
  } else {
    // DAY or HOUR granularity: one row per period per entity
    for (const stat of allStats) {
      const idData = stat.id_data || [];
      for (const segment of idData) {
        const metrics = segment.metrics;
        // For DAY/HOUR granularity, metrics are arrays with one element per period
        // We need to figure out the number of periods from any metric array
        const sampleMetric = metrics
          ? Object.values(metrics).find((v: any) => Array.isArray(v) && v.length > 0)
          : null;
        const periodCount = Array.isArray(sampleMetric) ? (sampleMetric as any[]).length : 1;

        // Calculate date labels
        const start = new Date(startTime);
        for (let i = 0; i < periodCount; i++) {
          const periodDate = new Date(start);
          if (granularity === "DAY") {
            periodDate.setUTCDate(periodDate.getUTCDate() + i);
          } else {
            periodDate.setUTCHours(periodDate.getUTCHours() + i);
          }

          const dateLabel =
            granularity === "DAY"
              ? periodDate.toISOString().slice(0, 10)
              : periodDate.toISOString().slice(0, 16).replace("T", " ");

          const getVal = (key: string): number => {
            if (!metrics || !metrics[key]) return 0;
            const arr = metrics[key];
            if (!Array.isArray(arr)) return 0;
            const v = arr[i];
            return v == null ? 0 : Number(v);
          };

          rows.push({
            id: stat.id,
            name: nameMap.get(stat.id) || stat.id,
            impressions: getVal("impressions"),
            clicks: getVal("clicks"),
            urlClicks: getVal("url_clicks"),
            spend: getVal("billed_charge_local_micro"),
            engagements: getVal("engagements"),
            follows: getVal("follows"),
            date: dateLabel,
          });
        }
      }
    }
  }

  if (rows.length === 0) {
    console.log("No data found for the selected date range.");
    return;
  }

  // Print table
  const entityLabel = entity === "CAMPAIGN" ? "Campaign" : entity === "LINE_ITEM" ? "Line Item" : "Promoted Tweet";
  const showDate = granularity !== "TOTAL";

  const cols = [
    ...(showDate ? [{ label: "Date", width: 16 }] : []),
    { label: entityLabel, width: 30 },
    { label: "Impressions", width: 13 },
    { label: "Clicks", width: 10 },
    { label: "URL Clicks", width: 12 },
    { label: "CTR", width: 8 },
    { label: "CPC", width: 10 },
    { label: "Spend", width: 12 },
    { label: "Engagements", width: 13 },
    { label: "Follows", width: 9 },
  ];

  const header = cols.map((c) => c.label.padEnd(c.width)).join("  ");
  const separator = cols.map((c) => "─".repeat(c.width)).join("  ");

  console.log(header);
  console.log(separator);

  let totalImpressions = 0;
  let totalClicks = 0;
  let totalUrlClicks = 0;
  let totalSpend = 0;
  let totalEngagements = 0;
  let totalFollows = 0;

  for (const row of rows) {
    const ctr = row.impressions > 0 ? (row.clicks / row.impressions) * 100 : 0;
    const spendDollars = row.spend / 1_000_000;
    const cpc = row.clicks > 0 ? spendDollars / row.clicks : 0;

    const values = [
      ...(showDate ? [( row.date || "").padEnd(16)] : []),
      row.name.slice(0, 30).padEnd(30),
      formatNumber(row.impressions).padStart(cols.find((c) => c.label === "Impressions")!.width),
      formatNumber(row.clicks).padStart(cols.find((c) => c.label === "Clicks")!.width),
      formatNumber(row.urlClicks).padStart(cols.find((c) => c.label === "URL Clicks")!.width),
      formatPercent(ctr).padStart(cols.find((c) => c.label === "CTR")!.width),
      formatDollars(cpc).padStart(cols.find((c) => c.label === "CPC")!.width),
      formatMicros(row.spend).padStart(cols.find((c) => c.label === "Spend")!.width),
      formatNumber(row.engagements).padStart(cols.find((c) => c.label === "Engagements")!.width),
      formatNumber(row.follows).padStart(cols.find((c) => c.label === "Follows")!.width),
    ];

    console.log(values.join("  "));

    totalImpressions += row.impressions;
    totalClicks += row.clicks;
    totalUrlClicks += row.urlClicks;
    totalSpend += row.spend;
    totalEngagements += row.engagements;
    totalFollows += row.follows;
  }

  // Print totals row
  if (rows.length > 1) {
    console.log(separator);

    const totalCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const totalSpendDollars = totalSpend / 1_000_000;
    const totalCpc = totalClicks > 0 ? totalSpendDollars / totalClicks : 0;

    const totals = [
      ...(showDate ? ["".padEnd(16)] : []),
      "TOTAL".padEnd(30),
      formatNumber(totalImpressions).padStart(cols.find((c) => c.label === "Impressions")!.width),
      formatNumber(totalClicks).padStart(cols.find((c) => c.label === "Clicks")!.width),
      formatNumber(totalUrlClicks).padStart(cols.find((c) => c.label === "URL Clicks")!.width),
      formatPercent(totalCtr).padStart(cols.find((c) => c.label === "CTR")!.width),
      formatDollars(totalCpc).padStart(cols.find((c) => c.label === "CPC")!.width),
      formatMicros(totalSpend).padStart(cols.find((c) => c.label === "Spend")!.width),
      formatNumber(totalEngagements).padStart(cols.find((c) => c.label === "Engagements")!.width),
      formatNumber(totalFollows).padStart(cols.find((c) => c.label === "Follows")!.width),
    ];

    console.log(totals.join("  "));
  }
}
