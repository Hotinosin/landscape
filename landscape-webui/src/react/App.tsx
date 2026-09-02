import { Button, Card } from "@heroui/react";
import {
  type RadiusMode,
  type ThemePreference,
  useThemePreferences,
} from "./theme";

const themeOptions: ThemePreference[] = ["system", "light", "dark"];
const radiusOptions: RadiusMode[] = ["sharp", "default", "rounded"];

export default function App() {
  const preferences = useThemePreferences();

  return (
    <main className="shell">
      <Card className="shell-card">
        <Card.Header>
          <Card.Title>Landscape React shell</Card.Title>
          <Card.Description>
            React 19, Tailwind CSS v4 and HeroUI v3 are ready without replacing
            the Vue application.
          </Card.Description>
        </Card.Header>
        <Card.Content className="controls">
          <label>
            Theme
            <select
              value={preferences.theme}
              onChange={(event) =>
                preferences.setTheme(event.target.value as ThemePreference)
              }
            >
              {themeOptions.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            Radius
            <select
              value={preferences.radius}
              onChange={(event) =>
                preferences.setRadius(event.target.value as RadiusMode)
              }
            >
              {radiusOptions.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        </Card.Content>
        <Card.Footer className="preview-actions">
          <Button variant="primary">HeroUI button</Button>
          <a href="#theme-preview">HeroUI link color</a>
          <input aria-label="Field radius preview" placeholder="Field radius" />
        </Card.Footer>
      </Card>
    </main>
  );
}
