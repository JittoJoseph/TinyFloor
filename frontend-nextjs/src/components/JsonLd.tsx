import type { Schema } from "@/lib/structured-data";

/** Structured data, rendered on the server so crawlers find it in the first HTML. */
export function JsonLd({ schema }: { schema: Schema }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
      }}
    />
  );
}
