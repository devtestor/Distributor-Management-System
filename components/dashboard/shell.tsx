import {
  CalendarDays,
  Search,
  ShieldCheck,
  type LucideIcon
} from "lucide-react";
import type { FormEventHandler } from "react";
import type { ApiUser } from "@/lib/api";
import type { NavSection } from "@/lib/dashboard-helpers";
import type { Locale } from "@/lib/types";

export type DashboardNavItem = {
  key: NavSection;
  label: string;
  icon: LucideIcon;
};

type LocaleOption = {
  code: Locale;
  label: string;
  short: string;
};

type DashboardSidebarProps = {
  activeSection: NavSection;
  appName: string;
  business: string;
  brandMark: string;
  logoUrl?: string | null;
  navItems: DashboardNavItem[];
  systemScope: string;
  onSectionChange: (section: NavSection) => void;
};

export function DashboardSidebar({
  activeSection,
  appName,
  business,
  brandMark,
  logoUrl,
  navItems,
  systemScope,
  onSectionChange
}: DashboardSidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div
          aria-label={logoUrl ? business : undefined}
          className={`brand-mark ${logoUrl ? "with-logo" : ""}`}
          role={logoUrl ? "img" : undefined}
          style={logoUrl ? { backgroundImage: `url(${logoUrl})` } : undefined}
        >
          {logoUrl ? null : brandMark}
        </div>
        <div>
          <h1>{appName}</h1>
          <p>{business}</p>
        </div>
      </div>

      <nav className="nav" aria-label="Primary">
        {navItems.map((item) => (
          <button
            className={`nav-button ${activeSection === item.key ? "active" : ""}`}
            key={item.key}
            onClick={() => onSectionChange(item.key)}
            type="button"
          >
            <item.icon size={18} aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <p className="sidebar-note">{systemScope}</p>
    </aside>
  );
}

type DashboardTopbarProps = {
  languageLabel: string;
  locale: Locale;
  locales: LocaleOption[];
  searchPlaceholder: string;
  onLocaleChange: (locale: Locale) => void;
};

export function DashboardTopbar({
  languageLabel,
  locale,
  locales,
  searchPlaceholder,
  onLocaleChange
}: DashboardTopbarProps) {
  return (
    <header className="topbar">
      <label className="search">
        <Search size={18} aria-hidden="true" />
        <input aria-label="Search" placeholder={searchPlaceholder} />
      </label>

      <div aria-label={languageLabel} className="language-switcher" title={languageLabel}>
        {locales.map((item) => (
          <button
            className={locale === item.code ? "active" : ""}
            key={item.code}
            onClick={() => onLocaleChange(item.code)}
            title={item.label}
            type="button"
          >
            {item.short}
          </button>
        ))}
      </div>
    </header>
  );
}

type AuthBandLabels = {
  apiConnected: string;
  demoMode: string;
  email: string;
  fallbackDataNote: string;
  liveDataNote: string;
  loadingData: string;
  login: string;
  logout: string;
  password: string;
  seedCredentials: string;
  signInLiveApi: string;
  signedInAs: string;
};

type AuthBandProps = {
  apiStatus: "mock" | "connected";
  authError: string | null;
  email: string;
  isLiveDataLoading: boolean;
  isLoggingIn: boolean;
  labels: AuthBandLabels;
  password: string;
  user: ApiUser | null;
  onEmailChange: (value: string) => void;
  onLogin: FormEventHandler<HTMLFormElement>;
  onLogout: () => void;
  onPasswordChange: (value: string) => void;
};

export function AuthBand({
  apiStatus,
  authError,
  email,
  isLiveDataLoading,
  isLoggingIn,
  labels,
  password,
  user,
  onEmailChange,
  onLogin,
  onLogout,
  onPasswordChange
}: AuthBandProps) {
  return (
    <section className="auth-band" aria-label="Authentication">
      <div>
        <span className={`badge ${apiStatus === "connected" ? "good" : "warn"}`}>
          {apiStatus === "connected" ? labels.apiConnected : labels.demoMode}
        </span>
        <p>
          {isLiveDataLoading
            ? labels.loadingData
            : apiStatus === "connected" && user
              ? `${labels.signedInAs} ${user.fullName}. ${labels.liveDataNote}`
              : apiStatus === "connected"
                ? labels.signInLiveApi
                : labels.fallbackDataNote}
        </p>
      </div>

      {user ? (
        <button className="primary-button" onClick={onLogout} type="button">
          {labels.logout}
        </button>
      ) : (
        <form className="login-form" onSubmit={onLogin}>
          <label>
            <span>{labels.email}</span>
            <input value={email} onChange={(event) => onEmailChange(event.target.value)} type="email" />
          </label>
          <label>
            <span>{labels.password}</span>
            <input value={password} onChange={(event) => onPasswordChange(event.target.value)} type="password" />
          </label>
          <button className="primary-button" disabled={isLoggingIn} type="submit">
            {isLoggingIn ? "..." : labels.login}
          </button>
          <small>{authError ?? labels.seedCredentials}</small>
        </form>
      )}
    </section>
  );
}

type StatusBannersProps = {
  actionError: string | null;
  actionNotice: string | null;
};

export function StatusBanners({ actionError, actionNotice }: StatusBannersProps) {
  return (
    <>
      {actionNotice ? <section className="status-banner success">{actionNotice}</section> : null}
      {actionError ? <section className="status-banner danger">{actionError}</section> : null}
    </>
  );
}

type SyncBannerProps = {
  disabled: boolean;
  isOnline: boolean;
  isSyncingDrafts: boolean;
  labels: {
    noPendingDrafts: string;
    offline: string;
    online: string;
    pendingDrafts: string;
    syncNow: string;
    syncing: string;
  };
  offlineDraftCount: number;
  onSync: () => void;
};

export function SyncBanner({
  disabled,
  isOnline,
  isSyncingDrafts,
  labels,
  offlineDraftCount,
  onSync
}: SyncBannerProps) {
  return (
    <section className={`sync-banner ${isOnline ? "online" : "offline"}`}>
      <div>
        <strong>{isOnline ? labels.online : labels.offline}</strong>
        <span>
          {offlineDraftCount > 0 ? `${offlineDraftCount} ${labels.pendingDrafts}` : labels.noPendingDrafts}
        </span>
      </div>
      <button className="ghost-button" disabled={disabled} onClick={onSync} type="button">
        {isSyncingDrafts ? labels.syncing : labels.syncNow}
      </button>
    </section>
  );
}

type LoginRequiredPanelProps = {
  login: string;
  loginRequired: string;
  signInLiveApi: string;
};

export function LoginRequiredPanel({ login, loginRequired, signInLiveApi }: LoginRequiredPanelProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h3>{login}</h3>
          <span>{signInLiveApi}</span>
        </div>
        <ShieldCheck size={18} color="var(--brand)" aria-hidden="true" />
      </div>
      <div className="panel-body">
        <p className="table-state">{loginRequired}</p>
      </div>
    </section>
  );
}

type PageHeadingProps = {
  activeSection: NavSection;
  dateLabel: string;
  formattedDate: string;
  ownerTitle: string;
  sectionLabel: string | undefined;
  systemScope: string;
  overview: string;
};

export function PageHeading({
  activeSection,
  dateLabel,
  formattedDate,
  ownerTitle,
  sectionLabel,
  systemScope,
  overview
}: PageHeadingProps) {
  return (
    <div className="page-heading">
      <div>
        <h2>{activeSection === "dashboard" ? ownerTitle : sectionLabel}</h2>
        <p>{activeSection === "dashboard" ? overview : systemScope}</p>
      </div>
      <div className="date-pill">
        <CalendarDays size={17} aria-hidden="true" />
        <span>
          {dateLabel}: {formattedDate}
        </span>
      </div>
    </div>
  );
}

type KpiGridProps = {
  kpis: {
    label: string;
    value: string;
    icon: LucideIcon;
  }[];
};

export function KpiGrid({ kpis }: KpiGridProps) {
  return (
    <section className="kpi-grid" aria-label="Business metrics">
      {kpis.map((kpi) => (
        <article className="kpi-card" key={kpi.label}>
          <div className="icon">
            <kpi.icon size={19} aria-hidden="true" />
          </div>
          <div>
            <p>{kpi.label}</p>
            <strong>{kpi.value}</strong>
          </div>
        </article>
      ))}
    </section>
  );
}
