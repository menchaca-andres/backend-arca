# Portal de arquitectura ARCA

Portal estático para consultar la arquitectura, los microservicios y los diagramas del Sistema de Gestión Humana.

## Contenido

- `index.html`: estructura del portal y secciones de arquitectura, microservicios y estado.
- `styles.css`: estilos responsive, tarjetas, tablas y visor modal.
- `diagrams-data.js`: metadatos de módulos y diagramas en PlantUML.
- `script.js`: navegación, render de diagramas, zoom/pan, descarga y visor de imágenes.
- `images/`: C4 renderizados reutilizados de `docs/c4/rendered/`.

## Abrir el portal

Desde `backend-arca`:

```bash
python3 -m http.server 8099 --directory docs/portal
```

Abrir `http://localhost:8099`.

No requiere build ni dependencias locales. Los diagramas se renderizan con el servidor público de PlantUML; las imágenes C4 se sirven localmente.

## Actualizar diagramas

Los diagramas viven en `diagrams-data.js`. Cada módulo tiene siete tipos:

`casos-uso`, `clases`, `secuencia`, `actividades`, `procesos`, `er`, `despliegue`.

Para agregar un módulo:

1. Agregar la entrada en `modulesData`.
2. Agregar sus diagramas en `diagramsData`.
3. Agregar el enlace en la sección `Módulos` de `index.html`.

## Verificación

El portal se sirve como archivos estáticos. Para comprobar que los archivos y las imágenes existen:

```bash
python3 -m http.server 8099 --directory docs/portal
curl -I http://localhost:8099/
curl -I http://localhost:8099/images/c4-nivel2-contenedores.png
```

La validación de sintaxis de los diagramas se hizo contra el servidor de PlantUML: los 40 diagramas del portal responden con SVG válido.
