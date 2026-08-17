import Link from "next/link";
import { BRAND } from "@/lib/config";

/** Wordmark. Reads BRAND.name from config, so renaming is a one-line edit. */
export default function BrandMark({ href = "/" }: { href?: string }) {
  return (
    <Link className="brand" href={href}>
      <span className="brand-glyph" aria-hidden="true">
        ▲
      </span>
      <span>{BRAND.name}</span>
    </Link>
  );
}
