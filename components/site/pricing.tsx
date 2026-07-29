import { Reveal } from "./reveal";
import { Squiggle } from "./doodles";

function Check({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 16"
      fill="none"
      aria-hidden
      filter="url(#pencil-stroke)"
      className={`w-4 shrink-0 ${className}`}
    >
      <path
        d="M2 9 C 5 10.5, 6.5 12.5, 7.5 14 C 9.5 9, 13.5 4, 18 2"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

const plans = [
  {
    name: "Explainer",
    price: "$3.5k",
    per: "per video",
    pitch: "One video that finally makes your product make sense.",
    features: [
      "60–90s product explainer",
      "Script, voiceover & sound design",
      "Two rounds of revisions",
      "Cutdowns for socials",
      "Delivered in 2–3 weeks",
    ],
    cta: "Book an explainer",
    featured: false,
  },
  {
    name: "Launch Kit",
    price: "$7.9k",
    per: "per launch",
    pitch: "Everything a launch day needs to actually land.",
    features: [
      "Launch film + teaser cuts",
      "Animated landing page hero",
      "Product demo, but cinematic",
      "Launch-day asset pack",
      "Delivered in 3–4 weeks",
    ],
    cta: "Plan my launch",
    featured: true,
  },
  {
    name: "The Full Story",
    price: "from $15k",
    per: "per project",
    pitch: "Website, film and a motion system that scales with you.",
    features: [
      "Full website — designed & built",
      "Brand film + explainer",
      "Motion design system",
      "Next.js build, shipped live",
      "Optional monthly retainer",
    ],
    cta: "Let's talk scope",
    featured: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-24 px-5 py-28 md:py-36">
      <div className="mx-auto max-w-6xl">
        <Reveal className="text-center">
          <p className="font-hand text-2xl text-moss md:text-3xl">simple pricing</p>
          <h2 className="mt-3 font-heading text-4xl font-black tracking-tight text-ink md:text-6xl">
            Pick a plan. Skip the{" "}
            <span className="relative inline-block">
              awkward
              <Squiggle className="absolute -bottom-2 left-0 w-full text-sage" delay={0.3} />
            </span>{" "}
            quote call.
          </h2>
        </Reveal>

        <div className="mt-16 grid items-stretch gap-8 md:grid-cols-3 md:gap-6 lg:gap-8">
          {plans.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 0.12} className="h-full">
              <div
                className={`relative flex h-full flex-col rounded-2xl border-2 p-8 ${
                  plan.featured
                    ? "border-ink bg-moss text-cream shadow-[6px_8px_0_var(--ink)] md:-translate-y-4"
                    : "border-ink/20 bg-paper text-ink"
                }`}
              >
                {plan.featured && (
                  <span className="absolute -top-4 right-6 -rotate-3 rounded-full border-2 border-ink bg-sand px-3 py-0.5 font-hand text-xl leading-snug text-ink">
                    most picked ✳
                  </span>
                )}

                <h3 className="font-heading text-xl font-bold">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="font-heading text-5xl font-black tracking-tight">
                    {plan.price}
                  </span>
                  <span
                    className={`font-hand text-xl ${
                      plan.featured ? "text-cream/70" : "text-ink/50"
                    }`}
                  >
                    {plan.per}
                  </span>
                </div>
                <p
                  className={`mt-3 leading-relaxed ${
                    plan.featured ? "text-cream/80" : "text-ink/70"
                  }`}
                >
                  {plan.pitch}
                </p>

                <ul className="mt-7 flex flex-col gap-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <Check
                        className={`mt-1 ${plan.featured ? "text-sand" : "text-moss"}`}
                      />
                      <span
                        className={plan.featured ? "text-cream/90" : "text-ink/80"}
                      >
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>

                <a
                  href="#contact"
                  className={`btn-sketch mt-8 justify-center text-base ${
                    plan.featured
                      ? "border-cream bg-cream !text-ink !shadow-[3px_3px_0_rgb(0_0_0/0.35)]"
                      : "btn-sketch-outline"
                  }`}
                >
                  {plan.cta}
                </a>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2}>
          <p className="mt-12 text-center font-hand text-xl text-ink/50">
            every plan includes source files, licensing, and honest opinions —
            no surprise invoices ✎
          </p>
        </Reveal>
      </div>
    </section>
  );
}
