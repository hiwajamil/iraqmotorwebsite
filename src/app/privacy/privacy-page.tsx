"use client";

import { privacyContent } from "@/lib/privacy-content";
import { useAppSelector } from "@/store/hooks";

export function PrivacyPage() {
  const locale = useAppSelector((s) => s.preferences.locale);
  const doc = privacyContent[locale];

  return (
    <article className="mx-auto max-w-3xl px-[4%] pb-20 pt-28">
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
        {doc.title}
      </h1>
      <p className="mt-2 text-sm text-muted">{doc.lastUpdated}</p>
      <p className="mt-6 text-base leading-7 text-foreground/90">{doc.intro}</p>

      {doc.sections.map((section) => (
        <section key={section.heading} className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">
            {section.heading}
          </h2>
          {section.paragraphs.map((p) => (
            <p
              key={p.slice(0, 48)}
              className="mt-3 text-base leading-7 text-foreground/90"
            >
              {p}
            </p>
          ))}
          {section.bullets ? (
            <ul className="mt-3 list-disc space-y-2 ps-5 text-base leading-7 text-foreground/90">
              {section.bullets.map((item) => (
                <li key={item.slice(0, 48)}>{item}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </article>
  );
}
