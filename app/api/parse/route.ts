// app/api/parse/route.ts
// SmartCreate AI Parser v2 — autonomous web search enrichment
// 1. Local NLP (client-side, free, instant)
// 2. AI parse + web_search to autonomously find missing fields
// 3. Detect & propose sub-entities (contacts inside company text, etc.)
// Model: haiku for simple, sonnet for complex

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are an autonomous Web3 entity intelligence engine for a professional networking platform.

Your job:
1. Extract all structured fields from the provided text
2. Use web_search to autonomously find any missing details (website, team, stage, description, raise amount, etc.)
3. Detect if additional entities can be created from the same text (e.g. a Contact "Tim, Co-Founder" mentioned in a Deal)
4. Check for duplicates against the provided existing entities
5. Return complete, enriched JSON — fill every field you can find

Web3 context: You understand DeFi, L1/L2, tokenomics, IDO/IEO/TGE, SAFT, vesting, CEX/DEX listings, ZK proofs, etc.

CRITICAL: Return ONLY raw JSON. No markdown. No explanation. No code blocks.`;

function buildPrompt(type: string, body: any): string {
  const existingCtx = `
Existing contacts: ${JSON.stringify(body.existingContacts?.slice(0, 20))}
Existing companies: ${JSON.stringify(body.existingCompanies?.slice(0, 20))}
Existing projects: ${JSON.stringify(body.existingProjects?.slice(0, 20))}`;

  const TAG_LIST = "defi,nft,gamefi,l1,l2,infra,ai-web3,rwa,payments,identity,dao,socialfi,cex,dex,stablecoin,derivatives,lending,privacy,bridge,oracle,modular,zk,launchpad,metaverse,us,eu,asia,latam,mena,cis,africa,global";
  const ROLE_LIST = "vc,angel,family-office,lp,fund-manager,founder,co-founder,ceo,cto,coo,cfo,cpo,bd,partnerships,sales,growth,marketing,kol,influencer,community,ambassador,media,developer,smart-contract,security,auditor,devrel,advisor,legal,compliance,tokenomics,market-maker,otc,trader,exchange";

  const schemas: Record<string, string> = {
    contact: `{
  "name": string,
  "company": string,
  "website": string (domain only),
  "role": one of [${ROLE_LIST}],
  "status": "active"|"partner"|"inactive",
  "telegram": string (handle, no @),
  "twitter": string (handle, no @),
  "linkedin": string (username),
  "email": string,
  "notes": string (1-2 sentence summary),
  "tags": string[] from [${TAG_LIST}],
  "linked": [{"type":"contact"|"company"|"project","id":string,"name":string}],
  "subEntities": [{"type":"company"|"project","data":{...fields}}],
  "dedup": {"entity":{"id":string,"name":string},"score":number}|null
}`,
    company: `{
  "name": string,
  "website": string (domain only),
  "stage": "Idea"|"Pre-Seed"|"Seed"|"Series A"|"Series B"|"Growth"|"Public"|"Acquired",
  "description": string (2-3 sentences),
  "tags": string[] from [${TAG_LIST}],
  "linked": [{"type":"contact"|"company"|"project","id":string,"name":string}],
  "subEntities": [{"type":"contact","data":{"name":string,"role":string,"telegram":string,...}}],
  "dedup": {"entity":{"id":string,"name":string},"score":number}|null
}`,
    project: `{
  "name": string,
  "website": string (domain only),
  "stage": "Concept"|"Development"|"Testnet"|"Mainnet"|"Post-TGE"|"Mature",
  "description": string (2-3 sentences),
  "tags": string[] from [${TAG_LIST}],
  "linked": [{"type":"contact"|"company"|"project","id":string,"name":string}],
  "subEntities": [{"type":"contact","data":{...}}],
  "dedup": {"entity":{"id":string,"name":string},"score":number}|null
}`,
    deal: body.dealMode === "investing"
      ? `{
  "dealMode": "investing",
  "title": string (investor/fund name, be specific),
  "investorType": one of ["angel","micro-vc","vc","crypto-fund","family-office","syndicate","dao","ecosystem","corporate-vc","hni","foundation","accelerator","launchpad","grant-org"],
  "description": string (investment strategy, focus, value-add beyond capital),
  "status": "active"|"paused"|"filled"|"expired"|"draft",
  "minTicket": number (minimum check size, can be as low as 0.10),
  "maxTicket": number (0 = unlimited),
  "currency": "USD"|"EUR"|"USDT"|"USDC"|"ETH"|"BTC"|"SOL"|"BNB"|"MATIC"|"AVAX"|"ARB"|"OP"|"GBP"|"SGD"|"AED"|"TOKEN"|"MIXED" (default "USD"),
  "preferredInstruments": string[] from ["saft","safe","safe-warrant","equity","token","convertible","venture-debt","rbf","grant","otc","lp","any"],
  "preferredStages": string[] from ["angels","pre-seed","seed","series-a","series-b","series-c-plus","strategic","private-sale","pre-tge","tge","ido-ieo","otc","lp-provision","safe","saft","convertible","grant-web3","grant-defi","grant-gov","gitcoin","retropgf","ecosystem-fund","accelerator","incubator","hackathon","bounty","secondary"],
  "preferredVerticals": string[] from [${TAG_LIST}],
  "preferredGeos": string[] from ["us","uk","eu","sg","hk","asia","dubai","mena","latam","cis","africa","global"],
  "maxCliffMonths": number|null,
  "minVestingMonths": number|null,
  "maxVestingMonths": number|null,
  "minTgeUnlockPct": number|null,
  "targetRoiX": number|null,
  "valueAdd": string[] from ["tech","marketing","bd","exchange","legal","tokenomics","liquidity","community","regulatory","none"],
  "coInvestOk": boolean,
  "leadOnly": boolean,
  "kycOk": boolean,
  "proRataReq": boolean,
  "boardSeatReq": boolean,
  "terms": string,
  "tags": string[] from [${TAG_LIST}],
  "subEntities": [],
  "dedup": null
}`
      : `{
  "title": string (descriptive: "ProjectName — RoundLabel · $Amount · Instrument"),
  "projectName": string,
  "seekingType": "capital"|"grant"|"hackathon"|"accelerator"|"strategic"|"liquidity"|"any",
  "round": "angels"|"pre-seed"|"seed"|"series-a"|"series-b"|"series-c-plus"|"strategic"|"private-sale"|"pre-tge"|"tge"|"ido-ieo"|"otc"|"lp-provision"|"safe"|"saft"|"convertible"|"venture-debt"|"rbf"|"grant-web3"|"grant-defi"|"grant-gov"|"gitcoin"|"retropgf"|"ecosystem-fund"|"accelerator"|"incubator"|"hackathon"|"bounty"|"secondary",
  "status": "active"|"paused"|"filled"|"expired"|"draft",
  "amount": number (target raise, use midpoint if range given, 0 if unknown),
  "amountMin": number (minimum raise if range given, else 0),
  "currency": "USD"|"EUR"|"USDT"|"USDC"|"ETH"|"BTC"|"SOL"|"BNB"|"MATIC"|"AVAX"|"ARB"|"OP"|"GBP"|"SGD"|"AED"|"TOKEN"|"MIXED",
  "instrument": "saft"|"safe"|"safe-warrant"|"equity"|"token"|"convertible"|"venture-debt"|"rbf"|"grant"|"otc"|"lp"|"any",
  "token": string (ticker if exists),
  "tokenType": "utility"|"governance"|"revenue"|"payment"|"nft"|"rwa"|"none"|null,
  "tokenExists": "yes"|"planned"|"no",
  "valuationCap": number|null,
  "fdv": number|null,
  "cliffMonths": number,
  "vestingMonths": number,
  "tgeUnlockPct": number,
  "description": string,
  "traction": string,
  "existingInvestors": string,
  "closeDate": string|null,
  "deckUrl": string,
  "dataroomUrl": string,
  "jurisdiction": "cayman"|"bvi"|"delaware"|"singapore"|"uae"|"swiss"|"estonia"|"uk"|"other"|null,
  "leadRequired": boolean,
  "proRata": boolean,
  "kycRequired": boolean,
  "boardSeatOk": boolean,
  "audited": boolean,
  "doxxed": boolean,
  "geoRestrictions": string[],
  "idealInvestorTypes": string[],
  "terms": string,
  "tags": string[] from [${TAG_LIST}],
  "linked": [{"type":"contact"|"company"|"project","id":string,"name":string}],
  "subEntities": [{"type":"contact"|"project","data":{...}}],
  "dedup": null
}`,
    lf: `{
  "type": "looking"|"offering"|"ask"|"announce",
  "title": string,
  "body": string,
  "tags": string[] from [${TAG_LIST}],
  "linked": [],
  "subEntities": [],
  "dedup": null
}`,
  };

  return `Extract a ${type.toUpperCase()} entity from the text below.${body.dealMode === "investing" ? "\nMODE: INVESTING — extract investor/capital deployer profile, NOT a fundraising deal." : ""}
Use web_search to find any missing details autonomously — search for the project/company/person name to find website, stage, team, raise details, etc.
Also detect any additional sub-entities mentioned (e.g. a named person → Contact, a named project → Project).
Check the existing entities lists for duplicates (score 0.0–1.0, flag if ≥0.8).
${existingCtx}

INPUT TEXT:
"""
${body.text}
"""

Return this exact JSON schema (omit keys you truly cannot determine):
${schemas[type] || schemas.contact}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, type, localFields, dealMode } = body;

    if (!text || !type) {
      return NextResponse.json({ error: "Missing text or type" }, { status: 400 });
    }

    // ── Special: free-form AI call (synergy insight, etc.) ──
    if (type === "synergy_insight") {
      const msg = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 400,
        system: "You are a Web3 deal analyst. Reply ONLY with a short analysis paragraph — no JSON, no headers, no bullets.",
        messages: [{ role: "user", content: text }],
      });
      const textBlock = [...msg.content].reverse().find((b) => b.type === "text");
      const result = (textBlock as any)?.text || "Unable to generate insight.";
      return NextResponse.json({ result });
    }

    // Route to model based on complexity
    const isComplex = text.length > 300 || type === "deal" || text.split("\n").length > 5;
    const model = isComplex ? "claude-sonnet-4-20250514" : "claude-haiku-4-5-20251001";

    const msg = await client.messages.create({
      model,
      max_tokens: 1200,
      system: SYSTEM,
      tools: [{ type: "web_search_20250305", name: "web_search" } as any],
      tool_choice: { type: "auto" },
      messages: [{ role: "user", content: buildPrompt(type, body) }],
    });

    // Extract final text block (after any tool use)
    const textBlock = [...msg.content].reverse().find((b) => b.type === "text");
    const raw = (textBlock as any)?.text || "{}";

    let parsed: any = {};
    try {
      const clean = raw.replace(/```json\n?|```/g, "").trim();
      // Handle cases where model wraps in extra object
      parsed = JSON.parse(clean);
    } catch {
      return NextResponse.json({ fields: localFields || {}, linked: [], subEntities: [], dedup: null });
    }

    const { linked = [], subEntities = [], dedup = null, ...rawFields } = parsed;

    // Build fields — mark which ones are new vs local already had them
    const fields: Record<string, any> = {};
    const overwrite: Record<string, boolean> = {};

    Object.entries(rawFields).forEach(([k, v]) => {
      if (v === null || v === undefined || v === "") return;
      if (Array.isArray(v) && v.length === 0) return;
      fields[k] = v;
      // Overwrite if local NLP didn't find it or found empty
      const localVal = localFields?.[k];
      if (!localVal || (Array.isArray(localVal) && localVal.length === 0) || localVal === 0) {
        overwrite[k] = true;
      }
    });

    return NextResponse.json({ fields, overwrite, linked, subEntities, dedup });
  } catch (err: any) {
    console.error("[parse] error:", err?.message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
