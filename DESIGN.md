# DESIGN.md — Finanzas (dashboard personal)

Dirección visual congelada para que la UI sea consistente entre pantallas. Es un dashboard
in-app de datos, no una landing: el "wow" lo dan la claridad del dato, el aire y un solo acento,
no la decoración.

## Reference lock (de Refero)
- Referencia primaria de producto: **Monarch Money** (`app.monarchmoney.com/reports/spending`) —
  donut grande de gasto por categoría + panel de stats a la derecha + lista de movimientos abajo,
  sidebar de navegación a la izquierda, mucho aire, sombras sutiles.
- Estilo / lenguaje visual: **Open Collective (Raise)** + **Sequence** — canvas blanco, tipografía
  navy fuerte, un único acento azul usado con disciplina, tarjetas con borde fino y sombra muy
  ligera, sensación editorial y de alta confianza.
- Detalles prestados: de Monarch el layout sidebar + fila de KPIs + donut + lista; de Sequence la
  claridad "blueprint" (líneas finas, superficies casi blancas, cero ruido).

## Tema y atmósfera
Claro, editorial, de alta confianza. Producto financiero serio y legible de un vistazo. Sobrio,
no expresivo. Nada de gradientes morados ni glow.

## Paleta (roles semánticos, no solo hex). Toma los tokens de Vértice.
- Fondo / superficies: blanco `#ffffff`; bandas/superficies suaves `#f6f8fb`.
- Texto (fuerte / suave / tenue): navy `#16203a` / `#5b6678` / `#8a94a6`.
- Acento (marca, foco, links, barra activa): azul `#2456e6`; hover `#1b46c9`; realce suave `#eef3fd`.
  Un solo acento, con disciplina.
- Bordes / líneas: hairline `#e7ecf4`.
- Estados (éxito / aviso / error): entra/ingreso verde `#0f9d58`; aviso ámbar `#e8a33d`; alerta real
  (sobregasto) rojo `#d23f3f` (no para cada gasto, solo alertas).
- Paleta de categorías (donut/leyenda), sobria y distinguible: azul `#2456e6`, teal `#0fa3a3`,
  verde `#0f9d58`, ámbar `#e8a33d`, coral `#e8694a`, violeta `#7a5af0`, rosa `#d4548a`,
  pizarra `#64748b`. Una categoría = un color estable en todo el dashboard.

## Tipografía
- Display / títulos: **Space Grotesk**, `tracking-tight`, escala grande para titulares y montos.
- Cuerpo: **Inter**.
- Escala y pesos: titulares grandes y firmes; etiquetas tenues en mayúscula corta.
- Números (tabulares): montos con tabular-nums para que alineen en columnas.

## Componentes
- Botones: primario azul sólido; secundario outline hairline; ghost para acciones menores.
- Inputs / formularios: borde hairline, foco azul; selects de categoría compactos en la tabla de revisión.
- Cards / contenedores: superficie blanca, borde hairline, sombra mínima. KPI card = label tenue
  arriba, monto display navy grande, delta vs mes anterior en verde/rojo. Sin "bordecitos" decorativos.
- Navegación: sidebar fija (Dashboard, Movimientos, Importar, Deudas, Categorías); ruta activa en azul.

## Layout y espaciado
- Sidebar izquierda + contenido a la derecha, ancho contenido y buen aire.
- Dashboard: fila de KPIs (Ingresos, Gastos, Balance, Saldo final) → dos columnas (donut de gasto por
  categoría + leyenda / área de cashflow) → lista de movimientos recientes color-coded.
- Densidad: aireado en el dashboard; compacto en la tabla de revisión del import.
- Cajitas (apartados) NUNCA entran en los KPIs de flujo; si se muestran, en su propia tarjeta.

## Motion
- Solo **Motion** (`motion/react`). Entradas suaves de KPIs y del donut/área al montar; números que
  cuentan hacia su valor. Con propósito, respetando `prefers-reduced-motion`. Nada gratuito.

## Guardrails (qué NO hacer)
- Un solo acento azul; verde solo para dinero que entra; rojo solo para alertas reales.
- Sin gradientes, sin sombras pesadas, sin tarjetas dentro de tarjetas dentro de tarjetas.
- Copy factual en español, sin AI-slop, sin em-dashes. Datos reales del estado de cuenta, nunca inventados.
- Claridad de un vistazo por encima de densidad. Cada vista nace con loading / empty / error.

## Responsive
- Desktop: sidebar + grid de 2 columnas en el dashboard.
- Móvil: una columna; sidebar colapsa a barra superior; donut y área a ancho completo, KPIs en 2x2.
