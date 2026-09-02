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
  type RadiusMode,
  type ThemePreference,
  useThemePreferences,
} from "./theme";

const themeOptions: ThemePreference[] = ["system", "light", "dark"];
const radiusOptions: RadiusMode[] = ["sharp", "default", "rounded"];

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
            <label>
              <span>Radius</span>
              <select
                aria-label="Radius"
                onChange={(event) =>
                  preferences.setRadius(event.target.value as RadiusMode)
                }
                value={preferences.radius}
              >
                {radiusOptions.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
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
        <main className="app-content" id="main-content">
          <Outlet />
        </main>
      </section>
    </div>
  );
}
