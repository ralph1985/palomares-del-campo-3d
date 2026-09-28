# Palomares del Campo 3D

Visor 3D navegable de Palomares del Campo (Cuenca), construido con CesiumJS y una base cartográfica de OpenStreetMap.

## Qué incluye

- Globo 3D centrado en Palomares del Campo.
- Edificios extruidos a partir de las huellas de OSM.
- Alturas tomadas de `height` o `building:levels` cuando existen; en el resto se usa una estimación de 6 metros.
- Calles, caminos, usos del suelo y lugares con nombre.
- Controles de visibilidad por capa.
- Selección de entidades con información básica.
- Mapa base de OpenStreetMap sin necesidad de token.
- Soporte opcional para Cesium World Terrain mediante `VITE_CESIUM_ION_TOKEN`.

## Arranque

Requisitos: Node.js 22 o compatible y Python 3.

```bash
npm install
npm run dev
```

Después abre la URL que indique Vite, normalmente `http://localhost:5173`.

Para generar una compilación de producción:

```bash
npm run build
npm run preview
```

## Terreno mundial opcional

Copia `.env.example` como `.env.local` y añade un token de Cesium ion. Si no se configura, la aplicación usa un elipsoide terrestre y sigue siendo completamente navegable.

## Datos y licencia

La base de datos procede de OpenStreetMap. La aplicación mantiene la atribución visible a OpenStreetMap contributors. Consulta la ODbL antes de redistribuir una base derivada o desplegarla con datos adicionales.

Esta primera versión es una base cartográfica volumétrica. No incluye fachadas, texturas, interiores ni fotogrametría. Esos elementos se pueden incorporar posteriormente como modelos glTF/GLB o 3D Tiles.
