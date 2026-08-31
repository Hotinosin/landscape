# Landscape WebUI design system

## Page states

Every data page uses one state at a time: `initial`, `loading`, `ready`, `empty`, or `error`.
Use `resolvePageState` for state derivation and `StandardPageState` for full-page feedback.
Standard tables use `StandardDataTable`, which owns loading, empty, and error presentation.

## Design tokens

Tokens are semantic and must describe intent rather than a component. The groups are:

- canvas and surfaces: page canvas, default, overlay, interactive, alternate, muted and subtle surfaces;
- content: primary, secondary, muted, subtle and inverse text;
- interaction: brand colors and hover feedback;
- boundaries: default, subtle and muted borders;
- status: info, success, warning and danger;
- foundation: typography, spacing, radii, control size, shadows and motion;
- feature-specific: sampling, topology accent and terminal colors only where no general semantic token applies.

Do not add component-named tokens such as `tableColor`, `cardColor`, or `metricPanelColor`.
Map components to an existing semantic surface instead. CSS consumers use the generated
`--app-*` variables; JavaScript consumers read `themeRegistry` tokens.

## Layout rules

- Page outer spacing uses `spacePage`.
- Sections and toolbars use `spaceSection`.
- Controls, surfaces, panels and large containers use their global radius tokens; pages must not redefine radii.
- Standard table headers and cells are left aligned, including action columns.
- Use `space2xs` through `spaceXl` for visual rhythm. Keep literal dimensions only for
  data-driven layout constraints such as table column widths, topology coordinates and icon geometry.
- Use the typography tokens from `fontSizeMicro` through `fontSizeTitle`; feature pages must not
  introduce local body or caption font sizes.
