#!/bin/bash
# Scraping + cleanup loghi per tutte le regioni in sequenza
# Usage: ./scrape_all_regioni.sh

NODE=/Users/Raffaele/.nvm/versions/node/v24.18.0/bin/node
DIR="$(cd "$(dirname "$0")" && pwd)"

REGIONI=(
  Piemonte
  Toscana
  EmiliaRomagna
  Sicilia
  Puglia
  Calabria
  Abruzzo
  AltoAdige
  Basilicata
  FriuliVeneziaGiulia
  Liguria
  Marche
  Molise
  Sardegna
  Trentino
  Umbria
  Veneto
)

for REGIONE in "${REGIONI[@]}"; do
  echo ""
  echo "========================================"
  echo "🚀 $REGIONE"
  echo "========================================"
  $NODE "$DIR/scrape_logos_regione.js" "$REGIONE"
  echo ""
  echo "🧹 Cleanup $REGIONE..."
  REGIONE_LOWER=$(echo "$REGIONE" | tr '[:upper:]' '[:lower:]')
  $NODE "$DIR/cleanup_logos.js" "$REGIONE_LOWER" --apply
  echo "✅ $REGIONE completato"
done

echo ""
echo "🎉 Tutte le regioni completate!"
