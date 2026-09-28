#!/usr/bin/env python3
"""Convert the bounded OpenStreetMap XML export into display-ready GeoJSON."""

from __future__ import annotations

import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "palomares.osm"
TARGET = ROOT / "public" / "data" / "palomares.geojson"
HEIGHT_RE = re.compile(r"[-+]?\d+(?:[.,]\d+)?")


def parse_number(value: str | None) -> float | None:
    if not value:
        return None
    match = HEIGHT_RE.search(value.replace(",", "."))
    return float(match.group()) if match else None


def tags_for(element: ET.Element) -> dict[str, str]:
    return {
        tag.attrib["k"]: tag.attrib.get("v", "")
        for tag in element.findall("tag")
    }


def height_for(tags: dict[str, str]) -> tuple[float, bool]:
    height = parse_number(tags.get("height"))
    if height is not None:
        return max(height, 2.5), False
    levels = parse_number(tags.get("building:levels"))
    if levels is not None:
        return max(levels * 3.0, 3.0), False
    return 6.0, True


def properties_for(tags: dict[str, str], category: str) -> dict[str, object]:
    properties: dict[str, object] = {
        "category": category,
        "name": tags.get("name", ""),
    }
    for key in ("building", "building:levels", "highway", "ref", "surface", "landuse", "leisure", "natural", "amenity", "tourism", "place"):
        if key in tags:
            properties[key.replace(":", "_")] = tags[key]
    if category == "building":
        height, estimated = height_for(tags)
        properties["height"] = height
        properties["height_estimated"] = estimated
    return properties


def feature(feature_id: str, geometry: dict[str, object], properties: dict[str, object]) -> dict[str, object]:
    return {
        "type": "Feature",
        "id": feature_id,
        "geometry": geometry,
        "properties": properties,
    }


def main() -> None:
    root = ET.parse(SOURCE).getroot()
    nodes: dict[str, tuple[float, float]] = {}
    node_tags: list[tuple[str, tuple[float, float], dict[str, str]]] = []

    for element in root:
        if element.tag != "node":
            continue
        node_id = element.attrib["id"]
        position = (float(element.attrib["lon"]), float(element.attrib["lat"]))
        nodes[node_id] = position
        tags = tags_for(element)
        if tags and any(key in tags for key in ("name", "place", "amenity", "tourism", "historic")):
            node_tags.append((node_id, position, tags))

    features: list[dict[str, object]] = []
    counts: dict[str, int] = {}
    polygon_tags = ("building", "landuse", "leisure", "natural", "amenity")

    for element in root:
        if element.tag != "way":
            continue
        tags = tags_for(element)
        if not tags:
            continue
        coordinates = [nodes[ref.attrib["ref"]] for ref in element.findall("nd") if ref.attrib["ref"] in nodes]
        if len(coordinates) < 2:
            continue
        way_id = element.attrib["id"]
        is_closed = len(coordinates) >= 4 and coordinates[0] == coordinates[-1]

        if "building" in tags and is_closed:
            category = "building"
            geometry = {"type": "Polygon", "coordinates": [[list(point) for point in coordinates]]}
        elif "highway" in tags:
            category = "road"
            geometry = {"type": "LineString", "coordinates": [list(point) for point in coordinates]}
        elif any(key in tags for key in polygon_tags) and is_closed:
            category = "landuse"
            geometry = {"type": "Polygon", "coordinates": [[list(point) for point in coordinates]]}
        elif "waterway" in tags:
            category = "water"
            geometry = {"type": "LineString", "coordinates": [list(point) for point in coordinates]}
        else:
            continue

        features.append(feature(f"way/{way_id}", geometry, properties_for(tags, category)))
        counts[category] = counts.get(category, 0) + 1

    for node_id, position, tags in node_tags:
        category = "place"
        if "amenity" in tags or "tourism" in tags or "historic" in tags:
            category = "place"
        geometry = {"type": "Point", "coordinates": list(position)}
        features.append(feature(f"node/{node_id}", geometry, properties_for(tags, category)))
        counts[category] = counts.get(category, 0) + 1

    collection = {
        "type": "FeatureCollection",
        "name": "Palomares del Campo",
        "source": "OpenStreetMap",
        "license": "ODbL 1.0",
        "features": features,
    }
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(json.dumps(collection, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Generated {TARGET.relative_to(ROOT)}: {len(features)} features ({counts})")


if __name__ == "__main__":
    main()
