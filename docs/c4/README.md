# Diagramas C4

Los diagramas fuente están en este directorio (`.puml`, PlantUML + librería C4).
Las imágenes renderizadas para el Directorio están en [`rendered/`](rendered/):

- `C4_Nivel1_Contexto.png`
- `C4_Nivel2_Contenedores.png`
- `C4_Nivel3_ms_personal.png`
- `C4_Nivel3_ms_boletas.png`

## Regenerar

```bash
curl -L -o /tmp/plantuml.jar https://github.com/plantuml/plantuml/releases/latest/download/plantuml.jar
java -jar /tmp/plantuml.jar -tpng -o "$(pwd)/rendered" *.puml
```

Se necesita Java 17 o superior. Si PlantUML no encuentra Graphviz, usa su motor interno; para un layout más prolijo conviene instalar Graphviz (`brew install graphviz`).
