import { Reveal } from "./reveal";

const reasons = [
  {
    number: "01",
    title: "Story first",
    blurb:
      "We start with the words and the why. Pixels only move once the message is sharp.",
  },
  {
    number: "02",
    title: "Motion native",
    blurb:
      "Animation isn't a garnish we sprinkle on at the end — it's how we think from frame one.",
  },
  {
    number: "03",
    title: "Built for AI SaaS",
    blurb:
      "We've explained models, agents and copilots before. Your product won't scare us.",
  },
  {
    number: "04",
    title: "One team, no handoffs",
    blurb:
      "Script, design, motion and code under one roof — nothing gets lost in translation.",
  },
  {
    number: "05",
    title: "Senior hands only",
    blurb:
      "The people on the call are the people doing the work. No mystery juniors.",
  },
  {
    number: "06",
    title: "Jargon-free process",
    blurb:
      "Clear timelines, honest feedback loops, and updates written like a human sent them.",
  },
];

export function Why() {
  return (
    <section id="why" className="scroll-mt-24 px-5 py-28 md:py-36">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="font-hand text-2xl text-moss md:text-3xl">why us</p>
          <h2 className="mt-3 font-heading text-4xl font-black tracking-tight text-ink md:text-6xl">
            We make product stories{" "}
            <span className="inline-block -rotate-2 font-hand font-semibold text-moss">
              personal.
            </span>
          </h2>
        </Reveal>

        <div className="mt-16 grid gap-x-12 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
          {reasons.map((r, i) => (
            <Reveal key={r.number} delay={(i % 3) * 0.1}>
              <div className="border-t-2 border-ink/15 pt-5">
                <span className="font-hand text-3xl text-sage">{r.number}</span>
                <h3 className="mt-2 font-heading text-xl font-bold text-ink">
                  {r.title}
                </h3>
                <p className="mt-2 leading-relaxed text-ink/70">{r.blurb}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
