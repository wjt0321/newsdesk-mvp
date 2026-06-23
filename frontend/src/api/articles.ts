import { api } from "./client";
import type { Article } from "./types";

export interface ArticleListParams {
  source_id?: number;
  hours?: number;
  limit?: number;
  offset?: number;
}

export function listArticles(params: ArticleListParams = {}) {
  return api.get<Article[]>("/articles", { params }).then((res) => res.data);
}
