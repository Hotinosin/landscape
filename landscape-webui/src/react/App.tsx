import { useEffect, useRef } from "react";
import { Toast, toast } from "@heroui/react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { getUiConfigFast } from "@landscape-router/types/api/system-config/system-config";
import { API_ERROR_EVENT, type ApiError, UNAUTHORIZED_EVENT } from "@/api";
import { LANDSCAPE_TOKEN_KEY } from "@/lib/session";
import { ErrorBoundary } from "./ErrorBoundary";
import { I18nProvider, useI18n } from "./i18n";
import Login from "./Login";
import About from "./About";
import Dashboard from "./Dashboard";
import { MainLayout } from "./MainLayout";
import { MigrationPending, NotFound } from "./pages";
import { pendingRoutes } from "./navigation";

function ProtectedLayout() {
  const location = useLocation();
  if (!localStorage.getItem(LANDSCAPE_TOKEN_KEY)) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          redirect: location.pathname + location.search + location.hash,
        }}
      />
    );
  }
  return <MainLayout />;
}

function Infrastructure() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setLanguage, t } = useI18n();
  const loadedPreferenceForToken = useRef<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem(LANDSCAPE_TOKEN_KEY);
    if (!token) {
      loadedPreferenceForToken.current = null;
      return;
    }
    if (loadedPreferenceForToken.current === token) return;
    loadedPreferenceForToken.current = token;
    void getUiConfigFast({ silent: true })
      .then((preference) => setLanguage(preference.language))
      .catch(() => undefined);
  }, [location.pathname, setLanguage]);

  useEffect(() => {
    const showApiError = (event: Event) => {
      const error = (event as CustomEvent<ApiError>).detail;
      const key = error.error_id ? `errors.${error.error_id}` : "";
      const translated = key ? t(key, error.args) : "";
      toast.danger(
        translated && translated !== key ? translated : error.message,
      );
    };
    const redirectUnauthorized = () => {
      const redirect = location.pathname + location.search + location.hash;
      navigate("/login", {
        replace: true,
        state: redirect === "/login" ? undefined : { redirect },
      });
    };
    addEventListener(API_ERROR_EVENT, showApiError);
    addEventListener(UNAUTHORIZED_EVENT, redirectUnauthorized);
    return () => {
      removeEventListener(API_ERROR_EVENT, showApiError);
      removeEventListener(UNAUTHORIZED_EVENT, redirectUnauthorized);
    };
  }, [location, navigate, t]);

  return null;
}

function RouterTree() {
  return (
    <>
      <Infrastructure />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="about" element={<About />} />
          {pendingRoutes.map(([path, routeKey]) => (
            <Route
              key={path}
              index={!path}
              path={path || undefined}
              element={<MigrationPending routeKey={routeKey} />}
            />
          ))}
          <Route
            path="geo/ip"
            element={<Navigate to="/geo/domain" replace />}
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <Toast.Provider placement="top end" />
        <BrowserRouter>
          <RouterTree />
        </BrowserRouter>
      </I18nProvider>
    </ErrorBoundary>
  );
}
