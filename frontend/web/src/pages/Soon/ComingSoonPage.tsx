import "./ComingSoonPage.css";

type ComingSoonPageProps = {
  pageName?: string;
};

export function ComingSoonPage({
  pageName = "This Area",
}: ComingSoonPageProps) {
  return (
    <main className="comingSoonPage">
      <section className="comingSoonCard">
        <h1 className="comingSoonTitle">Coming Soon</h1>

        <p className="comingSoonSubtitle">{pageName} is under construction.</p>

        <p className="comingSoonText">
          The Kith maintenance crew found exactly one wrench, three snacks, and
          absolutely no project manager. We&apos;re building this zone soon.
        </p>
      </section>
    </main>
  );
}
