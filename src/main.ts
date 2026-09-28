import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import "./style.css";

const HOME = Cesium.Rectangle.fromDegrees(-2.615, 39.93, -2.58, 39.96);
const CENTER = Cesium.Cartesian3.fromDegrees(-2.598374, 39.945842, 5000);
const DATA_URL = "/data/palomares.geojson";

type Layer = "building" | "road" | "landuse" | "place";

type FeatureProperties = {
  category?: string;
  name?: string;
  height?: number;
  height_estimated?: boolean;
  highway?: string;
  landuse?: string;
  leisure?: string;
  natural?: string;
  amenity?: string;
  tourism?: string;
  place?: string;
};

function getProperties(entity: Cesium.Entity): FeatureProperties {
  const values = entity.properties?.getValue(Cesium.JulianDate.now()) as FeatureProperties | undefined;
  return values ?? {};
}

function categoryLabel(properties: FeatureProperties): string {
  switch (properties.category) {
    case "building":
      return "Edificio";
    case "road":
      return "Vía";
    case "landuse":
      return "Zona";
    case "place":
      return "Lugar";
    default:
      return "Elemento";
  }
}

function createViewer(terrainProvider: Cesium.TerrainProvider): Cesium.Viewer {
  const viewer = new Cesium.Viewer("cesiumContainer", {
    terrainProvider,
    animation: false,
    timeline: false,
    baseLayer: false,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
    shadows: false,
  });
  viewer.imageryLayers.addImageryProvider(
    new Cesium.UrlTemplateImageryProvider({
      url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      credit: new Cesium.Credit("© OpenStreetMap contributors"),
      maximumLevel: 19,
    }),
  );
  return viewer;
}

function styleEntities(dataSource: Cesium.GeoJsonDataSource): void {
  for (const entity of dataSource.entities.values) {
    const properties = getProperties(entity);
    const category = properties.category;

    if (category === "building" && entity.polygon) {
      const height = Number(properties.height ?? 6);
      entity.polygon.height = new Cesium.ConstantProperty(0);
      entity.polygon.extrudedHeight = new Cesium.ConstantProperty(height);
      entity.polygon.material = new Cesium.ColorMaterialProperty(
        properties.height_estimated
          ? Cesium.Color.fromCssColorString("#d7b08a").withAlpha(0.92)
          : Cesium.Color.fromCssColorString("#e9c9a5").withAlpha(0.95),
      );
      entity.polygon.outline = new Cesium.ConstantProperty(true);
      entity.polygon.outlineColor = new Cesium.ConstantProperty(
        Cesium.Color.fromCssColorString("#9a6d46"),
      );
    } else if (category === "landuse" && entity.polygon) {
      entity.polygon.material = new Cesium.ColorMaterialProperty(
        Cesium.Color.fromCssColorString("#7b9e72").withAlpha(0.22),
      );
      entity.polygon.outline = new Cesium.ConstantProperty(false);
    } else if (category === "road" && entity.polyline) {
      const highway = properties.highway ?? "";
      const color = highway === "primary" || highway === "secondary" ? "#f0b44d" : "#f7e7c5";
      entity.polyline.width = new Cesium.ConstantProperty(
        highway === "primary" || highway === "secondary" ? 5 : 3,
      );
      entity.polyline.material = new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.05,
        color: Cesium.Color.fromCssColorString(color).withAlpha(0.95),
      });
      entity.polyline.clampToGround = new Cesium.ConstantProperty(true);
    } else if (category === "place" && entity.position) {
      entity.point = new Cesium.PointGraphics({
        pixelSize: 9,
        color: Cesium.Color.fromCssColorString("#55d6be"),
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      });
      if (properties.name) {
        entity.label = new Cesium.LabelGraphics({
          text: properties.name,
          font: "600 13px system-ui, sans-serif",
          fillColor: Cesium.Color.WHITE,
          showBackground: true,
          backgroundColor: Cesium.Color.fromCssColorString("#102236").withAlpha(0.86),
          backgroundPadding: new Cesium.Cartesian2(7, 5),
          pixelOffset: new Cesium.Cartesian2(0, -18),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        });
      }
    }

    entity.description = new Cesium.ConstantProperty(
      `<strong>${properties.name || categoryLabel(properties)}</strong>`,
    );
    entity.show = true;
  }
}

function setupLayerControls(viewer: Cesium.Viewer, dataSource: Cesium.GeoJsonDataSource): void {
  const controls: Array<[string, Layer]> = [
    ["toggle-buildings", "building"],
    ["toggle-roads", "road"],
    ["toggle-landuse", "landuse"],
    ["toggle-places", "place"],
  ];

  for (const [id, layer] of controls) {
    const input = document.getElementById(id) as HTMLInputElement | null;
    input?.addEventListener("change", () => {
      for (const entity of dataSource.entities.values) {
        if (getProperties(entity).category === layer) entity.show = input.checked;
      }
    });
  }

  document.getElementById("home-button")?.addEventListener("click", () => {
    void viewer.camera.flyTo({ destination: HOME, duration: 1.4 });
  });
}

function setupSelection(viewer: Cesium.Viewer): void {
  const content = document.getElementById("selected-content");
  viewer.selectedEntityChanged.addEventListener((entity) => {
    if (!content) return;
    if (!entity) {
      content.className = "selected-content muted";
      content.textContent = "Haz clic en un edificio, calle o lugar.";
      return;
    }

    const properties = getProperties(entity);
    const title = properties.name || categoryLabel(properties);
    const details: string[] = [categoryLabel(properties)];
    if (properties.height) {
      details.push(`${properties.height.toFixed(1)} m${properties.height_estimated ? " (estimados)" : ""}`);
    }
    if (properties.highway) details.push(properties.highway);
    if (properties.amenity) details.push(properties.amenity);

    content.className = "selected-content";
    content.innerHTML = `<strong>${title}</strong><span>${details.join(" · ")}</span>`;
  });
}

function updateStats(dataSource: Cesium.GeoJsonDataSource): void {
  const stats = document.getElementById("stats");
  if (!stats) return;
  const counts = new Map<string, number>();
  for (const entity of dataSource.entities.values) {
    const category = categoryLabel(getProperties(entity));
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  stats.innerHTML = [...counts.entries()]
    .map(([label, count]) => `<dt>${label}</dt><dd>${count}</dd>`)
    .join("");
}

async function init(): Promise<void> {
  const status = document.getElementById("data-status");
  const ionToken = import.meta.env.VITE_CESIUM_ION_TOKEN;
  let terrainProvider: Cesium.TerrainProvider = new Cesium.EllipsoidTerrainProvider();

  if (ionToken) {
    Cesium.Ion.defaultAccessToken = ionToken;
    terrainProvider = await Cesium.createWorldTerrainAsync();
  }

  const viewer = createViewer(terrainProvider);
  viewer.scene.globe.depthTestAgainstTerrain = false;
  viewer.camera.setView({ destination: CENTER });
  setupSelection(viewer);

  try {
    const dataSource = await Cesium.GeoJsonDataSource.load(DATA_URL, {
      clampToGround: false,
      stroke: Cesium.Color.WHITE,
      fill: Cesium.Color.WHITE.withAlpha(0.8),
      strokeWidth: 1,
    });
    viewer.dataSources.add(dataSource);
    styleEntities(dataSource);
    setupLayerControls(viewer, dataSource);
    updateStats(dataSource);
    void viewer.camera.flyTo({ destination: HOME, duration: 1.1 });
    if (status) {
      status.textContent = "Datos OSM cargados";
      status.classList.add("ready");
    }
  } catch (error) {
    console.error(error);
    if (status) {
      status.textContent = "No se pudieron cargar los datos";
      status.classList.add("error");
    }
  }
}

void init();
