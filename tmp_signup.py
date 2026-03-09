import urllib.request
import urllib.error
import json

url = "https://campaignx.inxiteout.ai/api/v1/signup"
data = json.dumps({"team_name": "backlogbandits", "team_email": "backlogbandits07@gmail.com"}).encode()
req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})

try:
    resp = urllib.request.urlopen(req)
    body = resp.read().decode()
    print("SUCCESS:", body)
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print("ERROR STATUS:", e.code)
    print("ERROR BODY:", body)
