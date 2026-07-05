#!/usr/bin/env bash
# Prepare an OSM extract for OSRM. Default: Dolnośląskie (Wrocław region) — small
# and fast, and covers the routable demo (viewing routes are planned around
# Wrocław). Listings outside it (Warsaw, Kraków, Gdańsk…) fall back to
# straight-line ETAs flagged as `degraded` in the route plan. To route all of
# Poland with real roads, set REGION_URL/REGION_BASE to poland-latest — note that
# needs ~30GB free disk and ~8GB RAM for the MLD pipeline.
# Runs the MLD pipeline: extract -> partition -> customize.
set -euo pipefail

DATA_DIR="$(cd "$(dirname "$0")/.." && pwd)/osrm/data"
PBF_URL="${REGION_URL:-https://download.geofabrik.de/europe/poland/dolnoslaskie-latest.osm.pbf}"
BASE="${REGION_BASE:-dolnoslaskie-latest}"
PBF="$BASE.osm.pbf"
IMG="osrm/osrm-backend:latest"

mkdir -p "$DATA_DIR"
cd "$DATA_DIR"

if [ ! -f "$PBF" ]; then
  echo "[osrm] downloading $PBF_URL"
  curl -L -o "$PBF" "$PBF_URL"
fi

echo "[osrm] extract"
docker run --rm -v "$PWD:/data" "$IMG" osrm-extract -p /opt/car.lua "/data/$PBF"
echo "[osrm] partition"
docker run --rm -v "$PWD:/data" "$IMG" osrm-partition "/data/$BASE.osrm"
echo "[osrm] customize"
docker run --rm -v "$PWD:/data" "$IMG" osrm-customize "/data/$BASE.osrm"

echo "[osrm] done — $BASE.osrm ready in $DATA_DIR"
