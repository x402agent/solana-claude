import { CreditCard, Wallet } from "lucide-react";
import type { DashboardState } from "../types";
import { toPaymentQuote } from "../lib/payments";

interface BillingPageProps {
  state: DashboardState;
}

export function BillingPage({ state }: BillingPageProps) {
  return (
    <section className="page-grid">
      <div className="billing-top">
        <article className="card balance-card">
          <div>
            <div className="balance-card__label">Credit Balance</div>
            <div className="balance-card__value">${state.billing.creditBalanceUsd.toFixed(2)}</div>
            <div className="balance-card__sub">{state.identity.walletAddress}</div>
          </div>
          <div className="balance-card__icon"><CreditCard size={28} /></div>
        </article>

        <article className="card balance-card">
          <div>
            <div className="balance-card__label">Wallet Reserves</div>
            <div className="balance-card__value">
              ${state.billing.walletUsdc.toFixed(2)} USDC
            </div>
            <div className="balance-card__sub">{state.billing.walletClawd.toLocaleString()} $CLAWD available</div>
          </div>
          <div className="balance-card__icon alt"><Wallet size={28} /></div>
        </article>
      </div>

      <div className="billing-grid">
        <article className="card">
          <div className="section-header">
            <div>
              <h2>VM Pricing</h2>
              <p>Predictable trench pricing for sandbox compute.</p>
            </div>
          </div>
          <table className="pricing-table">
            <thead>
              <tr>
                <th>Tier</th>
                <th>Resources</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {state.billing.prices.map((tier) => (
                <tr key={tier.name}>
                  <td>{tier.name}</td>
                  <td>{tier.vcpu} vCPU · {tier.memoryGb} GB · {tier.diskGb} GB</td>
                  <td>${tier.monthlyPriceUsd.toFixed(2)}/mo</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="card">
          <div className="section-header">
            <div>
              <h2>Buy Credits</h2>
              <p>Pay with USDC on pay.sh or route through the CLAWD token commerce rail.</p>
            </div>
          </div>

          <div className="notice-panel">{state.billing.note}</div>

          <div className="billing-packs">
            {state.billing.packs.map((pack) => {
              const quote = toPaymentQuote(pack);
              return (
                <button
                  key={`${pack.token}-${pack.amountUsd}`}
                  className={`billing-pack ${quote.status === "insufficient" ? "is-disabled" : ""}`}
                  type="button"
                >
                  <strong>${pack.amountUsd}</strong>
                  <span>{quote.token} via {quote.rail}</span>
                  <small>{quote.cta}</small>
                </button>
              );
            })}
          </div>
        </article>
      </div>
    </section>
  );
}
