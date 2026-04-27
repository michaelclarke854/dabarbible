# Blog Posts

Add new blog posts as `.md` files in this directory. Each file must include frontmatter:

```md
---
slug: my-post-slug
title: My Post Title
metaDescription: Short SEO description (<160 chars).
keywords: comma, separated, keywords
order: 10
---

## Markdown content here

Body of the article...
```

Posts are picked up automatically by `src/data/blogArticles.ts` via Vite's
`import.meta.glob`. Markdown posts are merged with any legacy entries in that
file; if a slug appears in both, the markdown file wins. Articles are sorted by
the optional `order` field (ascending), then by title.