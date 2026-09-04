import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  Avatar,
  Button,
  Drawer,
  ScrollShadow,
  Separator,
  Tooltip,
} from "@heroui/react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  clearLandscapeSession,
  readLandscapeUsername,
  readSidebarCollapsed,
  saveSidebarCollapsed,
} from "@/lib/session";
import { useI18n } from "./i18n";
import { activeGroup, menuPath, navigation } from "./navigation";
import {
  fonts,
  type FontMode,
  radii,
  type RadiusMode,
  type ThemePreference,
  useThemePreferences,
} from "./theme";

const themeOptions: ThemePreference[] = ["system", "light", "dark"];
const radiusLabels: Record<RadiusMode, string> = {
  none: "None",
  "extra-small": "XS Extra Small",
  small: "S Small",
  medium: "M Medium",
  large: "L Large",
  full: "Full",
};
const fontLabels: Record<FontMode, string> = {
  inter: "Inter",
  system: "System Sans",
  serif: "Serif",
  mono: "Monospace",
};

function Navigation({
  collapsed = false,
  expandedGroup,
  onNavigate,
  onExpand,
}: {
  collapsed?: boolean;
  expandedGroup?: string;
  onNavigate?: () => void;
  onExpand?: (key: string) => void;
}) {
  const { pathname } = useLocation();
  const { t } = useI18n();
  const currentPath = menuPath(pathname);
  const currentGroup = activeGroup(pathname);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(currentGroup ? [currentGroup] : []),
  );

  useEffect(() => {
    const group = expandedGroup || currentGroup;
    if (group) {
      setExpanded((value) => new Set([...value, group]));
    }
  }, [currentGroup, expandedGroup]);

  const directLink = (path: string, label: string, icon?: string) => (
    <Link
      aria-current={currentPath === path ? "page" : undefined}
      aria-label={collapsed ? t(label) : undefined}
      className={`nav-link${currentPath === path ? " nav-link--active" : ""}`}
      onClick={onNavigate}
      to={path}
    >
      {icon ? (
        <span className="nav-icon" aria-hidden>
          {icon}
        </span>
      ) : null}
      {!collapsed ? <span>{t(label)}</span> : null}
    </Link>
  );

  if (collapsed) {
    return (
      <nav
        aria-label="Primary navigation"
        className="navigation navigation--collapsed"
      >
        {navigation.map((item) => (
          <Tooltip key={item.key} delay={250}>
            <Tooltip.Trigger>
              {item.path ? (
                directLink(item.path, item.label, item.icon)
              ) : (
                <button
                  aria-label={t(item.label)}
                  className={`nav-link${currentGroup === item.key ? " nav-link--active" : ""}`}
                  onClick={() => onExpand?.(item.key)}
                  type="button"
                >
                  <span className="nav-icon" aria-hidden>
                    {item.icon}
                  </span>
                </button>
              )}
            </Tooltip.Trigger>
            <Tooltip.Content>{t(item.label)}</Tooltip.Content>
          </Tooltip>
        ))}
      </nav>
    );
  }

  return (
    <nav aria-label="Primary navigation" className="navigation">
      {navigation.map((item) =>
        item.path ? (
          <div key={item.key}>
            {directLink(item.path, item.label, item.icon)}
          </div>
        ) : (
          <Accordion
            key={item.key}
            expandedKeys={expanded}
            hideSeparator
            onExpandedChange={(keys) =>
              setExpanded(new Set([...keys].map(String)))
            }
          >
            <Accordion.Item id={item.key}>
              <Accordion.Heading>
                <Accordion.Trigger
                  className={`nav-group-trigger${currentGroup === item.key ? " nav-group-trigger--active" : ""}`}
                >
                  <span className="nav-icon" aria-hidden>
                    {item.icon}
                  </span>
                  <span>{t(item.label)}</span>
                  <Accordion.Indicator className="nav-chevron" />
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel>
                <Accordion.Body className="nav-children">
                  {item.children?.map((child) => (
                    <div key={child.key}>
                      {directLink(child.path!, child.label)}
                    </div>
                  ))}
                </Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        ),
      )}
    </nav>
  );
}

export function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage, t } = useI18n();
  const preferences = useThemePreferences();
  const [collapsed, setCollapsed] = useState(readSidebarCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string>();
  const username = readLandscapeUsername() || t("common.username");
  const title = useMemo(() => {
    if (location.pathname === "/about") return t("routes.about");
    const current = menuPath(location.pathname);
    const item = navigation.find(
      (entry) =>
        entry.path === current ||
        entry.children?.some(({ path }) => path === current),
    );
    const child = item?.children?.find(({ path }) => path === current);
    return t(child?.label || item?.label || "routes.dashboard");
  }, [location.pathname, t]);

  const setSidebarCollapsed = (value: boolean) => {
    setCollapsed(value);
    saveSidebarCollapsed(value);
  };

  const logout = () => {
    clearLandscapeSession();
    navigate("/login", { replace: true, state: null });
  };

  return (
    <div className={`app-layout${collapsed ? " app-layout--collapsed" : ""}`}>
      <aside className="desktop-sidebar">
        <div className="sidebar-brand">{collapsed ? "L" : "Landscape"}</div>
        <ScrollShadow className="sidebar-scroll" hideScrollBar>
          <Navigation
            collapsed={collapsed}
            expandedGroup={expandedGroup}
            onExpand={(key) => {
              setSidebarCollapsed(false);
              setExpandedGroup(key);
            }}
          />
        </ScrollShadow>
        <Separator />
        <nav
          aria-label={t("routes.about")}
          className={`sidebar-resources${collapsed ? " sidebar-resources--collapsed" : ""}`}
        >
          <a
            aria-label={t("about.documentation")}
            href="https://landscape.whileaway.dev/"
            rel="noopener noreferrer"
            target="_blank"
          >
            ⌘{!collapsed ? <span>{t("about.documentation")}</span> : null}
          </a>
          <a
            aria-label={t("about.api_docs")}
            href="/api/docs"
            rel="noopener noreferrer"
            target="_blank"
          >
            API{!collapsed ? <span>{t("about.api_docs")}</span> : null}
          </a>
          <Link
            aria-current={location.pathname === "/about" ? "page" : undefined}
            aria-label={t("routes.about")}
            className={location.pathname === "/about" ? "is-active" : undefined}
            to="/about"
          >
            ⓘ{!collapsed ? <span>{t("routes.about")}</span> : null}
          </Link>
        </nav>
        <div className="sidebar-footer">
          {!collapsed ? <span>Landscape Router</span> : null}
          <Button
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            isIconOnly
            onPress={() => setSidebarCollapsed(!collapsed)}
            size="sm"
            variant="ghost"
          >
            {collapsed ? "›" : "‹"}
          </Button>
        </div>
      </aside>

      <section className="app-main">
        <header className="app-header">
          <Drawer isOpen={drawerOpen} onOpenChange={setDrawerOpen}>
            <Drawer.Trigger
              aria-label="Open navigation"
              className="mobile-menu-button"
            >
              ☰
            </Drawer.Trigger>
            <Drawer.Backdrop>
              <Drawer.Content placement="left" className="mobile-drawer">
                <Drawer.Dialog>
                  <Drawer.Header>
                    <Drawer.Heading>Landscape</Drawer.Heading>
                    <Drawer.CloseTrigger aria-label="Close navigation">
                      ×
                    </Drawer.CloseTrigger>
                  </Drawer.Header>
                  <Drawer.Body>
                    <ScrollShadow className="drawer-scroll" hideScrollBar>
                      <Navigation onNavigate={() => setDrawerOpen(false)} />
                    </ScrollShadow>
                  </Drawer.Body>
                </Drawer.Dialog>
              </Drawer.Content>
            </Drawer.Backdrop>
          </Drawer>
          <h1>{title}</h1>
          <div className="preference-controls">
            <label>
              <span>Language</span>
              <select
                aria-label="Language"
                onChange={(event) => setLanguage(event.target.value)}
                value={language}
              >
                <option value="zh">中文</option>
                <option value="en">English</option>
              </select>
            </label>
            <div className="current-user">
              <Avatar size="sm">
                <Avatar.Fallback>
                  {username.slice(0, 1).toUpperCase()}
                </Avatar.Fallback>
              </Avatar>
              <span>{username}</span>
            </div>
            <Button onPress={logout} size="sm" variant="ghost">
              {t("common.logout")}
            </Button>
          </div>
        </header>
        <section className="theme-customizer" aria-label="Theme settings">
          <label className="theme-color-control">
            <span>Accent</span>
            <input
              aria-label="Accent"
              max="360"
              min="0"
              onInput={(event) =>
                preferences.setAccent(Number(event.currentTarget.value))
              }
              step="0.01"
              type="range"
              value={preferences.accent}
            />
          </label>
          <label className="theme-base-control">
            <span>
              Base <output>{preferences.base.toFixed(3)}</output>
            </span>
            <input
              aria-label="Base"
              max="0.05"
              min="0"
              onInput={(event) =>
                preferences.setBase(Number(event.currentTarget.value))
              }
              step="0.001"
              type="range"
              value={preferences.base}
            />
          </label>
          <label>
            <span>Font Family</span>
            <select
              aria-label="Font Family"
              onChange={(event) =>
                preferences.setFont(event.target.value as FontMode)
              }
              value={preferences.font}
            >
              {fonts.map((value) => (
                <option key={value} value={value}>
                  {fontLabels[value]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Radius</span>
            <select
              aria-label="Radius"
              onChange={(event) =>
                preferences.setRadius(event.target.value as RadiusMode)
              }
              value={preferences.radius}
            >
              {radii.map((value) => (
                <option key={value} value={value}>
                  {radiusLabels[value]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Radius Form</span>
            <select
              aria-label="Radius Form"
              onChange={(event) =>
                preferences.setFormRadius(event.target.value as RadiusMode)
              }
              value={preferences.formRadius}
            >
              {radii.map((value) => (
                <option key={value} value={value}>
                  {radiusLabels[value]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Theme</span>
            <select
              aria-label="Theme"
              onChange={(event) =>
                preferences.setTheme(event.target.value as ThemePreference)
              }
              value={preferences.theme}
            >
              {themeOptions.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        </section>
        <main className="app-content" id="main-content">
          <Outlet />
        </main>
      </section>
    </div>
  );
}
