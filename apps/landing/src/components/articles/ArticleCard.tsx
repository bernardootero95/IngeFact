import Link from "next/link";
import type { Article } from "@/data/articles";
import { formatArticleDate } from "@/components/articles/formatArticleDate";

export function ArticleCard({ article, headingLevel = "h2" }: { article: Article; headingLevel?: "h2" | "h3" }) {
  const Heading = headingLevel;
  return (
    <li className="rounded-brand-lg border border-neutralCustom-100 bg-white p-6 hover:border-brand-400">
      <Heading className="mb-2 text-[17px] font-bold leading-snug text-neutralCustom-800">
        <Link href={`/articulos/${article.slug}`} className="underline-offset-4 hover:text-brand-600 hover:underline">
          {article.title}
        </Link>
      </Heading>
      <p className="mb-3 text-sm leading-relaxed text-neutralCustom-500">{article.description}</p>
      <p className="text-xs text-neutralCustom-500">
        Actualizado el <time dateTime={article.updated}>{formatArticleDate(article.updated)}</time>
      </p>
    </li>
  );
}
