import urllib.request
import json
import time

BASE = "http://localhost:3000"

# Step 1: Start campaign
print("=" * 60)
print("STEP 1: Starting campaign with AI agents...")
print("=" * 60)

brief = "Run email campaign for launching XDeposit, a flagship term deposit product from SuperBFSI, that gives 1 percentage point higher returns than its competitors. Announce an additional 0.25 percentage point higher returns for female senior citizens. Optimise for open rate and click rate. Include the call to action: https://superbfsi.com/xdeposit/explore/"

data = json.dumps({"action": "start", "brief": brief}).encode()
req = urllib.request.Request(f"{BASE}/api/agent", data=data, headers={"Content-Type": "application/json"})

try:
    t0 = time.time()
    resp = urllib.request.urlopen(req, timeout=120)
    body = json.loads(resp.read().decode())
    elapsed = time.time() - t0
    print(f"Completed in {elapsed:.1f}s")
    
    if body.get("success"):
        plan = body.get("plan", {})
        db_id = body.get("campaignId")
        print(f"DB Campaign ID: {db_id}")
        print(f"Total Customers: {plan.get('totalCustomers')}")
        print(f"Strategy: {plan.get('strategy', {}).get('overallStrategy', 'N/A')[:200]}")
        print(f"Segments: {len(plan.get('strategy', {}).get('segments', []))}")
        print(f"Content Variants: {len(plan.get('contentVariants', []))}")
        
        for i, v in enumerate(plan.get("contentVariants", [])[:2]):
            print(f"\n  Variant {i+1}: [{v.get('targetSegment')}] - {v.get('variantName')}")
            print(f"  Subject: {v.get('subject', 'N/A')[:100]}")
            print(f"  Recipients: {len(v.get('customerIds', []))}")
        
        # Save for next steps
        with open("test_result.json", "w") as f:
            json.dump({"db_id": db_id, "plan": plan}, f)
        
        print("\n" + "=" * 60)
        print("STEP 2: Approving and sending campaign...")
        print("=" * 60)
        
        # Step 2: Approve
        data2 = json.dumps({
            "action": "approve",
            "campaignId": db_id,
            "approvedVariants": plan.get("contentVariants", [])[:4]  # Limit to avoid rate limits
        }).encode()
        req2 = urllib.request.Request(f"{BASE}/api/agent", data=data2, headers={"Content-Type": "application/json"})
        
        t0 = time.time()
        resp2 = urllib.request.urlopen(req2, timeout=60)
        body2 = json.loads(resp2.read().decode())
        elapsed = time.time() - t0
        print(f"Completed in {elapsed:.1f}s")
        
        if body2.get("success"):
            results = body2.get("results", [])
            print(f"Campaigns sent: {len(results)}")
            for r in results:
                print(f"  Campaign ID: {r.get('campaign_id')}")
                print(f"  Message: {r.get('message')}")
            
            if results:
                campaign_id = results[0].get("campaign_id")
                
                print("\n" + "=" * 60)
                print("STEP 3: Analyzing campaign performance...")
                print("=" * 60)
                
                # Step 3: Analyze
                data3 = json.dumps({
                    "action": "analyze",
                    "campaignId": campaign_id,
                    "dbCampaignId": db_id,
                }).encode()
                req3 = urllib.request.Request(f"{BASE}/api/agent", data=data3, headers={"Content-Type": "application/json"})
                
                t0 = time.time()
                resp3 = urllib.request.urlopen(req3, timeout=120)
                body3 = json.loads(resp3.read().decode())
                elapsed = time.time() - t0
                print(f"Completed in {elapsed:.1f}s")
                
                if body3.get("success"):
                    analysis = body3.get("analysis", {})
                    perf = analysis.get("overallPerformance", {})
                    optim = body3.get("optimization", {})
                    
                    print(f"Open Rate: {perf.get('openRate')}%")
                    print(f"Click Rate: {perf.get('clickRate')}%")
                    print(f"Total Sent: {perf.get('totalSent')}")
                    print(f"A/B Winner: {analysis.get('abTestWinner', 'N/A')[:100]}")
                    print(f"Optimization Type: {optim.get('optimizationType')}")
                    print(f"Expected Improvement: {optim.get('expectedImprovement')}")
                    
                    print("\n===== FULL E2E TEST PASSED =====")
                else:
                    print(f"Analysis failed: {body3.get('error')}")
        else:
            print(f"Approve failed: {body2.get('error')}")
    else:
        print(f"Start failed: {body.get('error')}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
