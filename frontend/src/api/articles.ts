import { api } from "./client";
import type { Article } from "./types";

export interface ArticleListParams {
  limit?: number;
  offset?: number;
  source_id?: number;
  hours?: number;
  q?: string;
  start?: string;
  end?: string;
}

export function listArticles(params: ArticleListParams = {}) {
  return api.get<Article[]>("/articles", { params }).then((res) => res.data);
}

export function searchArticles(q: string, params: Omit<ArticleListParams, "q"> = {}) {
  return listArticles({ ...params, q });
}

export function getArticle(id: number) {
  return api.get<Article>(`/articles/${id}`).then((res) => res.data);
}
