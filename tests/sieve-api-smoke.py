"""Read-only / rejected-request checks using only the existing public frontend key."""
import json
import re
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError

config = (Path(__file__).resolve().parents[1] / "js/config/supabase.js").read_text()
def setting(name):
    return re.search(r"export\s+const\s+" + name + r"\s*=\s*['\"]([^'\"]+)['\"]", config)[1]
url, key = setting("SUPABASE_URL"), setting("SUPABASE_KEY")
def rpc(name, args):
    request = Request(url + "/rest/v1/rpc/" + name, data=json.dumps(args).encode(),
        headers={"apikey": key, "Content-Type": "application/json", "Cache-Control": "no-store"})
    try:
        with urlopen(request, timeout=20) as response:
            return response.status, json.load(response)
    except HTTPError as error:
        return error.code, json.loads(error.read())

token, entity_id = "0" * 64, "00000000-0000-0000-0000-000000000000"
status, body = rpc("sieve_status", {"p_token": token})
assert status == 200 and body == {"state": "unavailable"}, (status, body)
status, body = rpc("sieve_player", {"p_token": token, "p_secret": token})
assert status == 200 and body is None, (status, body)
for name, args in [
    ("sieve_word", {"p_token": token, "p_turn": entity_id, "p_number": 1, "p_secret": token}),
    ("sieve_claim", {"p_token": token, "p_player": entity_id, "p_secret": token}),
    ("sieve_action", {"p_token": token, "p_operation": entity_id, "p_secret": token, "p_action": "solve", "p_data": {}}),
    ("sieve_manage", {"p_action": "list", "p_game": None, "p_data": {}})
]:
    status, body = rpc(name, args)
    assert 400 <= status < 500, (name, status, body)
print("PASS: real HTTP unavailable status/player; invalid word/claim/action and anonymous admin denied. No fixtures created.")
