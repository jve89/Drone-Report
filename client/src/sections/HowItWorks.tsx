// client/src/sections/HowItWorks.tsx
export default function HowItWorks() {
  const steps = [
    { title: "1. Upload & Pay", text: "Choose Raw Draft or Polished. Add notes and upload images/logo." },
    { title: "2. Auto-draft", text: "We assemble an 80% report: structure, thumbnails, grading placeholders." },
    { title: "3. Deliver", text: "You receive a draft PDF. Keep as Raw Draft or get a human-polished final." },
  ];

  return (
    <section id="how-it-works" aria-labelledby="how-heading" className="py-16 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        {/* Heading + SLA badge */}
        <div className="flex flex-col items-center text-center">
          <h2 id="how-heading" className="text-3xl font-bold text-gray-900">
            How it works
          </h2>
          <p className="mt-2 max-w-2xl text-gray-600">
            Three steps from images to inspection-grade PDF.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
            <span className="h-2 w-2 rounded-full bg-indigo-600" aria-hidden="true" />
            Typical turnaround within 24 hours
          </div>
        </div>

        {/* Steps */}
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className="rounded-xl border border-gray-100 bg-gray-50 p-6 text-center shadow-sm"
              aria-labelledby={`step-title-${i}`}
              aria-describedby={`step-text-${i}`}
            >
              <h3 id={`step-title-${i}`} className="text-lg font-semibold text-gray-900">
                {s.title}
              </h3>
              <p id={`step-text-${i}`} className="mt-3 text-gray-600">
                {s.text}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <a
            href="#intake"
            aria-label="Start a new report at intake form"
            className="inline-flex items-center px-6 py-3 rounded-md bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
          >
            Start a report
          </a>
        </div>
      </div>
    </section>
  );
}
