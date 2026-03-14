# CampaignX — Backend API Reference for Frontend

> **Purpose**: Single source of truth for all backend API routes, request/response shapes, and database fields.  
> Use this when building the frontend to avoid calling fields that don't exist or missing fields that do.  
> **Last updated**: 2026-03-14

---

## Table of Contents

1. [Database Models (MongoDB/Mongoose)](#1-database-models)
2. [API Endpoints](#2-api-endpoints)
   - [POST /api/agent](#post-apiagent)
   - [GET /api/agent](#get-apiagent)
   - [GET /api/campaigns/:id](#get-apicampaignsid)
   - [GET /api/logs](#get-apilogs)
   - [GET /api/discover](#get-apidiscover)
3. [Agent Output Shapes (what the backend actually returns)](#3-agent-output-shapes)
4. [Status Enum Values](#4-status-enum-values)
5. [Field Usage Cheatsheet](#5-field-usage-cheatsheet)

---

## 1. Database Models

### Campaign (`src/lib/models/Campaign.js`)

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | Mongo-generated, used as `dbCampaignId` in frontend |
| `campaignId` | String | no | — | External campaign ID from the hackathon API (set after `approve`) |
| `brief` | String | **yes** | — | The campaign brief text |
| `strategy` | Mixed (Object) | no | — | Full strategy object from `strategyAgent` (see [Strategy Shape](#strategy-shape)) |
| `segments` | Mixed[] | no | — | **⚠️ NOT USED** — segments live inside `strategy.segments` |
| `contentVariants` | Array of objects | no | — | Email variants (see [ContentVariant Shape](#contentvariant-shape)) |
| `status` | String (enum) | no | `'draft'` | One of: `draft`, `pending_approval`, `approved`, `sent`, `analyzed`, `optimizing` |
| `metrics` | Object | no | — | Performance metrics (see [Metrics Shape](#metrics-shape)) |
| `reportData` | Mixed[] | no | — | Raw report rows from external API |
| `optimizationHistory` | Mixed[] | no | — | Array of optimization objects pushed after each analysis cycle |
| `parentCampaignId` | String | no | — | For linking optimization iterations |
| `iteration` | Number | no | `1` | Incremented on each optimization relaunch |
| `createdAt` | Date | auto | auto | Mongoose timestamp |
| `updatedAt` | Date | auto | auto | Mongoose timestamp |

#### ContentVariant Shape

Each item in `contentVariants[]`:

| Field | Type | Notes |
|---|---|---|
| `variantName` | String | `"A"` or `"B"` (A/B test label) |
| `subject` | String | Email subject line |
| `body` | String | Full email body text |
| `targetSegment` | String | Segment name this variant targets |
| `sendTime` | String | Recommended send time (e.g. `"10:00"`) |
| `customerIds` | String[] | Array of customer ID strings |
| `reasoning` | String | Why this variant was created |

#### Metrics Shape

The `metrics` object (set after `analyze` action):

| Field | Type | Notes |
|---|---|---|
| `openRate` | Number | e.g. `23.45` (percentage) |
| `clickRate` | Number | e.g. `5.67` (percentage) |
| `totalSent` | Number | Total emails sent |
| `totalOpened` | Number | Count of emails opened |
| `totalClicked` | Number | Count of emails clicked |
| `matrixScore` | Number | Weighted performance score (70% click + 30% open) |
| `matrixWeights` | Object | `{ clickRate: 0.7, openRate: 0.3 }` |
| `matrixThreshold` | Number | Min score to qualify (default `8`) |
| `matrixQualified` | Boolean | `true` if `matrixScore >= threshold` |
| `optimizationRequired` | Boolean | `true` if optimization is needed |

---

### AgentLog (`src/lib/models/AgentLog.js`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `campaignId` | String | no | The `campaign._id` (MongoDB ObjectId as string) |
| `agent` | String | **yes** | Agent name: `"orchestrator"`, `"strategy"`, `"content"`, `"analysis"`, `"optimization"`, `"error"` |
| `step` | String | no | Step identifier e.g. `"plan"`, `"cohort_fetched"`, `"complete"` |
| `input` | Mixed | no | Input data for this step |
| `output` | Mixed | no | Output data for this step |
| `reasoning` | String | no | Human-readable explanation of what happened |
| `duration` | Number | no | Duration in milliseconds |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

---

## 2. API Endpoints

### POST `/api/agent`

The **main orchestration endpoint**. All actions go through this single POST route.

**Common request body**: `{ action: string, ...params }`

---

#### Action: `"start"`

> Creates a new campaign plan (strategy + content) from a brief.

**Request**:
```json
{
  "action": "start",
  "brief": "Run email campaign for launching XDeposit..."
}
```

**Response** (success):
```json
{
  "success": true,
  "campaignId": "MongoDB ObjectId string",
  "plan": {
    "brief": "...",
    "cohortData": [ { /* raw customer objects */ } ],
    "schema": { /* schema metadata */ },
    "strategy": { /* see Strategy Shape below */ },
    "contentVariants": [ { /* see ContentVariant Shape above */ } ],
    "totalCustomers": 5000,
    "workflowPlan": {
      "steps": [
        { "step": 1, "action": "description", "api_needed": "which API", "reasoning": "why" }
      ],
      "overall_reasoning": "high-level approach"
    },
    "status": "pending_approval"
  },
  "logs": [ { "agent": "...", "step": "...", "reasoning": "...", "timestamp": "..." } ]
}
```

> **⚠️ `plan.cohortData`** contains the full customer array. Use it client-side for cohort stats. Don't assume any specific field names — detect them dynamically (the cohort schema can change).

---

#### Action: `"approve"`

> Human approved → sends emails via external API.

**Request**:
```json
{
  "action": "approve",
  "campaignId": "MongoDB ObjectId string (the _id from 'start' response)",
  "approvedVariants": [ { /* ContentVariant objects (optional — defaults to campaign's contentVariants) */ } ]
}
```

**Response** (success):
```json
{
  "success": true,
  "results": [
    {
      "campaign_id": "external-campaign-id-from-api",
      "message": "Campaign sent successfully",
      "segment": "Young Professionals",
      "subject": "subject line used",
      "reasoning": "how/why sent",
      "apiUsed": { "tool": "...", "method": "POST", "path": "..." }
    }
  ],
  "campaignId": "MongoDB ObjectId string"
}
```

> **⚠️ Important**: `results[].campaign_id` is the **external** campaign ID (from the hackathon API), NOT the MongoDB `_id`. The `campaignId` at root level IS the MongoDB `_id`.

---

#### Action: `"report"`

> Fetches the latest performance report from the external API.

**Request**:
```json
{
  "action": "report",
  "campaignId": "external-campaign-id (optional)",
  "dbCampaignId": "MongoDB ObjectId string"
}
```

**Response** (success):
```json
{
  "success": true,
  "report": {
    "data": [ { /* raw report rows — fields vary by external API */ } ],
    "total_rows": 5000
  },
  "reportPolling": {
    "report": { /* same as above */ },
    "attemptsMade": 3,
    "bestRows": 5000,
    "maxAttempts": 3,
    "delayMs": 4000
  },
  "campaignId": "external-campaign-id"
}
```

---

#### Action: `"analyze"`

> Runs analysis + optimization cycle on a sent campaign.

**Request**:
```json
{
  "action": "analyze",
  "campaignId": "external-campaign-id (optional, resolved from DB if missing)",
  "dbCampaignId": "MongoDB ObjectId string"
}
```

**Response** (success):
```json
{
  "success": true,
  "report": { "data": [ /* report rows */ ] },
  "analysis": {
    "overallPerformance": {
      "openRate": 23.45,
      "clickRate": 5.67,
      "totalSent": 5000,
      "totalOpened": 1172,
      "totalClicked": 283,
      "matrixScore": 10.01,
      "matrixWeights": { "clickRate": 0.7, "openRate": 0.3 },
      "matrixThreshold": 8,
      "matrixQualified": true,
      "optimizationRequired": false
    },
    "performanceMatrix": {
      "weightedScore": 10.01,
      "weights": { "clickRate": 0.7, "openRate": 0.3 },
      "threshold": 8,
      "minClickRate": 4,
      "minOpenRate": 18,
      "meetsThreshold": true,
      "needsOptimization": false
    },
    "abTestWinner": "Subject A performed better because...",
    "topSegments": ["Senior Citizens", "..."],
    "bottomSegments": ["..."],
    "insights": ["insight 1", "..."],
    "recommendedActions": ["action 1", "..."],
    "reasoning": "step-by-step analysis"
  },
  "optimization": {
    "optimizationType": "micro_segmentation | content_refresh | timing_adjustment | full_relaunch | none",
    "reasoning": "why optimization is/isn't needed",
    "skipped": true,
    "newSegments": [
      {
        "name": "segment name",
        "description": "why this segment",
        "rules": [ { "field": "...", "operator": "...", "values": [] } ],
        "recommendedTone": "professional",
        "recommendedSendTime": "10:00 IST",
        "newSubject": "optimized subject",
        "newBody": "optimized body",
        "customerIds": ["CUST001", "CUST002"],
        "count": 150
      }
    ],
    "expectedImprovement": { "openRate": "+5%", "clickRate": "+3%" },
    "changes": ["change 1", "change 2"],
    "humanApprovalRequired": true,
    "performanceMatrix": { /* same shape as above */ }
  },
  "reflection": {
    "needsOptimization": false,
    "reasoning": "why",
    "severity": "low | medium | high",
    "enforcedByMatrix": false,
    "performanceMatrix": { /* same as above */ }
  },
  "reportPolling": { /* same as report action */ },
  "logs": [ { "agent": "...", "step": "...", "reasoning": "...", "timestamp": "..." } ]
}
```

---

#### Action: `"optimize"`

> Sends optimized campaign variants (after analysis recommended optimization).

**Request**:
```json
{
  "action": "optimize",
  "dbCampaignId": "MongoDB ObjectId string",
  "optimizedVariants": [
    {
      "variantName": "Optimized Variant 1",
      "targetSegment": "segment name",
      "subject": "new subject",
      "body": "new body",
      "sendTime": "HH:MM",
      "customerIds": ["CUST001", "..."]
    }
  ]
}
```

**Response** (success):
```json
{
  "success": true,
  "results": [ { /* same shape as approve results */ } ]
}
```

---

### GET `/api/agent`

> Lists all campaigns (most recent first, max 20).

**Response**:
```json
{
  "campaigns": [
    {
      "_id": "MongoDB ObjectId",
      "campaignId": "external-id or null",
      "brief": "...",
      "strategy": { /* Strategy Shape */ },
      "contentVariants": [ /* ContentVariant Shape */ ],
      "status": "sent",
      "metrics": { /* Metrics Shape or null */ },
      "reportData": [],
      "optimizationHistory": [],
      "iteration": 1,
      "createdAt": "2026-03-14T10:00:00.000Z",
      "updatedAt": "2026-03-14T10:05:00.000Z"
    }
  ]
}
```

---

### GET `/api/campaigns/:id`

> Fetches a single campaign with its agent logs.

**URL param**: `:id` = MongoDB ObjectId string

**Response**:
```json
{
  "campaign": { /* Full Campaign document — same fields as listed in Model above */ },
  "logs": [
    {
      "_id": "...",
      "campaignId": "...",
      "agent": "orchestrator",
      "step": "plan",
      "input": {},
      "output": {},
      "reasoning": "...",
      "duration": 1234,
      "createdAt": "..."
    }
  ]
}
```

---

### GET `/api/logs`

> Fetches agent logs, optionally filtered by campaign.

**Query params**: `?campaignId=MongoDB_ObjectId` (optional)

**Response**:
```json
{
  "logs": [ /* Array of AgentLog documents, max 100, newest first */ ]
}
```

---

### GET `/api/discover`

> Returns the dynamically discovered external API tools.

**Response**:
```json
{
  "tools": [
    {
      "name": "tool_name",
      "method": "GET | POST",
      "path": "/api/v1/endpoint",
      "description": "first 200 chars of description"
    }
  ],
  "descriptions": "full formatted descriptions string",
  "specVersion": "1.0.0",
  "specTitle": "CampaignX API"
}
```

---

## 3. Agent Output Shapes

### Strategy Shape

Returned in `plan.strategy` from `start` action and stored in `campaign.strategy`:

```json
{
  "segments": [
    {
      "name": "Young Professionals",
      "description": "Customers aged 25-35 in urban areas",
      "rules": [
        { "field": "age", "operator": "between", "values": [25, 35] },
        { "field": "location", "operator": "in", "values": ["Mumbai", "Delhi"] }
      ],
      "recommendedTone": "casual",
      "recommendedSendTime": "10:00 IST",
      "priority": "high",
      "customerIds": ["CUST001", "CUST002"],
      "count": 1500
    }
  ],
  "abTestPlan": {
    "description": "A/B testing approach",
    "variables": ["content_style", "send_time", "subject_line"]
  },
  "overallStrategy": "Description of the overall strategy approach",
  "reasoning": "Step-by-step reasoning for strategy decisions"
}
```

> **Frontend should use**: `strategy.segments[].name`, `.description`, `.count`, `.customerIds.length`, `.recommendedTone`, `.recommendedSendTime`, `.priority`, and `strategy.overallStrategy`.

---

### WorkflowPlan Shape

Returned in `plan.workflowPlan` from `start` action:

```json
{
  "steps": [
    { "step": 1, "action": "Fetch customer cohort", "api_needed": "GET /api/v1/cohort", "reasoning": "Need customer data first" }
  ],
  "overall_reasoning": "High-level approach description"
}
```

---

## 4. Status Enum Values

| Value | Meaning | When Set |
|---|---|---|
| `draft` | Initial state | Default on creation (not currently used by orchestrator) |
| `pending_approval` | Plan created, awaiting human approval | After `start` action |
| `approved` | Human approved (transitional) | Briefly during `approve` |
| `sent` | Emails sent via external API | After `approve` action completes |
| `analyzed` | Performance analysis completed | After `analyze` action |
| `optimizing` | Optimization cycle sent | After `optimize` action |

---

## 5. Field Usage Cheatsheet

> ✅ = Field **exists** in backend and should be used  
> ❌ = Field does **NOT exist** — don't use it  
> ⚠️ = Field conditionally present (may be null/undefined)

### Campaign List / Cards (`GET /api/agent`)

| What to display | Access path | Notes |
|---|---|---|
| Campaign title | `campaign.brief` | Truncate as needed |
| Status badge | `campaign.status` | Use enum values above |
| External Campaign ID | `campaign.campaignId` | ⚠️ May be null before `approve` |
| MongoDB ID (for routing) | `campaign._id` | Always present |
| Created date | `campaign.createdAt` | ISO string |
| Updated date | `campaign.updatedAt` | ISO string |
| Iteration number | `campaign.iteration` | Default `1` |
| Open Rate | `campaign.metrics?.openRate` | ⚠️ null before `analyze` |
| Click Rate | `campaign.metrics?.clickRate` | ⚠️ null before `analyze` |
| Matrix Score | `campaign.metrics?.matrixScore` | ⚠️ null before `analyze` |
| Matrix Qualified | `campaign.metrics?.matrixQualified` | ⚠️ null before `analyze` |
| Matrix Threshold | `campaign.metrics?.matrixThreshold` | ⚠️ null before `analyze` |
| Total Recipients | `campaign.contentVariants?.reduce((s, v) => s + (v.customerIds?.length \|\| 0), 0)` | Sum manually |
| Total Variants | `campaign.contentVariants?.length` | |
| Total Segments | `campaign.strategy?.segments?.length` | |
| Has Optimization Data | `campaign.optimizationHistory?.length > 0` | Check before rendering |

### Segment Cards

| What to display | Access path |
|---|---|
| Segment name | `segment.name` |
| Description | `segment.description` |
| Customer count | `segment.count` or `segment.customerIds?.length` |
| Recommended tone | `segment.recommendedTone` |
| Recommended send time | `segment.recommendedSendTime` |
| Priority | `segment.priority` |

### Content Variant Cards

| What to display | Access path |
|---|---|
| Variant label | `variant.variantName` |
| Target segment name | `variant.targetSegment` |
| Email subject | `variant.subject` |
| Email body | `variant.body` |
| Recipient count | `variant.customerIds?.length` |
| Send time | `variant.sendTime` |
| Reasoning | `variant.reasoning` |

### Post-Send Results (from `approve` response)

| What to display | Access path |
|---|---|
| External campaign ID | `result.campaign_id` |
| Segment name | `result.segment` |
| Subject used | `result.subject` |
| Status message | `result.message` |
| Error (if failed) | `result.error` |

### Agent Logs

| What to display | Access path |
|---|---|
| Agent name | `log.agent` |
| Step name | `log.step` |
| Reasoning text | `log.reasoning` |
| Duration | `log.duration` |
| Timestamp | `log.createdAt` or `log.timestamp` |

### Analysis Response (from `analyze` action)

| What to display | Access path |
|---|---|
| Open Rate | `analysis.overallPerformance.openRate` |
| Click Rate | `analysis.overallPerformance.clickRate` |
| Total Sent | `analysis.overallPerformance.totalSent` |
| Total Opened | `analysis.overallPerformance.totalOpened` |
| Total Clicked | `analysis.overallPerformance.totalClicked` |
| Matrix Score | `analysis.overallPerformance.matrixScore` |
| Matrix Qualified | `analysis.overallPerformance.matrixQualified` |
| Optimization Required | `analysis.overallPerformance.optimizationRequired` |
| A/B Test Winner | `analysis.abTestWinner` |
| Top Segments | `analysis.topSegments` (string[]) |
| Bottom Segments | `analysis.bottomSegments` (string[]) |
| Insights | `analysis.insights` (string[]) |
| Recommended Actions | `analysis.recommendedActions` (string[]) |

### Optimization Data (from `analyze` or stored in `optimizationHistory[]`)

| What to display | Access path |
|---|---|
| Type | `optimization.optimizationType` |
| Reasoning | `optimization.reasoning` |
| Was skipped? | `optimization.skipped` |
| New segments | `optimization.newSegments[]` |
| — Segment name | `optimization.newSegments[].name` |
| — New subject | `optimization.newSegments[].newSubject` |
| — New body | `optimization.newSegments[].newBody` |
| — Customer IDs | `optimization.newSegments[].customerIds` |
| — Count | `optimization.newSegments[].count` |
| — Send time | `optimization.newSegments[].recommendedSendTime` |
| Expected Improvement | `optimization.expectedImprovement` (`{ openRate, clickRate }`) |
| Changes list | `optimization.changes` (string[]) |
| Needs approval? | `optimization.humanApprovalRequired` |

### Discovered Tools (from `GET /api/discover`)

| What to display | Access path |
|---|---|
| Tool name | `tool.name` |
| HTTP method | `tool.method` |
| API path | `tool.path` |
| Description | `tool.description` |

---

> **Remember**: The cohort schema (customer data fields) can change at any time. Never hardcode field names like `age`, `gender`, `location` — always detect fields dynamically from `Object.keys(cohortData[0])`.
