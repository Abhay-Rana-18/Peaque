import { AsteriskStatic } from "./doodles";

const items = [
  "Motion Graphics",
  "Product Explainers",
  "AI SaaS Websites",
  "Launch Films",
  "Brand Reels",
  "Landing Pages",
];

function Row() {
  return (
    <div className="flex shrink-0 items-center">
      {items.map((item, i) => (
        <span key={item} className="flex items-center">
          <span
            className={
              i % 2 === 0
                ? "px-8 font-heading text-xl font-extrabold uppercase tracking-tight text-ink/80 md:text-2xl"
                : "px-8 font-hand text-2xl text-moss md:text-3xl"
            }
          >
            {item}
          </span>
          <AsteriskStatic className="w-4 shrink-0 text-sage md:w-5" />
        </span>
      ))}
    </div>
  );
}

export function Marquee() {
  return (
    <section
      aria-hidden
      className="overflow-hidden border-y border-ink/15 py-5"
    >
      <div className="animate-marquee flex w-max">
        <Row />
        <Row />
      </div>
    </section>
  );
}
