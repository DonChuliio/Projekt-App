"""Read-only/rejected anonymous calls; no user credentials, objects or pushes."""
import json
import re
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError
config=(Path(__file__).resolve().parents[1]/'js/config/supabase.js').read_text()
def setting(name):
    return re.search(r'export\s+const\s+'+name+r'\s*=\s*[\'\"]([^\'\"]+)',config)[1]
url,key=setting('SUPABASE_URL'),setting('SUPABASE_KEY')
def call(path,body=None):
    request=Request(url+path,data=json.dumps(body).encode() if body is not None else None,headers={'apikey':key,'Content-Type':'application/json'})
    try:
        with urlopen(request,timeout=20) as response:return response.status
    except HTTPError as error:return error.code
assert call('/rest/v1/planner_reminders?select=id') in (401,403)
assert call('/rest/v1/rpc/due_planner_reminders',{}) in (401,403)
assert call('/functions/v1/swift-processor')==405
assert call('/functions/v1/swift-processor',{})==401
print('PASS: anonymous reminder reads/sender RPC denied; Edge rejects GET and missing cron token. No notifications sent.')
