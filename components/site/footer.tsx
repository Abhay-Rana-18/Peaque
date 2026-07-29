import { Play, AtSign, Globe, Mail } from "lucide-react";
import { Logo } from "./logo";

const socials = [
  { href: "https://youtube.com", label: "YouTube", icon: Play },
  { href: "https://x.com", label: "X (Twitter)", icon: AtSign },
  { href: "https://dribbble.com", label: "Portfolio", icon: Globe },
  { href: "mailto:hello@peaque.studio", label: "Email", icon: Mail },
];

export function Footer() {
  return (
    <footer className="border-t-2 border-ink/15 px-5 py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 md:flex-row md:justify-between">
        <div className="text-center md:text-left">
          <a href="#top" className="text-2xl">
            <Logo animated={false} />
          </a>
          <p className="mt-3 font-hand text-xl text-ink/60">
            motion & web studio for AI SaaS
          </p>
        </div>

        <nav className="flex gap-6 text-sm font-medium text-ink/70">
          <a href="#work" className="transition-colors hover:text-ink">
            Work
          </a>
          <a href="#services" className="transition-colors hover:text-ink">
            Services
          </a>
          <a href="#process" className="transition-colors hover:text-ink">
            Process
          </a>
          <a href="#contact" className="transition-colors hover:text-ink">
            Contact
          </a>
        </nav>

        <div className="flex gap-4">
          {socials.map((s) => (
            <a
              key={s.label}
              href={s.href}
              aria-label={s.label}
              className="flex size-10 items-center justify-center rounded-full border-2 border-ink/30 text-ink/70 transition-all hover:-rotate-6 hover:border-ink hover:text-ink"
            >
              <s.icon size={18} />
            </a>
          ))}
        </div>
      </div>

      <p className="mt-10 text-center font-hand text-xl text-ink/50">
        © 2026 Peaque — drawn, animated & shipped by hand ✳
      </p>
    </footer>
  );
}
