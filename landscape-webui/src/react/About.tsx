import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Chip,
  Link,
  Separator,
  Skeleton,
  Tooltip,
} from "@heroui/react";
import { useI18n } from "./i18n";

export type GitHubContributor = {
  id?: number;
  login?: string;
  name?: string;
  email?: string;
  avatar_url?: string;
  html_url?: string;
  contributions: number;
};

type GitHubRepository = {
  full_name: string;
  contributors_url: string;
};

const REPOSITORY_URL = "https://github.com/ThisSeanZhang/landscape";
const ORGANIZATION_URL = "https://github.com/landscape-router";
const ORGANIZATION_REPOSITORIES_URL =
  "https://api.github.com/orgs/landscape-router/repos";
const REPOSITORY_CONTRIBUTORS_URL =
  "https://api.github.com/repos/ThisSeanZhang/landscape/contributors";
const DOC_URL = "https://landscape.whileaway.dev/";
const GITHUB_HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

async function fetchAllPages<T>(
  endpoint: string,
  params: Record<string, string>,
  signal: AbortSignal,
) {
  const result: T[] = [];
  for (let page = 1; ; page += 1) {
    const url = new URL(endpoint);
    Object.entries(params).forEach(([key, value]) =>
      url.searchParams.set(key, value),
    );
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));
    const response = await fetch(url, { headers: GITHUB_HEADERS, signal });
    if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);
    const items: unknown = await response.json();
    if (!Array.isArray(items)) throw new Error("GitHub returned invalid data");
    result.push(...(items as T[]));
    if (items.length < 100) return result;
  }
}

function identity(contributor: GitHubContributor) {
  if (contributor.id !== undefined) return `id:${contributor.id}`;
  if (contributor.login) return `login:${contributor.login.toLowerCase()}`;
  if (contributor.email) return `email:${contributor.email.toLowerCase()}`;
  return `name:${contributor.name || "anonymous"}`;
}

export async function fetchContributors(signal: AbortSignal) {
  const repositories = await fetchAllPages<GitHubRepository>(
    ORGANIZATION_REPOSITORIES_URL,
    { type: "public", sort: "full_name", direction: "asc" },
    signal,
  );
  const endpoints = [
    REPOSITORY_CONTRIBUTORS_URL,
    ...repositories.map(({ contributors_url }) => contributors_url),
  ];
  const lists = await Promise.all(
    [...new Set(endpoints)].map((endpoint) =>
      fetchAllPages<GitHubContributor>(endpoint, {}, signal),
    ),
  );
  const contributors = new Map<string, GitHubContributor>();
  lists.flat().forEach((contributor) => {
    const key = identity(contributor);
    const current = contributors.get(key);
    contributors.set(key, {
      ...current,
      ...contributor,
      login: current?.login || contributor.login,
      name: current?.name || contributor.name,
      avatar_url: current?.avatar_url || contributor.avatar_url,
      html_url: current?.html_url || contributor.html_url,
      contributions:
        (current?.contributions || 0) + (contributor.contributions || 0),
    });
  });
  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: "base",
  });
  return [...contributors.values()].sort((a, b) => {
    const aOwner = a.login?.toLowerCase() === "thisseanzhang";
    const bOwner = b.login?.toLowerCase() === "thisseanzhang";
    if (aOwner !== bOwner) return aOwner ? 1 : -1;
    return (
      b.contributions - a.contributions ||
      collator.compare(a.login || a.name || "", b.login || b.name || "")
    );
  });
}

export default function About() {
  const { t } = useI18n();
  const [contributors, setContributors] = useState<GitHubContributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reload, setReload] = useState(0);

  const name = useCallback(
    (contributor: GitHubContributor) =>
      contributor.login || contributor.name || t("about.anonymous"),
    [t],
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    void fetchContributors(controller.signal)
      .then(setContributors)
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setContributors([]);
          setFailed(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reload]);

  return (
    <article className="about-page">
      <section className="about-product" aria-labelledby="about-title">
        <div>
          <p className="about-eyebrow">LANDSCAPE ROUTER</p>
          <h1 id="about-title">{t("about.title")}</h1>
          <p className="about-description">{t("about.description")}</p>
          <Chip size="sm">
            <Chip.Label>
              {t("about.version", { version: __APP_VERSION__ })}
            </Chip.Label>
          </Chip>
        </div>
        <div className="about-actions">
          {[
            [REPOSITORY_URL, t("about.repository")],
            [ORGANIZATION_URL, t("about.organization")],
            [`${REPOSITORY_URL}/blob/main/LICENSE`, t("about.license")],
            [DOC_URL, t("about.documentation")],
          ].map(([href, label]) => (
            <Link
              className="about-action"
              href={href}
              key={href}
              rel="noopener noreferrer"
              target="_blank"
            >
              {label}
              <Link.Icon aria-hidden />
            </Link>
          ))}
        </div>
      </section>

      <Separator />

      <section
        className="contributors-section"
        aria-labelledby="contributors-title"
        aria-busy={loading}
      >
        <header className="contributors-header">
          <div>
            <div className="contributors-title-row">
              <h2 id="contributors-title">{t("about.contributors")}</h2>
              {contributors.length ? (
                <Chip size="sm">
                  <Chip.Label>
                    {t("about.contributor_count", {
                      count: contributors.length,
                    })}
                  </Chip.Label>
                </Chip>
              ) : null}
            </div>
            <p>{t("about.contributors_description")}</p>
          </div>
          <Tooltip>
            <Tooltip.Trigger>
              <Button
                aria-label={t("about.refresh")}
                isIconOnly
                isDisabled={loading}
                onPress={() => setReload((value) => value + 1)}
                variant="ghost"
              >
                ↻
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>{t("about.refresh")}</Tooltip.Content>
          </Tooltip>
        </header>

        {loading && !contributors.length ? (
          <div
            className="contributors-grid"
            aria-label={t("about.contributors")}
          >
            {Array.from({ length: 6 }, (_, index) => (
              <Card className="contributor-card" key={index}>
                <Skeleton className="contributor-avatar-skeleton" />
                <Skeleton className="contributor-name-skeleton" />
              </Card>
            ))}
          </div>
        ) : failed ? (
          <Alert status="danger" className="about-error">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>{t("about.load_failed")}</Alert.Title>
              <Alert.Description>
                {t("about.load_failed_description")}
              </Alert.Description>
              <Button
                onPress={() => setReload((value) => value + 1)}
                size="sm"
                variant="secondary"
              >
                {t("about.retry")}
              </Button>
            </Alert.Content>
          </Alert>
        ) : contributors.length ? (
          <div className="contributors-grid">
            {contributors.map((contributor, index) => {
              const contributorName = name(contributor);
              const card = (
                <Card className="contributor-card">
                  <Avatar className="contributor-avatar">
                    {contributor.avatar_url ? (
                      <Avatar.Image
                        alt=""
                        loading="lazy"
                        src={contributor.avatar_url}
                      />
                    ) : null}
                    <Avatar.Fallback>
                      {contributorName.slice(0, 2).toUpperCase()}
                    </Avatar.Fallback>
                  </Avatar>
                  <Card.Title className="contributor-name">
                    {contributorName}
                  </Card.Title>
                </Card>
              );
              return contributor.html_url ? (
                <Link
                  aria-label={t("about.open_profile", {
                    name: contributorName,
                  })}
                  className="contributor-link"
                  href={contributor.html_url}
                  key={identity(contributor) || index}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {card}
                </Link>
              ) : (
                <div key={identity(contributor) || index}>{card}</div>
              );
            })}
          </div>
        ) : (
          <p className="about-empty" role="status">
            {t("common.no_data")}
          </p>
        )}
      </section>
    </article>
  );
}
