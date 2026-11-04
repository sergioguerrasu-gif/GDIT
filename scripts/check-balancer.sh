#!/usr/bin/env bash
# Muestra como el ALB reparte las peticiones entre las instancias.
# Uso: ./scripts/check-balancer.sh http://<alb_dns_name> [numero_de_peticiones]
set -euo pipefail

URL="${1:?Uso: $0 http://<alb_dns_name> [peticiones]}"
N="${2:-30}"

echo "Enviando $N peticiones a $URL/health ..."
for _ in $(seq 1 "$N"); do
  curl -s "$URL/health" | sed -E 's/.*"instance":"([^"]+)".*/\1/'
done | sort | uniq -c | sort -rn
