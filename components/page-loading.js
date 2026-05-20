function LoadingCard({ tall = false }) {
  return (
    <div className={`loading-card ${tall ? "loading-card-tall" : ""}`}>
      <div className="loading-line loading-line-pill" />
      <div className="loading-line loading-line-title" />
      <div className="loading-line loading-line-wide" />
      <div className="loading-line loading-line-medium" />
      {tall ? <div className="loading-line loading-line-wide" /> : null}
    </div>
  );
}

export default function PageLoading() {
  return (
    <div className="space-y-8">
      <section className="panel overflow-hidden px-6 py-8 sm:px-8 sm:py-10">
        <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="loading-line loading-line-pill" />
            <div className="space-y-3">
              <div className="loading-line loading-line-hero" />
              <div className="loading-line loading-line-hero-short" />
            </div>
            <div className="space-y-3">
              <div className="loading-line loading-line-wide" />
              <div className="loading-line loading-line-wide" />
              <div className="loading-line loading-line-medium" />
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="loading-button" />
              <div className="loading-button loading-button-secondary" />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <LoadingCard />
              <LoadingCard />
              <LoadingCard />
            </div>
          </div>

          <LoadingCard tall />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <LoadingCard />
        <LoadingCard />
      </section>
    </div>
  );
}
