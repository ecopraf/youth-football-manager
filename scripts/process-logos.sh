#!/bin/bash
# =============================================================================
# process-logos.sh — Processa loghi club per frontend-v2/public/logos/
# =============================================================================
#
# UTILIZZO:
#   ./scripts/process-logos.sh                    # batch: processa tutti i PNG in logos/ che non sono 100x100 o >8KB
#   ./scripts/process-logos.sh <file.jpg|png>     # singolo file (JPG o PNG) → slug.png in logos/
#   ./scripts/process-logos.sh --from-staging     # processa tutti i file in STAGING_DIR
#
# STAGING DIR (cartella di appoggio per nuovi loghi):
#   /Users/Raffaele/Documents/Youth-Foorball-Manager/Loghi Società Affiliate/
#
# DIPENDENZE: ImageMagick (magick), pngquant
#   brew install imagemagick pngquant
#
# OUTPUT: PNG fit 100x100 (proporzioni mantenute), sfondo bianco rimosso,
#         ottimizzato con pngquant, target <6KB
# =============================================================================

set -e

LOGOS_DIR="$(cd "$(dirname "$0")/.." && pwd)/frontend-v2/public/logos"
STAGING_DIR="/Users/Raffaele/Documents/Youth-Foorball-Manager/Loghi Società Affiliate"
QUALITY="65-80"
FUZZ="10%"
MAX_SIZE_BYTES=8192

command -v magick >/dev/null 2>&1 || { echo "❌ ImageMagick non trovato. Installa con: brew install imagemagick"; exit 1; }
command -v pngquant >/dev/null 2>&1 || { echo "❌ pngquant non trovato. Installa con: brew install pngquant"; exit 1; }

# Converte nome file in slug kebab-case (es. "ASD Sapri Soccer.jpg" → "asd-sapri-soccer")
slugify() {
  echo "$1" | sed 's/\.[^.]*$//' | tr '[:upper:]' '[:lower:]' \
    | iconv -f utf-8 -t ascii//TRANSLIT 2>/dev/null \
    | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//'
}

process_file() {
  local input="$1"
  local output="$2"
  local label="${3:-$(basename "$input")}"

  echo -n "  $label → $(basename "$output") ... "

  magick "$input" -resize 100x100 -fuzz "$FUZZ" -transparent white /tmp/yfm_logo_tmp.png 2>/dev/null

  if ! pngquant --quality="$QUALITY" --force --output "$output" /tmp/yfm_logo_tmp.png 2>/dev/null; then
    cp /tmp/yfm_logo_tmp.png "$output"
  fi

  # Secondo passaggio se ancora troppo grande
  local size
  size=$(stat -f%z "$output")
  if [[ $size -gt $MAX_SIZE_BYTES ]]; then
    magick "$output" -colors 128 /tmp/yfm_logo_tmp2.png 2>/dev/null
    pngquant --quality=50-70 --force --output "$output" /tmp/yfm_logo_tmp2.png 2>/dev/null || true
    size=$(stat -f%z "$output")
  fi

  local dims
  dims=$(magick "$output" -format "%wx%h" info: 2>/dev/null)
  echo "✅ ${dims}px, $(( size / 1024 ))KB"
}

# ── Modalità: singolo file ──────────────────────────────────────────────────
if [[ $# -eq 1 && "$1" != "--from-staging" ]]; then
  input="$1"
  [[ ! -f "$input" ]] && { echo "❌ File non trovato: $input"; exit 1; }
  slug=$(slugify "$(basename "$input")")
  output="$LOGOS_DIR/${slug}.png"
  echo "🖼  Singolo file → ${slug}.png"
  process_file "$input" "$output" "$(basename "$input")"
  echo ""
  echo "📁 Salvato in: $output"
  echo "⚠️  Verifica visivamente prima del commit."
  exit 0
fi

# ── Modalità: staging dir ───────────────────────────────────────────────────
if [[ "$1" == "--from-staging" ]]; then
  echo "📂 Staging: $STAGING_DIR"
  shopt -s nullglob
  files=("$STAGING_DIR"/*.jpg "$STAGING_DIR"/*.jpeg "$STAGING_DIR"/*.png \
         "$STAGING_DIR"/*.JPG "$STAGING_DIR"/*.JPEG "$STAGING_DIR"/*.PNG)
  [[ ${#files[@]} -eq 0 ]] && { echo "ℹ️  Nessun file trovato in staging dir."; exit 0; }
  echo "  ${#files[@]} file trovati:"
  for input in "${files[@]}"; do
    slug=$(slugify "$(basename "$input")")
    output="$LOGOS_DIR/${slug}.png"
    process_file "$input" "$output" "$(basename "$input")"
  done
  echo ""
  echo "✅ Completato. Verifica visivamente i loghi prima del commit."
  echo "   git add frontend-v2/public/logos/ && git commit -m 'feat: aggiungi loghi club'"
  exit 0
fi

# ── Modalità: batch su tutti i PNG esistenti ────────────────────────────────
echo "🔄 Batch: $LOGOS_DIR"
echo "   Criteri: dimensioni != 100x100 OPPURE size > $(( MAX_SIZE_BYTES / 1024 ))KB"
echo ""
count=0
for f in "$LOGOS_DIR"/*.png; do
  dims=$(magick "$f" -format "%wx%h" info: 2>/dev/null)
  size=$(stat -f%z "$f")
  if [[ "$dims" != "100x100" ]] || [[ $size -gt $MAX_SIZE_BYTES ]]; then
    process_file "$f" "$f" "$(basename "$f") (${dims}, $(( size/1024 ))KB)"
    (( count++ )) || true
  fi
done
echo ""
echo "✅ $count file processati."
total=$(ls "$LOGOS_DIR"/*.png | xargs stat -f%z | awk '{s+=$1} END {printf "%.0f", s/1024}')
echo "   Totale cartella PNG: ${total}KB"
