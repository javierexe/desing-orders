#!/usr/bin/env bash
set -euo pipefail

BASE=http://127.0.0.1:8000

echo "=== 1) health ==="
curl -i "$BASE/health" || true

echo "\n=== 2) create order ==="
CREATE_RESP=$(curl -sS -X POST "$BASE/orders" -H "Content-Type: application/json" -d '{"client_name":"PRUEBA","title":"Pedido prueba","delivery_method":"retiro","items":[]}') || true
echo "$CREATE_RESP" | jq . || echo "$CREATE_RESP"
CODE=$(echo "$CREATE_RESP" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d.get("code",""))')
echo "order code: $CODE"

if [ -z "$CODE" ]; then
  echo "No code returned, aborting receipt tests"
  exit 1
fi

echo "\n=== 3) create receipt (simulate uploaded file) ==="
RECEIPT_RESP=$(curl -sS -X POST "$BASE/orders/$CODE/receipts" -H "Content-Type: application/json" -d '{"url":"https://example.com/receipts/test.png","filename":"receipts/test.png","storage_key":"receipts/test.png"}') || true
echo "$RECEIPT_RESP" | jq . || echo "$RECEIPT_RESP"

echo "\n=== 4) list receipts ==="
LIST_RESP=$(curl -sS "$BASE/orders/$CODE/receipts" || true)
echo "$LIST_RESP" | jq . || echo "$LIST_RESP"

ID=$(echo "$LIST_RESP" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d[0]["id"]) if d else print("")')
echo "receipt id: $ID"

if [ -n "$ID" ]; then
  echo "\n=== 5) delete receipt ==="
  HTTP_CODE=$(curl -s -o /dev/stderr -w "%{http_code}" -X DELETE "$BASE/orders/$CODE/receipts/$ID" || true)
  echo "HTTP delete code: $HTTP_CODE"
else
  echo "No receipt id found to delete"
fi

echo "\nAll done."
