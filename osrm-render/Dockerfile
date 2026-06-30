# Self-hosted OSRM for Render (Greater London, MLD).
# Multi-stage: download the extract with a curl image (the osrm base image's
# apt repos are EOL, so we avoid apt entirely), then process + serve.
# Override REGION_URL to use another area.

FROM curlimages/curl:latest AS fetch
ARG REGION_URL=https://download.geofabrik.de/europe/united-kingdom/england/greater-london-latest.osm.pbf
RUN curl -L -o /tmp/region.osm.pbf "$REGION_URL"

FROM osrm/osrm-backend:latest
WORKDIR /data
COPY --from=fetch /tmp/region.osm.pbf /data/region.osm.pbf
RUN osrm-extract -p /opt/car.lua /data/region.osm.pbf \
  && osrm-partition /data/region.osrm \
  && osrm-customize /data/region.osrm \
  && rm -f /data/region.osm.pbf

# Render provides $PORT; bind to it (default 5000 for local docker run).
ENTRYPOINT []
EXPOSE 5000
CMD ["/bin/sh", "-c", "osrm-routed --algorithm mld /data/region.osrm -i 0.0.0.0 -p ${PORT:-5000}"]
