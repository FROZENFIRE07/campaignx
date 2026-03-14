# CampaignX: AI Multi-Agent System for Marketing Campaign Automation

## Executive Summary

CampaignX is an advanced AI-powered web application designed for end-to-end digital marketing campaign management, specifically built for SuperBFSI (an Indian BFSI service provider). The system leverages a multi-agent architecture to autonomously plan, execute, monitor, and optimize email marketing campaigns with human-in-the-loop approval for critical decisions.

**Project Type:** Hackathon Submission (FrostHack | XPECTO 2026 - IIT Mandi)  
**Organization:** InXiteOut  
**Tech Stack:** Next.js 16, React 19, Node.js, MongoDB, Groq SDK (LLM), Tailwind CSS  
**Architecture:** Agentic AI System with Dynamic API Discovery

---

## Problem Statement

Modern marketing campaigns require coordination across multiple channels and involve repetitive tasks like data gathering, segmentation, scheduling, and reporting. Campaign managers spend more time on manual operations than on strategy and creativity. CampaignX addresses this by implementing an AI agent solution that can:

1. Understand campaign briefs in natural language
2. Identify optimal campaign strategies for performance metrics (open rate, click rate)
3. Generate campaign content/creatives automatically
4. Request human-in-the-loop approval before execution
5. Integrate with campaign management APIs dynamically
6. Analyze performance metrics autonomously
7. Iterate and optimize campaigns based on results

---

## Core Features

### 1. Natural Language Campaign Briefing
- Users input campaign requirements as free-flowing text via UI
- AI agents parse and understand campaign objectives, target audience, constraints, and goals
- Example: "Run email campaign for launching XDeposit, a flagship term deposit product from SuperBFSI, that gives 1 percentage point higher returns than its competitors..."

### 2. Dynamic API Discovery (Agentic Approach)
- **Key Innovation:** LLM reads OpenAPI specification at runtime
- No hardcoded API calls - agents discover and decide which endpoints to use
- Adapts automatically if API structure changes
- Supports endpoints:
  - `POST /api/v1/signup` - Team registration
  - `GET /api/v1/get_customer_cohort` - Fetch customer data
  - `POST /api/v1/send_campaign` - Send email campaigns
  - `GET /api/v1/get_report` - Retrieve performance reports

### 3. Adaptive Customer Cohort Analysis
- Automatically fetches and analyzes customer demographics
- Handles cohort shifts between development and test phases
- Computes statistics: gender distribution, city demographics, age/income averages, credit scores
- No hardcoded field assumptions - adapts to any cohort structure
- Visualizes cohort insights with interactive dashboards

### 4. AI-Powered Campaign Strategy
- **Strategy Agent** analyzes cohort data and creates segmentation strategy
- Considers: demographics, behavioral patterns, optimal send times, content tone
- Implements A/B testing methodology automatically
- Segments customers based on:
  - Demographics (age, gender, location, income)
  - Behavioral attributes (KYC status, app usage, social media activity)
  - Product affinity and credit scores

### 5. Intelligent Content Generation
- **Content Agent** creates email subject lines and body content
- Generates multiple variants per segment for A/B testing
- Supports:
  - Text in English
  - Emojis (UTF-8)
  - Font formatting (bold, italic, underline)
  - Call-to-action URLs
- Adapts tone based on target segment (professional, casual, urgent, warm)
- Character limits: Subject (200 chars), Body (5000 chars)

### 6. Human-in-the-Loop Approval
- Displays complete campaign details before execution
- Shows: content variants, target segments, customer counts, send times
- Allows approval or rejection with revision capability
- No campaigns sent without explicit human approval

### 7. Agentic Campaign Execution
- LLM decides how to send campaigns via discovered APIs
- Handles scheduling for future dates/times (DD:MM:YY HH:MM:SS format)
- Ensures 100% cohort coverage (no customer left behind)
- Tracks campaign IDs and execution status

### 8. Performance Monitoring & Analysis
- **Analysis Agent** fetches and analyzes campaign reports
- Metrics tracked:
  - Open Rate (EO - Email Opened)
  - Click Rate (EC - Email Clicked)
  - Total sent, opened, clicked counts
- Identifies A/B test winners
- Generates actionable insights

### 9. Autonomous Optimization
- **Optimization Agent** creates improvement strategies based on performance
- Plan-Execute-Reflect cycle with self-correction
- Identifies micro-segments for targeted optimization
- Generates new content variants with expected improvements
- Adjusts send times, content style, tone, and targeting
- Requires human approval before re-launching optimized campaigns

### 10. Agent Reasoning Trail
- Complete transparency of AI decision-making
- Logs every agent step: planning, execution, reflection
- Shows: agent name, action, reasoning, timestamp
- Enables debugging and trust-building

---

## Technical Architecture

### Multi-Agent System

```
┌─────────────────────────────────────────────────────────────┐
│                      USER INTERFACE (Next.js)               │
│  - Campaign Brief Input                                     │
│  - Cohort Dashboard                                         │
│  - Approval Interface                                       │
│  - Performance Analytics                                    │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   ORCHESTRATOR AGENT                        │
│  - Workflow Planning (LLM-driven)                           │
│  - Agent Coordination                                       │
│  - State Management                                         │
│  - Logging & Monitoring                                     │
└─────┬──────────┬──────────┬──────────┬──────────┬──────────┘
      │          │          │          │          │
┌─────▼────┐ ┌──▼─────┐ ┌──▼──────┐ ┌─▼────────┐ ┌▼─────────┐
│ Strategy │ │Content │ │Analysis │ │Optimiza- │ │Tool      │
│ Agent    │ │Agent   │ │Agent    │ │tion Agent│ │Caller    │
└──────────┘ └────────┘ └─────────┘ └──────────┘ └──────────┘
      │          │          │          │          │
      └──────────┴──────────┴──────────┴──────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   API DISCOVERY SERVICE                     │
│  - Reads OpenAPI Spec (openapi.json)                        │
│  - Builds Tool Descriptions for LLM                         │
│  - Dynamic Endpoint Discovery                               │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│              CAMPAIGNX API (InXiteOut)                      │
│  - Customer Cohort Management                               │
│  - Campaign Execution                                       │
│  - Performance Reporting                                    │
│  Rate Limit: 100 calls/day per team                         │
└─────────────────────────────────────────────────────────────┘
```

### Agent Descriptions

#### 1. Orchestrator Agent (`orchestrator.js`)
- **Role:** Master coordinator of the entire workflow
- **Capabilities:**
  - Plans workflow steps by reading API documentation
  - Coordinates all sub-agents
  - Implements Plan-Execute-Reflect cycle
  - Handles cohort coverage validation
  - Manages campaign execution and optimization loops
- **Key Innovation:** Truly agentic - LLM decides which APIs to call, no hardcoded logic

#### 2. Strategy Agent (`strategyAgent.js`)
- **Role:** Marketing strategist
- **Capabilities:**
  - Analyzes customer cohort demographics
  - Creates segmentation strategy
  - Designs A/B testing plans
  - Recommends send times and content tones
  - Maps customer IDs to segments
- **Adaptive:** Works with any cohort structure, no field assumptions

#### 3. Content Agent (`contentAgent.js`)
- **Role:** Email copywriter
- **Capabilities:**
  - Generates subject lines and email bodies
  - Creates A/B test variants
  - Applies formatting (bold, italic, underline)
  - Inserts emojis strategically
  - Includes call-to-action URLs
  - Matches tone to target segment
- **Fallback:** Provides default content if generation fails

#### 4. Analysis Agent (`analysisAgent.js`)
- **Role:** Performance analyst
- **Capabilities:**
  - Fetches campaign reports via dynamic API discovery
  - Calculates open rates and click rates
  - Identifies A/B test winners
  - Generates insights and recommendations
  - Adapts to report structure changes

#### 5. Optimization Agent (`optimizationAgent.js`)
- **Role:** Campaign optimizer
- **Capabilities:**
  - Analyzes performance gaps
  - Creates micro-segmentation strategies
  - Generates improved content variants
  - Recommends timing adjustments
  - Predicts expected improvements
- **Reflection:** Evaluates if optimization is needed before proceeding

#### 6. Tool Caller (`toolCaller.js`)
- **Role:** API interaction handler
- **Capabilities:**
  - Executes LLM-decided API calls
  - Handles authentication (X-API-Key header)
  - Implements retry logic with self-correction
  - Parses and validates API responses
  - Provides detailed reasoning for each call

#### 7. API Discovery Service (`apiDiscovery.js`)
- **Role:** Dynamic API documentation reader
- **Capabilities:**
  - Parses OpenAPI specification
  - Builds tool descriptions for LLM consumption
  - Filters operational vs. setup endpoints
  - Provides schema information for parameters

#### 8. LLM Service (`llmService.js`)
- **Role:** Language model interface
- **Capabilities:**
  - Connects to Groq SDK (fast inference)
  - Supports JSON mode for structured outputs
  - Configurable temperature and parameters
  - Error handling and retry logic

---

## Technology Stack

### Frontend
- **Framework:** Next.js 16.1.6 (App Router)
- **UI Library:** React 19.2.3
- **Styling:** Tailwind CSS 4
- **Features:**
  - Server-side rendering
  - Client-side interactivity
  - Real-time log streaming
  - Responsive design
  - Interactive data visualizations

### Backend
- **Runtime:** Node.js (Next.js API Routes)
- **Database:** MongoDB (via Mongoose 9.2.4)
- **LLM Integration:** Groq SDK 0.37.0
- **API Client:** Axios (for CampaignX API calls)

### AI/ML
- **LLM Provider:** Groq (ultra-fast inference)
- **Models:** Llama 3, Mixtral, or similar (configurable)
- **Approach:** Agentic workflows with Plan-Execute-Reflect cycles
- **Techniques:**
  - Dynamic prompt engineering
  - JSON mode for structured outputs
  - Tool calling / function calling
  - Self-correction and reflection

### External APIs
- **CampaignX API:** https://campaignx.inxiteout.ai
- **Authentication:** API Key (X-API-Key header)
- **Rate Limit:** 100 requests/day per team
- **Documentation:** OpenAPI 3.0 specification

---

## Data Models

### Campaign Model (`Campaign.js`)
```javascript
{
  campaignId: String,
  brief: String (required),
  strategy: Mixed (segments, A/B plan, reasoning),
  segments: [Mixed],
  contentVariants: [{
    subject: String,
    body: String,
    targetSegment: String,
    sendTime: String
  }],
  status: Enum ['draft', 'pending_approval', 'approved', 'sent', 'analyzed', 'optimizing'],
  metrics: {
    openRate: Number,
    clickRate: Number,
    totalSent: Number,
    totalOpened: Number,
    totalClicked: Number
  },
  reportData: [Mixed],
  optimizationHistory: [Mixed],
  parentCampaignId: String,
  iteration: Number (default: 1),
  timestamps: true
}
```

### Agent Log Model (`AgentLog.js`)
```javascript
{
  campaignId: String,
  agent: String (orchestrator, strategy, content, analysis, optimization),
  step: String (plan, execute, reflect, etc.),
  reasoning: String,
  output: Mixed,
  timestamp: Date,
  duration: Number
}
```

---

## Key Differentiators

### 1. Truly Agentic Architecture
- **Not a chatbot or copy generator**
- LLM makes decisions about which APIs to call
- No hardcoded workflows or deterministic logic
- Adapts to API changes automatically

### 2. Dynamic API Discovery
- Reads OpenAPI specification at runtime
- No manual API integration code
- Self-documenting and self-adapting
- Demonstrates advanced AI engineering

### 3. Cohort Shift Resilience
- Designed for IIT Mandi hackathon test phase
- Handles customer cohort changes between phases
- No cached assumptions about data structure
- Re-fetches and re-analyzes on demand

### 4. Plan-Execute-Reflect Cycle
- Orchestrator plans workflow before execution
- Agents execute with self-correction
- Reflection step evaluates if optimization is needed
- Continuous improvement loop

### 5. 100% Cohort Coverage
- Validates that every customer is targeted
- Adds catch-all segments if needed
- Ensures maximum scoring in competition metrics

### 6. Human-in-the-Loop Safety
- No autonomous execution without approval
- Clear preview of all campaign details
- Revision capability at every stage
- Trust and transparency built-in

### 7. Comprehensive Logging
- Every agent decision is logged
- Reasoning trail for debugging
- Timestamp and duration tracking
- Enables post-mortem analysis

---

## Workflow Example

### Phase 1: Campaign Brief
**User Input:**
```
Run email campaign for launching XDeposit, a flagship term deposit 
product from SuperBFSI, that gives 1 percentage point higher returns 
than its competitors. Announce an additional 0.25 percentage point 
higher returns for female senior citizens. Optimise for open rate and 
click rate. Don't skip emails to customers marked 'inactive'. Include 
the call to action: https://superbfsi.com/xdeposit/explore/.
```

### Phase 2: Dynamic API Discovery
**Orchestrator Agent:**
- Reads OpenAPI spec from `/public/openapi.json`
- Discovers available endpoints
- Plans workflow:
  1. Fetch customer cohort
  2. Analyze demographics
  3. Create segmentation strategy
  4. Generate content variants
  5. Send campaigns (after approval)
  6. Fetch performance reports
  7. Optimize based on results

### Phase 3: Customer Cohort Analysis
**Tool Caller Agent:**
- LLM decides to call `GET /api/v1/get_customer_cohort`
- Fetches 5000+ customer records
- Extracts fields: customer_id, Age, Gender, City, Income, Credit_score, etc.

**Orchestrator:**
- Computes statistics:
  - Total: 5000 customers
  - Gender: Male (2800), Female (2200)
  - Top Cities: Mumbai (800), Delhi (750), Bangalore (700)
  - Avg Age: 42 years
  - Avg Income: ₹65,000/month
  - Avg Credit Score: 720

### Phase 4: AI Campaign Strategy
**Strategy Agent:**
- Analyzes cohort data
- Creates segments:
  1. **Female Senior Citizens (60+)** - 450 customers
     - Tone: Warm, respectful
     - Send Time: 10:00 IST
     - Priority: High (special offer)
  2. **High-Income Professionals** - 1200 customers
     - Tone: Professional, data-driven
     - Send Time: 09:00 IST
     - Priority: High
  3. **Young Savers (25-35)** - 1800 customers
     - Tone: Casual, aspirational
     - Send Time: 20:00 IST
     - Priority: Medium
  4. **General Audience** - 1550 customers
     - Tone: Balanced
     - Send Time: 11:00 IST
     - Priority: Medium

### Phase 5: Content Generation
**Content Agent:**
- Generates 2 variants per segment (A/B testing)
- Example for Female Senior Citizens:

**Variant A:**
```
Subject: Exclusive XDeposit Offer for Senior Women Citizens 🌸
Body: Dear Valued Customer,

We are delighted to introduce **XDeposit** — SuperBFSI's premium term 
deposit with **1.25% higher returns** exclusively for female senior citizens! 

Your financial security is our priority. Enjoy guaranteed returns and 
peace of mind.

👉 Explore now: https://superbfsi.com/xdeposit/explore/

Warm regards,
SuperBFSI Team
```

**Variant B:**
```
Subject: Higher Returns Await You with XDeposit 💰
Body: Dear Madam,

Introducing **XDeposit** — earn **1.25% more** than competitors! 

As a valued senior citizen, you deserve the best returns. Join thousands 
who trust SuperBFSI.

🔗 Learn more: https://superbfsi.com/xdeposit/explore/

Best wishes,
SuperBFSI
```

### Phase 6: Human Approval
**UI Display:**
- Shows all 8 variants (4 segments × 2 variants)
- Customer counts per variant
- Send times
- Preview of subject and body

**User Action:** Clicks "✅ Approve & Send All Campaigns"

### Phase 7: Campaign Execution
**Tool Caller Agent:**
- For each variant:
  - LLM decides to call `POST /api/v1/send_campaign`
  - Constructs payload:
    ```json
    {
      "subject": "...",
      "body": "...",
      "list_customer_ids": ["CUST001", "CUST002", ...],
      "send_time": "15:03:26 10:00:00"
    }
    ```
  - Receives campaign_id: `"123e4567-e89b-12d3-a456-426614174000"`

**Result:** 8 campaigns sent successfully

### Phase 8: Performance Analysis
**User Action:** Clicks "📊 Analyze Campaign 1"

**Tool Caller Agent:**
- LLM decides to call `GET /api/v1/get_report?campaign_id=...`
- Fetches report with EO (Email Opened) and EC (Email Clicked) flags

**Analysis Agent:**
- Calculates metrics:
  - Open Rate: 45%
  - Click Rate: 12%
  - Total Sent: 225
  - Total Opened: 101
  - Total Clicked: 27
- Identifies winner: Variant B (48% open rate vs. 42% for Variant A)
- Generates insights:
  - "Female senior citizens respond better to direct benefit messaging"
  - "Emoji usage increased engagement by 6%"
  - "Send time of 10:00 IST optimal for this segment"

### Phase 9: Autonomous Optimization
**Optimization Agent:**
- Reflects: "Click rate of 12% is below target (15%). Optimization needed."
- Creates micro-segments:
  1. **High Engagers** (opened but didn't click) - 74 customers
     - New approach: Stronger CTA, urgency
  2. **Non-Openers** (didn't open) - 124 customers
     - New approach: Different subject line, different send time

- Generates optimized variants:

**High Engagers - New Variant:**
```
Subject: Last Chance: XDeposit 1.25% Bonus Ends Soon! ⏰
Body: Dear Customer,

You showed interest in **XDeposit** — don't miss out!

✅ 1.25% higher returns
✅ Guaranteed safety
✅ Easy online application

⚡ Apply now before this exclusive offer expires:
https://superbfsi.com/xdeposit/explore/

Act today!
SuperBFSI Team
```

**Non-Openers - New Variant:**
```
Subject: Your Personalized XDeposit Offer Inside 🎁
Body: [Different approach, sent at 15:00 IST instead of 10:00]
```

**Expected Improvement:**
- Open Rate: 45% → 52%
- Click Rate: 12% → 18%

**User Action:** Clicks "✅ Approve & Relaunch"

**Result:** Optimized campaigns sent, cycle repeats

---

## Competitive Advantages for Hackathon

### 1. Campaign Performance Metrics (50% weight)
- **100% Cohort Coverage:** No customer left untargeted
- **A/B Testing:** Multiple variants per segment
- **Optimized Send Times:** Based on demographic analysis
- **Personalized Content:** Tone and style matched to segments
- **Continuous Optimization:** Iterative improvement loop

### 2. Functionality & Completeness (30% weight)
- ✅ Natural language brief parsing
- ✅ Dynamic API discovery (not hardcoded)
- ✅ Adaptive cohort analysis
- ✅ AI-powered strategy and content generation
- ✅ Human-in-the-loop approval
- ✅ Agentic campaign execution
- ✅ Performance monitoring and analysis
- ✅ Autonomous optimization with reflection
- ✅ Complete logging and transparency

### 3. Deliverable Quality (20% weight)
- **Code Quality:** Modular, well-documented, follows best practices
- **UI/UX:** Clean, intuitive, professional design
- **Documentation:** Comprehensive README, API integration guide
- **Demo Video:** Clear demonstration of agentic workflow
- **Presentation:** Architecture diagrams, workflow explanations

### Red Flags Avoided
- ❌ Not just a chatbot or copy generator
- ❌ No deterministic API calling (uses dynamic discovery)
- ❌ No manual optimization (agents decide autonomously)
- ❌ No hardcoded campaign flows (LLM plans workflow)
- ❌ Human-in-the-loop implemented (not fully autonomous)

---

## Setup and Installation

### Prerequisites
- Node.js 18+ and npm
- MongoDB instance (local or cloud)
- Groq API key (for LLM access)
- CampaignX API key (from InXiteOut)

### Environment Variables
Create `campaignx/.env.local`:
```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/campaignx

# Groq LLM
GROQ_API_KEY=your_groq_api_key_here

# CampaignX API
CAMPAIGNX_API_KEY=your_campaignx_api_key_here
CAMPAIGNX_BASE_URL=https://campaignx.inxiteout.ai
```

### Installation Steps
```bash
cd campaignx
npm install
npm run dev
```

Access at: http://localhost:3000

---

## File Structure

```
campaignx/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── agent/route.js          # Main agent orchestration endpoint
│   │   │   └── discover/route.js       # API discovery endpoint
│   │   ├── page.js                     # Main UI component
│   │   ├── layout.js                   # App layout
│   │   └── globals.css                 # Global styles
│   └── lib/
│       ├── agents/
│       │   ├── orchestrator.js         # Master coordinator
│       │   ├── strategyAgent.js        # Segmentation strategist
│       │   ├── contentAgent.js         # Email copywriter
│       │   ├── analysisAgent.js        # Performance analyst
│       │   ├── optimizationAgent.js    # Campaign optimizer
│       │   ├── apiDiscovery.js         # OpenAPI spec reader
│       │   ├── toolCaller.js           # API interaction handler
│       │   └── llmService.js           # LLM interface
│       ├── models/
│       │   ├── Campaign.js             # Campaign data model
│       │   └── AgentLog.js             # Agent logging model
│       └── db.js                       # MongoDB connection
├── public/
│   └── openapi.json                    # CampaignX API specification
├── package.json
├── next.config.mjs
└── README.md
```

---

## API Endpoints

### Internal API Routes

#### POST /api/agent
Main orchestration endpoint for all agent actions.

**Actions:**
1. `start` - Initiate campaign planning
2. `approve` - Execute approved campaigns
3. `analyze` - Fetch and analyze performance
4. `optimize` - Re-launch optimized campaigns

**Request:**
```json
{
  "action": "start",
  "brief": "Campaign description..."
}
```

**Response:**
```json
{
  "success": true,
  "plan": {
    "brief": "...",
    "cohortData": [...],
    "strategy": {...},
    "contentVariants": [...],
    "workflowPlan": {...}
  },
  "campaignId": "mongodb_id",
  "logs": [...]
}
```

#### GET /api/discover
Returns discovered API tools from OpenAPI spec.

**Response:**
```json
{
  "tools": [
    {
      "method": "GET",
      "path": "/api/v1/get_customer_cohort",
      "description": "Retrieves customer cohort data",
      "operationId": "get_customer_cohort"
    }
  ]
}
```

---

## Performance Optimization Strategies

### 1. LLM Efficiency
- Use Groq for ultra-fast inference (10x faster than OpenAI)
- JSON mode for structured outputs (reduces parsing errors)
- Temperature tuning: 0.3 for planning, 0.6 for strategy, 0.8 for content
- Prompt caching for repeated API documentation

### 2. API Rate Limit Management
- 100 calls/day limit per team
- Batch operations where possible
- Cache cohort data to avoid redundant fetches
- Retry logic with exponential backoff

### 3. Database Optimization
- Index on campaignId and status fields
- Store only essential data in MongoDB
- Use Mixed type for flexible schema
- Implement TTL for old logs

### 4. Frontend Performance
- Server-side rendering for initial load
- Client-side interactivity for real-time updates
- Lazy loading for large datasets
- Optimized CSS with Tailwind

---

## Testing Strategy

### Unit Tests
- Agent logic (strategy, content, analysis, optimization)
- API discovery parsing
- Tool calling with mocked responses
- LLM service with mocked completions

### Integration Tests
- Full orchestration flow (brief → execution → analysis)
- API integration with CampaignX endpoints
- Database operations (CRUD for campaigns)
- Error handling and retry logic

### Manual Testing Checklist
- [ ] Campaign brief parsing with various inputs
- [ ] Cohort analysis with different data structures
- [ ] Strategy generation for diverse demographics
- [ ] Content generation with A/B variants
- [ ] Human approval workflow
- [ ] Campaign execution with API calls
- [ ] Performance report fetching
- [ ] Optimization loop with re-launch
- [ ] Agent logging and reasoning trail
- [ ] UI responsiveness and error states

---

## Future Enhancements

### Short-Term
1. **Multi-Channel Support:** SMS, WhatsApp, social media
2. **Advanced Analytics:** Conversion tracking, ROI calculation
3. **Template Library:** Pre-built campaign templates
4. **Scheduling:** Delayed campaign execution
5. **User Management:** Team collaboration, role-based access

### Long-Term
1. **Predictive Analytics:** ML models for performance prediction
2. **Real-Time Optimization:** Dynamic content adjustment during campaign
3. **Multi-Language Support:** Regional language campaigns
4. **Integration Hub:** Connect with CRM, analytics platforms
5. **White-Label Solution:** Customizable for different organizations

---

## Hackathon Deliverables

### 1. Code Repository
- GitHub: https://github.com/[team]/campaignx
- Clean, documented, modular code
- README with setup instructions
- Architecture diagrams

### 2. Screen Recording (< 3 minutes)
- End-to-end campaign workflow
- Dynamic API discovery demonstration
- At least one optimization loop
- Code snippets showing agentic approach

### 3. Presentation Deck (5 slides max)
1. **Executive Summary:** Customer insights from test phase
2. **Architecture:** Multi-agent system diagram
3. **Workflow:** Plan-Execute-Reflect cycle
4. **Tech Stack:** Next.js, Groq, MongoDB, CampaignX API
5. **Results:** Performance metrics and differentiators

---

## Team & Credits

**Hackathon:** FrostHack | XPECTO 2026  
**Organizer:** InXiteOut @ IIT Mandi  
**Challenge:** CampaignX - AI Multi-Agent Marketing Automation  
**Tech Stack:** Next.js, React, Node.js, MongoDB, Groq SDK  
**API Provider:** InXiteOut CampaignX API v1.0

---

## License

This project is developed for the FrostHack hackathon at IIT Mandi. All rights reserved by the development team and InXiteOut.

---

## Contact & Support

For questions or issues:
- Email: campaignx@inxiteout.ai
- Hackathon Portal: [IIT Mandi XPECTO 2026]
- API Documentation: https://campaignx.inxiteout.ai/docs

---

**Last Updated:** March 11, 2026  
**Version:** 1.0  
**Status:** Production-Ready for Test Phase
