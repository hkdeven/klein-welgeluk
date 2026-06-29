import { useCallback, useEffect, useState } from "react";

export interface Page {
  id: string;
  title: string;
  slug: string;
  parent_id: string | null;
  brief?: string;
  created_at: string;
  updated_at: string;
  children?: Page[];
}

export function usePages() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPages = useCallback(async () => {
    try {
      const res = await fetch("/api/pages");
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      // Build tree structure
      const pagesData = data.pages as Page[];
      const pageMap = new Map<string, Page>();
      const rootPages: Page[] = [];

      pagesData.forEach((page) => {
        pageMap.set(page.id, { ...page, children: [] });
      });

      pagesData.forEach((page) => {
        const pageNode = pageMap.get(page.id)!;
        if (page.parent_id) {
          const parent = pageMap.get(page.parent_id);
          if (parent) {
            parent.children = parent.children || [];
            parent.children.push(pageNode);
          } else {
            rootPages.push(pageNode);
          }
        } else {
          rootPages.push(pageNode);
        }
      });

      setPages(rootPages);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch pages");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  return { pages, loading, error, refetch: fetchPages };
}
