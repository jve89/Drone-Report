// client/src/sections/Pricing.tsx
type Tier = {
  name: string;
  price: string;
  badge: string;
  desc: string;
  features: string[];
  cta: string;
  href: string;
  emphasis?: boolean;
};

export default function Pricing() {
  const tiers: Tier[] = [
    {
      name: "Raw Draft",
      price: "$99",
      badge: "Fastest",
      desc: "System-generated draft with watermark. You finish the last 20%.",
      features: [
        "Structured PDF (cover, summary, findings)",
        "Thumbnails + references",
        "Traffic-light placeholders",
        "Your logo and client details",
        "Delivery ~24h",
      ],
      cta: "Get Raw Draft",
      href: "#intake",
    },
    {
      name: "Polished Report",
      price: "$199",
      badge: "Most popular",
      desc: "Human-reviewed and client-ready. Typos fixed, grading finalized.",
      features: [
        "Everything in Raw Draft",
        "Human review + edits",
        "Final grading and notes",
        "No watermark",
        "Delivery ~24h",
      ],
      cta: "Get Polished",
      href: "#intake",
      emphasis: true,
    },
  ];

  const headingId = "pricing-heading";

  return (
    <section id="pricing" className="py-16 bg-white" aria-labelledby={headingId}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center">
          <h2 id={headingId} className="text-3xl font-bold text-gray-900">
            Pricing
          </h2>
          <p className="mt-2 text-gray-600">Simple choices. Pay per report. No subscriptions required.</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
            <span className="h-2 w-2 rounded-full bg-indigo-600" aria-hidden="true" />
            Typical turnaround within 24 hours
          </div>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {tiers.map((t, i) => (
            <article
              key={t.name}
              className={`rounded-2xl border p-6 shadow-sm ${
                t.emphasis ? "border-indigo-200 bg-indigo-50" : "border-gray-100 bg-gray-50"
              }`}
              aria-labelledby={`tier-title-${i}`}
              aria-describedby={`tier-desc-${i}`}
            >
              <header className="flex items-center justify-between">
                <h3 id={`tier-title-${i}`} className="text-xl font-semibold text-gray-900">
                  {t.name}
                </h3>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    t.emphasis ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-800"
                  }`}
                >
                  {t.badge}
                </span>
              </header>

              <p id={`tier-desc-${i}`} className="mt-2 text-gray-600">
                {t.desc}
              </p>

              <div className="mt-4 text-4xl font-bold" aria-label={`Price ${t.price}`}>
                {t.price}
              </div>

              <ul className="mt-6 space-y-2 text-gray-700">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-gray-400" aria-hidden="true" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                <a
                  href={t.href}
                  aria-label={`${t.cta} — ${t.name}`}
                  className={`inline-flex items-center px-6 py-3 rounded-md font-medium transition-colors ${
                    t.emphasis
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "bg-gray-900 text-white hover:bg-gray-800"
                  }`}
                >
                  {t.cta}
                </a>
              </div>

              {t.name === "Raw Draft" && (
                <p className="mt-3 text-xs text-gray-500">
                  Clearly watermarked “DRAFT – not client-ready.” Findings unverified.
                </p>
              )}
            </article>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-gray-500">
          Need &gt;200 photos or ongoing work?{" "}
          <a href="#contact" className="underline hover:text-gray-700">
            Contact us
          </a>{" "}
          for custom pricing.
        </p>
      </div>
    </section>
  );
}
