#!/bin/bash
# DABAR — Weekly Remotion video render & upload script
# Renders 3 compositions, uploads to Supabase Storage, registers via edge function.
# Run weekly via launchd (com.dabar.render-videos.plist).

set -u
set -o pipefail

# --- Paths ---
PROJECT_ROOT="$HOME/dabarbible"
REMOTION_DIR="$PROJECT_ROOT/remotion"
ENV_FILE="$PROJECT_ROOT/.env.local"
OUT_DIR="$REMOTION_DIR/out"
LOG_PREFIX="[$(date -u +%Y-%m-%dT%H:%M:%SZ)]"

log() { echo "$LOG_PREFIX $*"; }
warn() { echo "$LOG_PREFIX WARNING: $*" >&2; }
fail() { echo "$LOG_PREFIX ERROR: $*" >&2; exit 1; }

# --- Load VIDEO_UPLOAD_SECRET ---
if [ ! -f "$ENV_FILE" ]; then
  fail "$ENV_FILE not found"
fi
# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

if [ -z "${VIDEO_UPLOAD_SECRET:-}" ]; then
  fail "VIDEO_UPLOAD_SECRET missing from $ENV_FILE"
fi

SUPABASE_URL="https://crkkimoblnrxpszehmkg.supabase.co"
UPLOAD_FN_URL="$SUPABASE_URL/functions/v1/upload-video"

# --- Date math ---
# ISO week number (1-53) and Monday of current week (YYYY-MM-DD).
# macOS BSD `date` supports -v for date arithmetic.
WEEK_NUMBER=$(date -u +%V)
DOW=$(date -u +%u)         # 1 (Mon) .. 7 (Sun)
OFFSET=$((DOW - 1))
WEEK_START=$(date -u -v-"${OFFSET}"d +%Y-%m-%d)

log "Week #$WEEK_NUMBER — week_start=$WEEK_START"

# --- Verse rotation (20 entries) ---
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

IDX=$(( (10#$WEEK_NUMBER - 1) % 20 ))
VERSE_REF="${REFS[$IDX]}"
VERSE_TEXT="${TEXTS[$IDX]}"
log "Verse: $VERSE_REF — $VERSE_TEXT"

# --- JSON helper (escape strings for embedding) ---
json_escape() {
  python3 -c 'import json,sys; print(json.dumps(sys.stdin.read().rstrip("\n")))'
}
VERSE_REF_JSON=$(printf '%s' "$VERSE_REF" | json_escape)
VERSE_TEXT_JSON=$(printf '%s' "$VERSE_TEXT" | json_escape)
WEEK_START_JSON="\"$WEEK_START\""

SOCIAL_PROPS="{\"verseRef\":$VERSE_REF_JSON,\"verseText\":$VERSE_TEXT_JSON,\"weekStart\":$WEEK_START_JSON}"
WHATSAPP_PROPS="$SOCIAL_PROPS"

# --- Render ---
mkdir -p "$OUT_DIR"
cd "$REMOTION_DIR" || fail "cannot cd to $REMOTION_DIR"

log "Rendering SocialAcquisition (1080x1920 / 30s)..."
npx remotion render SocialAcquisition out/social.mp4 \
  --props="$SOCIAL_PROPS" --codec=h264 --jpeg-quality=80 --concurrency=2 \
  || fail "SocialAcquisition render failed"

log "Rendering WhatsAppCard (1080x1080 / 15s)..."
npx remotion render WhatsAppCard out/whatsapp.mp4 \
  --props="$WHATSAPP_PROPS" --codec=h264 --jpeg-quality=80 --concurrency=2 \
  || fail "WhatsAppCard render failed"

log "Rendering PastoralTrust (1280x720 / 90s)..."
npx remotion render PastoralTrust out/pastoral.mp4 \
  --codec=h264 --jpeg-quality=80 --concurrency=2 \
  || fail "PastoralTrust render failed"

# --- Upload helper (sends MP4 bytes to upload-video edge function) ---
# Args: <local_file> <video_type> <verse_ref> <verse_text>
# verse_ref/verse_text may be empty for pastoral_trust.
upload_video() {
  local local_file="$1"
  local video_type="$2"
  local v_ref="$3"
  local v_text="$4"
  log "Uploading $local_file as $video_type..."
  local http_code
  http_code=$(curl -sS -o /tmp/dabar-upload.log -w "%{http_code}" \
    -X POST "$UPLOAD_FN_URL" \
    -H "Authorization: Bearer $VIDEO_UPLOAD_SECRET" \
    -H "Content-Type: video/mp4" \
    -H "x-video-type: $video_type" \
    -H "x-week-start: $WEEK_START" \
    -H "x-verse-ref: $v_ref" \
    -H "x-verse-text: $v_text" \
    --data-binary "@$local_file")
  if [ "$http_code" -lt 200 ] || [ "$http_code" -ge 300 ]; then
    cat /tmp/dabar-upload.log >&2 || true
    fail "upload-video failed ($http_code) for $video_type"
  fi
  cat /tmp/dabar-upload.log >&2 || true
  echo >&2
}

upload_video "$OUT_DIR/social.mp4"   "social"         "$VERSE_REF" "$VERSE_TEXT"
upload_video "$OUT_DIR/whatsapp.mp4" "whatsapp_card"  "$VERSE_REF" "$VERSE_TEXT"
upload_video "$OUT_DIR/pastoral.mp4" "pastoral_trust" ""           ""

log "DONE."
exit 0