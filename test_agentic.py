import urllib.request
import json
import time

BASE = "http://localhost:3000"

# Test the TRULY AGENTIC flow
print("=" * 60)
print("TESTING TRULY AGENTIC CAMPAIGN FLOW")
print("=" * 60)

brief = "Run email campaign for launching XDeposit, a flagship term deposit product from SuperBFSI, that gives 1 percentage point higher returns than its competitors. Announce an additional 0.25 percentage point higher returns for female senior citizens. Optimise for open rate and click rate. Include the call to action: https://superbfsi.com/xdeposit/explore/"

data = json.dumps({"action": "start", "brief": brief}).encode()
req = urllib.request.Request(f"{BASE}/api/agent", data=data, headers={"Content-Type": "application/json"})

try:
    t0 = time.time()
    resp = urllib.request.urlopen(req, timeout=180)
    body = json.loads(resp.read().decode())
    elapsed = time.time() - t0
    print(f"Completed in {elapsed:.1f}s")
    
    if body.get("success"):
        plan = body.get("plan", {})
        logs = body.get("logs", [])
        
        print(f"\n--- AGENT WORKFLOW PLAN ---")
        wp = plan.get("workflowPlan", {})
        for step in (wp.get("steps") or []):
            print(f"  Step {step.get('step')}: {step.get('action')}")
            print(f"    API: {step.get('api_needed')}")
            print(f"    Why: {step.get('reasoning', '')[:100]}")
        
        print(f"\n--- AGENT LOGS (Agentic Decision Trail) ---")
        for l in logs:
            tag = "[AGENTIC]" if "[AGENTIC]" in str(l.get("reasoning", "")) else "[STEP]"
            print(f"  {tag} [{l.get('agent')}:{l.get('step')}] {str(l.get('reasoning', ''))[:120]}")
        
        print(f"\n--- RESULTS ---")
        print(f"Total Customers: {plan.get('totalCustomers')}")
        print(f"Segments: {len(plan.get('strategy', {}).get('segments', []))}")
        print(f"Content Variants: {len(plan.get('contentVariants', []))}")
        
        print(f"\n===== AGENTIC TEST PASSED =====")
    else:
        print(f"ERROR: {body.get('error')}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
