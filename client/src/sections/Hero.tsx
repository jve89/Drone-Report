// client/src/sections/Hero.tsx
export default function Hero() {
  const headingId = "hero-title";
  return (
    <section id="hero" className="bg-white" aria-labelledby={headingId}>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center md:justify-between p-8 md:p-16 gap-10">
        {/* Text content */}
        <div className="flex-1 text-center md:text-left md:max-w-xl">
          <h1 id={headingId} className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900">
            Turn drone photos into client-ready reports.
          </h1>

          <p className="mt-6 text-xl text-gray-600">
            Upload your images. Get a structured PDF with findings and recommendations.{" "}
            <span className="font-medium">Raw Draft or Polished—your choice.</span>
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 sm:justify-start">
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700">
              24h turnaround
            </span>
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700">
              Branded PDFs
            </span>
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700">
              Traffic-light grading
            </span>
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700">
              Human-in-the-loop accuracy
            </span>
          </div>

          {/* CTA buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 md:justify-start">
            <a
              href="/signup"
              className="inline-flex items-center rounded-lg bg-black px-6 py-3 text-sm font-medium text-white hover:bg-gray-800"
            >
              Sign up
            </a>
            <a
              href="/login"
              className="inline-flex items-center rounded-lg border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Log in
            </a>
          </div>
        </div>

        {/* Visual */}
        <div className="flex-1 max-w-md overflow-hidden rounded-xl shadow-lg">
          <img
            src="/og-image.png"
            alt="DroneReport example report preview"
            className="w-full h-full object-contain"
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
    </section>
  );
}
