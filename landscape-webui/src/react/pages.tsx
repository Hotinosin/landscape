import { Button, Card } from "@heroui/react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "./i18n";

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
