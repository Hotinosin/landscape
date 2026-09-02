import { Button, Card } from "@heroui/react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  type RadiusMode,
  type ThemePreference,
  useThemePreferences,
} from "./theme";
import { useI18n } from "./i18n";

const themeOptions: ThemePreference[] = ["system", "light", "dark"];
const radiusOptions: RadiusMode[] = ["sharp", "default", "rounded"];

export function MainLayout() {
  const preferences = useThemePreferences();
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/">Landscape</Link>
        <div className="preference-controls">
          <label>
            Theme
            <select
              aria-label="Theme"
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
              aria-label="Radius"
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
        </div>
      </header>
      <Outlet />
    </div>
  );
}

export function MigrationPending({ routeKey }: { routeKey: string }) {
  const { t } = useI18n();
  return (
    <main className="centered-page">
      <Card className="status-card">
        <Card.Header>
          <Card.Title>{t(routeKey)}</Card.Title>
          <Card.Description>
            This route is preserved and waiting for its React page migration.
          </Card.Description>
        </Card.Header>
      </Card>
    </main>
  );
}

export function LoginPending() {
  const location = useLocation();
  const redirect = (location.state as { redirect?: string } | null)?.redirect;
  return (
    <main className="centered-page">
      <Card className="status-card">
        <Card.Header>
          <Card.Title>Login migration pending</Card.Title>
          <Card.Description>
            {redirect ? `Return target: ${redirect}` : "No return target."}
          </Card.Description>
        </Card.Header>
      </Card>
    </main>
  );
}

export function NotFound() {
  const { t } = useI18n();
  const navigate = useNavigate();
  return (
    <main className="centered-page">
      <Card className="status-card">
        <Card.Header>
          <Card.Title>{t("not_found.not_found_title")}</Card.Title>
          <Card.Description>{t("not_found.not_found_desc")}</Card.Description>
        </Card.Header>
        <Card.Footer>
          <Button onPress={() => navigate("/")}>
            {t("not_found.back_home")}
          </Button>
        </Card.Footer>
      </Card>
    </main>
  );
}
