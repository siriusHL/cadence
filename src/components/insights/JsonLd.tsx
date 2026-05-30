// Emits a JSON-LD <script> for structured data (Schema.org). Kept as a server
// component so the markup is in the initial HTML for crawlers.
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe to inline; we additionally escape "<" to
      // avoid any chance of breaking out of the script element.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
