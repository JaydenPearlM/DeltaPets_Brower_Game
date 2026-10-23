import { Link } from "react-router-dom";
import "../../Merchant_global_styles.css";
import "../merchant/kithna_Food_Shop.css";

export default function KithnaThriftStore() {
  return (
    <main className="dp-merchant-page kithna-food-shop">
      <div className="dp-merchant-shell">
        <section className="dp-merchant-panel dp-standard-panel">
          <Link className="kithna-food-back-link" to="/cities/kithna">
            Back to Kithna
          </Link>

          <header className="dp-merchant-header kithna-food-header">
            <div
              className="dp-merchant-foreground kithna-food-merchant-art"
              aria-label="Merchant artwork placeholder"
            >
              Large Human Merchant
              <br />
              Art Placeholder
            </div>

            <div className="kithna-food-merchant-summary">
              <div className="dp-merchant-heading">
                <h1 className="dp-merchant-name">Kennith</h1>
                <p className="dp-merchant-shop-name">Kennith's Thrift Store</p>
              </div>

              <div className="dp-merchant-wallets">
                <div className="dp-merchant-wallet">
                  <span className="dp-merchant-wallet-label">
                    Merchant Dots
                  </span>
                  <span className="dp-merchant-wallet-value">—</span>
                </div>

                <div className="dp-merchant-wallet">
                  <span className="dp-merchant-wallet-label">User Dots</span>
                  <span className="dp-merchant-wallet-value">—</span>
                </div>
              </div>
            </div>
          </header>

          <div className="kithna-food-main-layout">
            <aside className="dp-merchant-section dp-merchant-info">
              <p className="dp-merchant-dialogue">
                Welcome to my thrift store! We're still sorting through our
                collection. Come back when we've stocked the shelves.
              </p>

              <div className="kithna-food-info-actions">
                <button
                  type="button"
                  className="btn-pearl kithna-food-info-button"
                  disabled
                >
                  Merchant News
                </button>

                <button
                  type="button"
                  className="btn-pearl kithna-food-info-button"
                  disabled
                >
                  About the Shop
                </button>
              </div>
            </aside>

            <div className="kithna-food-trade-area">
              <div className="kithna-food-trade-columns">
                <section className="dp-merchant-section">
                  <h2 className="dp-merchant-section-title">Shop</h2>

                  <div className="kithna-food-trade-summary">
                    <div className="kithna-food-offer-box">
                      <span className="kithna-food-offer-label">
                        Kennith's Goods
                      </span>
                      <strong>0</strong>
                    </div>

                    <div className="kithna-food-offer-box">
                      <span className="kithna-food-offer-label">
                        Your Inventory
                      </span>
                      <strong>0</strong>
                    </div>
                  </div>

                  <div className="kithna-food-trade-balance">
                    Trade Balance: 0 Dots
                  </div>

                  <div className="kithna-food-trade-list">
                    <div className="kithna-food-trade-row">
                      <span className="kithna-food-trade-name">
                        No items available
                      </span>
                      <span className="kithna-food-trade-cell">—</span>
                      <span className="kithna-food-trade-cell">—</span>
                      <span className="kithna-food-trade-cell">—</span>
                    </div>
                  </div>
                </section>

                <section className="dp-merchant-section">
                  <h2 className="dp-merchant-section-title">Your Inventory</h2>

                  <div className="kithna-food-user-inventory">
                    <p className="dp-merchant-item-copy">
                      Items available for trading will appear here once the
                      thrift store opens for business.
                    </p>
                  </div>
                </section>
              </div>
            </div>
          </div>

          <div className="dp-merchant-actions">
            <button type="button" className="dp-btn btn-gold" disabled>
              Complete Trade
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
