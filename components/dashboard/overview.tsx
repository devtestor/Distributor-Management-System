import {
  AlertTriangle,
  Boxes,
  ClipboardCheck,
  CreditCard,
  Languages,
  RotateCcw,
  type LucideIcon
} from "lucide-react";
import type { ActionType } from "@/lib/dashboard-helpers";
import { getProductStatus, money } from "@/lib/dashboard-helpers";
import type { Product } from "@/lib/types";
import type { Customer } from "@/lib/types";

type QuickAction = {
  key: Exclude<ActionType, null>;
  label: string;
  icon: LucideIcon;
};

type DashboardOverviewLabels = {
  alertCredit: string;
  alertEmpties: string;
  alertLowStock: string;
  alerts: string;
  bottlesAtRisk: string;
  collectionPriority: string;
  empties: string;
  emptiesControl: string;
  emptiesControlNote: string;
  emptiesRecoveredAction: string;
  healthy: string;
  inventory: string;
  liveEntry: string;
  loadingData: string;
  loginRequired: string;
  lowStock: string;
  margin: string;
  noRecords: string;
  package: string;
  product: string;
  quickActions: string;
  reorder: string;
  reorderNow: string;
  status: string;
  stock: string;
  watch: string;
};

type DashboardOverviewProps = {
  canUseLiveActions: boolean;
  criticalCreditCount: number;
  highEmptiesCount: number;
  highEmptiesCustomers: Customer[];
  isLiveDataLoading: boolean;
  labels: DashboardOverviewLabels;
  lowStockCount: number;
  products: Product[];
  quickActions: QuickAction[];
  totalEmptiesOutstanding: number;
  onOpenAction: (action: Exclude<ActionType, null>) => void;
};

export function DashboardOverview({
  canUseLiveActions,
  criticalCreditCount,
  highEmptiesCount,
  highEmptiesCustomers,
  isLiveDataLoading,
  labels,
  lowStockCount,
  products,
  quickActions,
  totalEmptiesOutstanding,
  onOpenAction
}: DashboardOverviewProps) {
  const topEmptiesCustomers = highEmptiesCustomers.slice(0, 5);

  return (
    <section className="dashboard-stack">
      <article className="empties-spotlight">
        <div className="empties-copy">
          <span className="feature-kicker">{labels.emptiesControl}</span>
          <h3>{totalEmptiesOutstanding.toLocaleString()}</h3>
          <p>{labels.emptiesControlNote}</p>
          <div className="empties-actions">
            <button
              className="primary-button"
              disabled={!canUseLiveActions}
              onClick={() => onOpenAction("reconcile")}
              type="button"
            >
              <ClipboardCheck size={17} aria-hidden="true" />
              {labels.emptiesRecoveredAction}
            </button>
            <span>
              {highEmptiesCount} {labels.bottlesAtRisk}
            </span>
          </div>
        </div>
        <div className="empties-priority">
          <div className="priority-header">
            <strong>{labels.collectionPriority}</strong>
            <span>{labels.empties}</span>
          </div>
          <div className="priority-list">
            {topEmptiesCustomers.map((customer) => (
              <div className="priority-row" key={customer.id}>
                <span>
                  <strong>{customer.name}</strong>
                  <small>{customer.route}</small>
                </span>
                <b>{customer.emptiesBalance.toLocaleString()}</b>
              </div>
            ))}
            {topEmptiesCustomers.length === 0 ? (
              <div className="priority-empty">{isLiveDataLoading ? labels.loadingData : labels.noRecords}</div>
            ) : null}
          </div>
        </div>
      </article>

      <section className="section-grid">
      <article className="panel">
        <div className="panel-header">
          <div>
            <h3>{labels.inventory}</h3>
            <span>
              {lowStockCount} {labels.lowStock.toLowerCase()}
            </span>
          </div>
          <span className="badge warn">{labels.reorderNow}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{labels.product}</th>
                <th>{labels.package}</th>
                <th>{labels.stock}</th>
                <th>{labels.reorder}</th>
                <th>{labels.margin}</th>
                <th>{labels.empties}</th>
                <th>{labels.status}</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const status = getProductStatus(product);
                return (
                  <tr key={product.id}>
                    <td>
                      <strong>{product.name}</strong>
                      <small>{product.sku}</small>
                    </td>
                    <td>{product.unitSize}</td>
                    <td>{product.stockUnits.toLocaleString()}</td>
                    <td>{product.reorderLevel.toLocaleString()}</td>
                    <td>{money(product.unitPrice - product.unitCost)}</td>
                    <td>{product.emptiesOwed.toLocaleString()}</td>
                    <td>
                      <span className={`badge ${status}`}>
                        {status === "good" ? labels.healthy : status === "warn" ? labels.watch : labels.reorderNow}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {products.length === 0 ? (
                <tr>
                  <td className="table-state" colSpan={7}>
                    {isLiveDataLoading ? labels.loadingData : labels.noRecords}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </article>

      <aside className="side-stack">
        <article className="panel">
          <div className="panel-header">
            <h3>{labels.alerts}</h3>
            <AlertTriangle size={18} color="var(--amber)" aria-hidden="true" />
          </div>
          <ul className="alert-list">
            <li>
              <span className="alert-icon">
                <Boxes size={18} aria-hidden="true" />
              </span>
              <div>
                <strong>{lowStockCount}</strong>
                <span>{labels.alertLowStock}</span>
              </div>
            </li>
            <li>
              <span className="alert-icon">
                <CreditCard size={18} aria-hidden="true" />
              </span>
              <div>
                <strong>{criticalCreditCount}</strong>
                <span>{labels.alertCredit}</span>
              </div>
            </li>
            <li>
              <span className="alert-icon">
                <RotateCcw size={18} aria-hidden="true" />
              </span>
              <div>
                <strong>{highEmptiesCount}</strong>
                <span>{labels.alertEmpties}</span>
              </div>
            </li>
          </ul>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h3>{labels.quickActions}</h3>
            <Languages size={18} color="var(--brand)" aria-hidden="true" />
          </div>
          <div className="action-list">
            {quickActions.map((action) => (
              <button
                className="action-card"
                disabled={!canUseLiveActions}
                key={action.key}
                onClick={() => onOpenAction(action.key)}
                type="button"
              >
                <action.icon size={19} aria-hidden="true" />
                <span>
                  <strong>{action.label}</strong>
                  <span>{canUseLiveActions ? labels.liveEntry : labels.loginRequired}</span>
                </span>
              </button>
            ))}
          </div>
        </article>
      </aside>
      </section>
    </section>
  );
}
