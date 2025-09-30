// client/src/sections/WhatYouGet.tsx
export default function WhatYouGet() {
  const items = [
    { title: "Executive summary", text: "Clear findings and top actions." },
    { title: "Findings table", text: "Issue, location, severity, reference image." },
    { title: "Traffic-light grading", text: "Green / Amber / Red with rationale." },
    { title: "Annotated thumbnails", text: "Cropped views and callouts." },
    { title: "Recommendations", text: "Prioritized next steps and monitoring." },
    { title: "Branded PDF", text: "Your logo, client details, dates, project name." },
  ];

  const headingId = "wyg-heading";

  return (
    <section id="what-you-get" className="py-16 bg-white" aria-labelledby={headingId}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center">
          <h2 id={headingId} className="text-3xl font-bold text-gray-900">What you get</h2>
          <p className="mt-2 text-gray-600">A professional, inspection-grade PDF ready for your client.</p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {items.map((it, i) => (
            <div
              key={it.title}
              className="rounded-xl border border-gray-100 bg-gray-50 p-6 shadow-sm"
              aria-labelledby={`wyg-title-${i}`}
              aria-describedby={`wyg-text-${i}`}
            >
              <h3 id={`wyg-title-${i}`} className="text-lg font-semibold text-gray-900">{it.title}</h3>
              <p id={`wyg-text-${i}`} className="mt-2 text-gray-600">{it.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <a
            href="#intake"
            className="inline-flex items-center px-6 py-3 rounded-md bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
          >
            Start a report
          </a>
        </div>
      </div>
    </section>
  );
}
