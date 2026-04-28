#!/bin/bash
set -euo pipefail

# DABAR weekly video render
# - Picks verse from a 20-entry rotation by ISO week number
# - Renders 3 Remotion compositions
# - Uploads to Supabase Storage bucket dabar-videos
# - Calls register-videos edge function (graceful fallback if not yet deployed)

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REMOTION_DIR="$REPO_ROOT/remotion"
OUT_DIR="$REMOTION_DIR/out"

SUPABASE_URL="https://crkkimoblnrxpszehmkg.supabase.co"
BUCKET="dabar-videos"

log() { printf '[%s] %s\n' "$(date +%H:%M:%S)" "$*"; }

# --- Load env --------------------------------------------------------------
ENV_FILE=""
if [ -f "$REPO_ROOT/.env.local" ]; then
  ENV_FILE="$REPO_ROOT/.env.local"
elif [ -f "$REPO_ROOT/.env" ]; then
  ENV_FILE="$REPO_ROOT/.env"
fi

if [ -z "$ENV_FILE" ]; then
  echo "ERROR: no .env or .env.local found in $REPO_ROOT" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo "ERROR: SUPABASE_SERVICE_ROLE_KEY not set in $ENV_FILE" >&2
  exit 1
fi

# --- Verse rotation --------------------------------------------------------
REFS=(
  "Psalm 46:1" "1 Peter 5:7" "Matthew 11:28" "Psalm 34:18" "Jeremiah 29:11"
  "Romans 8:28" "Isaiah 40:31" "Psalm 23:1" "Micah 6:8" "Colossians 3:13"
  "Proverbs 3:5" "Romans 3:23-24" "Lamentations 3:22-23" "John 10:10" "Philippians 4:7"
  "Psalm 139:14" "Hebrews 11:1" "James 1:5" "Ephesians 2:8-9" "John 15:13"
)
TEXTS=(
  "God is our refuge and strength, an ever-present help in trouble."
  "Cast all your anxiety on him because he cares for you."
  "Come to me, all you who are weary and burdened, and I will give you rest."
  "The Lord is close to the brokenhearted and saves those who are crushed."
  "For I know the plans I have for you — plans to prosper you."
  "And we know that in all things God works for the good of those who love him."
  "But those who hope in the Lord will renew their strength."
  "The Lord is my shepherd, I lack nothing."
  "Act justly and to love mercy and to walk humbly with your God."
  "Forgive as the Lord forgave you."
  "Trust in the Lord with all your heart and lean not on your own understanding."
  "For all have sinned and fall short — and are justified freely by his grace."
  "Great is his faithfulness; his mercies are new every morning."
  "I have come that they may have life, and have it to the full."
  "The peace of God, which transcends all understanding, will guard your hearts."
  "I praise you because I am fearfully and wonderfully made."
  "Now faith is confidence in what we hope for."
  "If any of you lacks wisdom, you should ask God, who gives generously."
  "For it is by grace you have been saved, through faith."
  "Greater love has no one than this: to lay down one's life for one's friends."
)

# --- Pick this week's verse ------------------------------------------------
WEEK_RAW=$(date +%V)
WEEK_NUM=$((10#$WEEK_RAW))
INDEX=$(( (WEEK_NUM - 1) % 20 ))
VERSE_REF="${REFS[$INDEX]}"
VERSE_TEXT="${TEXTS[$INDEX]}"

# Monday of the current ISO week (macOS BSD date)
DOW=$(date +%u)               # 1=Mon ... 7=Sun
OFFSET=$((DOW - 1))
WEEK_START=$(date -v-"${OFFSET}"d +%Y-%m-%d)

log "ISO week $WEEK_NUM → index $INDEX"
log "Verse: $VERSE_REF"
log "Week start: $WEEK_START"

# --- JSON encode helper (handles quotes/backslashes/unicode) ---------------
json_escape() {
  python3 -c 'import json,sys; print(json.dumps(sys.argv[1]))' "$1"
}

VR_JSON=$(json_escape "$VERSE_REF")
VT_JSON=$(json_escape "$VERSE_TEXT")

PROPS_SOCIAL="{\"verseRef\":${VR_JSON},\"verseText\":${VT_JSON},\"reflectionPrompt\":\"What are you carrying into this week?\",\"theme\":\"weekly\"}"
PROPS_WHATSAPP="{\"verseRef\":${VR_JSON},\"verseText\":${VT_JSON},\"theme\":\"weekly\"}"

# --- Render ----------------------------------------------------------------
mkdir -p "$OUT_DIR"
cd "$REMOTION_DIR"

log "Rendering SocialAcquisition..."
npx remotion render SocialAcquisition "$OUT_DIR/social.mp4" --props="$PROPS_SOCIAL"

log "Rendering WhatsAppCard..."
npx remotion render WhatsAppCard "$OUT_DIR/whatsapp.mp4" --props="$PROPS_WHATSAPP"

log "Rendering PastoralTrust..."
npx remotion render PastoralTrust "$OUT_DIR/pastoral.mp4"

# --- Upload to Supabase Storage --------------------------------------------
upload() {
  local local_path="$1" remote_name="$2"
  local remote_path="$WEEK_START/$remote_name"
  log "Uploading $remote_name → $BUCKET/$remote_path"
  curl -fsS -X POST \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: video/mp4" \
    -H "x-upsert: true" \
    --data-binary "@$local_path" \
    "$SUPABASE_URL/storage/v1/object/$BUCKET/$remote_path" >/dev/null
  log "  ok"
}

upload "$OUT_DIR/social.mp4"   "social.mp4"
upload "$OUT_DIR/whatsapp.mp4" "whatsapp.mp4"
upload "$OUT_DIR/pastoral.mp4" "pastoral.mp4"

PUBLIC_BASE="$SUPABASE_URL/storage/v1/object/public/$BUCKET/$WEEK_START"
SOCIAL_URL="$PUBLIC_BASE/social.mp4"
WHATSAPP_URL="$PUBLIC_BASE/whatsapp.mp4"
PASTORAL_URL="$PUBLIC_BASE/pastoral.mp4"

# --- Register (graceful fallback) ------------------------------------------
WS_JSON=$(json_escape "$WEEK_START")
SU_JSON=$(json_escape "$SOCIAL_URL")
WU_JSON=$(json_escape "$WHATSAPP_URL")
PU_JSON=$(json_escape "$PASTORAL_URL")

PAYLOAD="{\"week_start\":${WS_JSON},\"verse_ref\":${VR_JSON},\"verse_text\":${VT_JSON},\"social_url\":${SU_JSON},\"whatsapp_url\":${WU_JSON},\"pastoral_url\":${PU_JSON}}"

RESPONSE_FILE="$(mktemp)"
trap 'rm -f "$RESPONSE_FILE"' EXIT

log "Calling register-videos..."
HTTP_CODE=$(curl -s -o "$RESPONSE_FILE" -w "%{http_code}" -X POST \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "$SUPABASE_URL/functions/v1/register-videos" || echo "000")

case "$HTTP_CODE" in
  200|201|204)
    log "register-videos: OK ($HTTP_CODE)"
    ;;
  404)
    log "WARNING: register-videos not deployed yet (404). Storage uploads completed; skipping registration."
    ;;
  *)
    log "WARNING: register-videos returned $HTTP_CODE. Storage uploads completed; skipping registration."
    log "Response body:"
    cat "$RESPONSE_FILE" || true
    echo
    ;;
esac

log "Done."
log "  Social:    $SOCIAL_URL"
log "  WhatsApp:  $WHATSAPP_URL"
log "  Pastoral:  $PASTORAL_URL"
