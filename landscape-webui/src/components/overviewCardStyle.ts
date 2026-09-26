import type { CSSProperties } from "vue";

export const overviewCardStyles = {
  card: {
    "--overview-card-padding": "15px",
    height: "100%",
  },
  header: {
    padding: "var(--overview-card-padding)",
  },
  content: {
    display: "grid",
    gridTemplateRows: "minmax(0, 1fr) auto 80px",
    rowGap: "var(--overview-card-padding)",
    minHeight: 0,
    padding: "0 var(--overview-card-padding) var(--overview-card-padding)",
  },
  primary: {
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
  },
  divider: {
    margin: 0,
  },
  secondary: {
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    overflow: "hidden",
  },
} satisfies Record<string, CSSProperties>;
