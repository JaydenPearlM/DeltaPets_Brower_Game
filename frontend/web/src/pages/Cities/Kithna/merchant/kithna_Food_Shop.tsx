import "../../Merchant_global_styles.css";
import "./kithna_Food_Shop.css";

export default function KithnaFoodShop() {
  return (
    <main className="dp-merchant-page kithna-food-shop">
      <div className="dp-merchant-shell">
        <section className="dp-merchant-panel dp-standard-panel">
          <header className="dp-merchant-header">
            <div className="dp-merchant-avatar" aria-label="Merchant art placeholder">
              Human
              <br />
              Placeholder
            </div>

            <div className="dp-merchant-heading">
              <h1 className="dp-merchant-name">Merchant Name</h1>
              <p className="dp-merchant-shop-name">Kithna Food Shop</p>
            </div>

            <div className="dp-merchant-wallets">
              <div className="dp-merchant-wallet">
                <span className="dp-merchant-wallet-label">Merchant Dots</span>
                <span className="dp-merchant-wallet-value">—</span>
              </div>

              <div className="dp-merchant-wallet">
                <span className="dp-merchant-wallet-label">User Dots</span>
                <span className="dp-merchant-wallet-value">—</span>
              </div>
            </div>
          </header>

          <div className="dp-merchant-content">
            <section className="dp-merchant-section">
              <h2 className="dp-merchant-section-title">Shop Inventory</h2>

              <div className="dp-merchant-item-grid">
                <article className="dp-merchant-item">
                  <h3 className="dp-merchant-item-name">Meat</h3>
                  <p className="dp-merchant-item-copy">
                    Fresh cuts harvested from Kithna's meat tree.
                  </p>
                  <p className="dp-merchant-item-price">5 Dots</p>
                </article>

                <article className="dp-merchant-item">
                  <h3 className="dp-merchant-item-name">Vegetables</h3>
                  <p className="dp-merchant-item-copy">
                    Simple vegetables grown in Kithna's garden.
                  </p>
                  <p className="dp-merchant-item-price">5 Dots</p>
                </article>
              </div>
            </section>

            <aside className="dp-merchant-section dp-merchant-info">
              <h2 className="dp-merchant-section-title">Merchant Info</h2>

              <div
                className="dp-merchant-foreground"
                aria-label="Large merchant art placeholder"
              >
                Large Human Merchant
                <br />
                Art Placeholder
              </div>

              <p className="dp-merchant-dialogue">
                Welcome in. The meat tree was generous this morning, and the
                garden behaved itself for once.
              </p>

              <div className="dp-merchant-daily">
                <h3 className="dp-merchant-daily-title">Daily Food</h3>
                <p className="dp-merchant-daily-copy">
                  10 Meat + 10 Vegetables once every 24 hours.
                </p>
              </div>

              <button type="button" className="dp-btn dp-btn-purple">
                Any News?
              </button>
            </aside>
          </div>

          <div className="dp-merchant-actions">
            <button type="button" className="dp-btn btn-gold">
              Buy
            </button>
            <button type="button" className="dp-btn dp-btn-blue">
              Sell
            </button>
            <button type="button" className="dp-btn dp-btn-purple">
              About Kithna
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
