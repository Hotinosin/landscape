import { useRef, useState, type FormEvent } from "react";
import {
  Alert,
  Button,
  Card,
  FieldError,
  Form,
  Input,
  Label,
  TextField,
  toast,
} from "@heroui/react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import type { LoginInfo } from "@landscape-router/types/api/schemas";
import { do_login } from "@/api/auth";
import type { ApiError } from "@/api";
import {
  clearLandscapeSession,
  LANDSCAPE_TOKEN_KEY,
  saveLandscapeSession,
} from "@/lib/session";
import { useI18n } from "./i18n";

export function safeLoginRedirect(value: unknown): string {
  if (typeof value !== "string") return "/";
  try {
    const target = new URL(value, location.origin);
    if (target.origin !== location.origin || target.pathname === "/login") {
      return "/";
    }
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return "/";
  }
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const submitting = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const redirect = safeLoginRedirect(
    (location.state as { redirect?: unknown } | null)?.redirect,
  );

  if (localStorage.getItem(LANDSCAPE_TOKEN_KEY)) {
    return <Navigate to={redirect} replace state={null} />;
  }

  const errorMessage = (reason: unknown) => {
    const apiError = reason as ApiError;
    const key = apiError?.error_id ? `errors.${apiError.error_id}` : "";
    const translated = key ? t(key, apiError.args) : "";
    return translated && translated !== key
      ? translated
      : t("common.load_failed");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    setError("");
    clearLandscapeSession();

    const form = new FormData(event.currentTarget);
    const credentials: LoginInfo = {
      username: String(form.get("username") ?? ""),
      password: String(form.get("password") ?? ""),
    };

    try {
      const result = await do_login(credentials, { silent: true });
      if (!result.success || !result.token) {
        throw { message: "Login failed" } satisfies ApiError;
      }
      saveLandscapeSession(result.token, credentials.username);
      toast.success(t("config.welcome", { username: credentials.username }));
      navigate(redirect, { replace: true, state: null });
    } catch (reason) {
      const message = errorMessage(reason);
      setError(message);
      toast.danger(message);
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-background" aria-hidden="true" />
      <div className="login-mask" aria-hidden="true" />
      <main className="login-content">
        <Card className="login-card">
          <Card.Header className="login-brand">
            <Card.Title>Landscape</Card.Title>
            <Card.Description>Router</Card.Description>
          </Card.Header>
          <Card.Content>
            <h1 className="login-title">{t("common.login")}</h1>
            <Form
              aria-label={t("common.login")}
              className="login-form"
              onSubmit={submit}
            >
              {error ? (
                <Alert status="danger" role="alert">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>{error}</Alert.Description>
                  </Alert.Content>
                </Alert>
              ) : null}
              <TextField
                fullWidth
                isDisabled={loading}
                isRequired
                name="username"
              >
                <Label>{t("common.username")}</Label>
                <Input autoComplete="username" autoFocus />
                <FieldError />
              </TextField>
              <TextField
                fullWidth
                isDisabled={loading}
                isRequired
                name="password"
                type="password"
              >
                <Label>{t("common.password")}</Label>
                <Input autoComplete="current-password" />
                <FieldError />
              </TextField>
              <Button
                aria-busy={loading}
                fullWidth
                isDisabled={loading}
                type="submit"
              >
                {loading ? (
                  <span className="login-spinner" aria-hidden />
                ) : null}
                {t("common.login")}
              </Button>
            </Form>
          </Card.Content>
        </Card>
      </main>
      <footer className="login-footer">
        <a
          href="https://github.com/ThisSeanZhang/landscape"
          rel="noopener noreferrer"
          target="_blank"
        >
          {t("about.license_project_name")}
        </a>{" "}
        {t("about.license_text")}{" "}
        <a
          href="https://github.com/ThisSeanZhang/landscape/blob/main/LICENSE"
          rel="noopener noreferrer"
          target="_blank"
        >
          {t("about.license_name")}
        </a>
      </footer>
    </div>
  );
}
