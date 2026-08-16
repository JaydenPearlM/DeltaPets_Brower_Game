import { useNavigate } from "react-router-dom";

type MerchantClosedPageProps = {
  merchantName: string;
};

export default function MerchantClosedPage({
  merchantName,
}: MerchantClosedPageProps) {
  const navigate = useNavigate();

  return (
    <main className="dp-merchant-closed-page">
      <section className="dp-merchant-closed-panel">
        <h1 className="dp-merchant-closed-title">Closed</h1>
        <p className="dp-merchant-closed-text">
          The {merchantName} hasn&apos;t opened for business yet. Coming soon.
        </p>
        <button
          type="button"
          className="dp-btn dp-btn--blue dp-merchant-closed-back-btn"
          onClick={() => navigate("/cities/kithna")}
        >
          Back to Kithna City
        </button>
      </section>
    </main>
  );
}
