/**
 * Tool functions for the competitive_reviews table.
 * Used by the Review Agent (Session 1) to read and write review data.
 */

import { db } from "../db/index.js";
import { competitiveReviews } from "../db/schema.js";
import { eq, sql, and, gte, lte, like } from "drizzle-orm";

/** Get all reviews, optionally filtered by competitor */
export function getReviews(opts?: { competitor?: string; limit?: number }) {
  let query = db.select().from(competitiveReviews).$dynamic();

  if (opts?.competitor) {
    query = query.where(eq(competitiveReviews.competitor, opts.competitor));
  }

  if (opts?.limit) {
    query = query.limit(opts.limit);
  }

  return query;
}

/** Get review counts grouped by competitor */
export function getReviewCountsByCompetitor() {
  return db
    .select({
      competitor: competitiveReviews.competitor,
      count: sql<number>`COUNT(*)`,
      avgRating: sql<number>`ROUND(AVG(${competitiveReviews.rating}), 2)`,
    })
    .from(competitiveReviews)
    .groupBy(competitiveReviews.competitor);
}

/** Get rating distribution for a competitor */
export function getRatingDistribution(competitor?: string) {
  let query = db
    .select({
      rating: competitiveReviews.rating,
      count: sql<number>`COUNT(*)`,
    })
    .from(competitiveReviews)
    .$dynamic();

  if (competitor) {
    query = query.where(eq(competitiveReviews.competitor, competitor));
  }

  return query.groupBy(competitiveReviews.rating);
}

/** Get reviews filtered by rating range (e.g., negative reviews: 1-3) */
export function getReviewsByRating(minRating: number, maxRating: number, opts?: { competitor?: string; limit?: number }) {
  const conditions = [
    gte(competitiveReviews.rating, minRating),
    lte(competitiveReviews.rating, maxRating),
  ];

  if (opts?.competitor) {
    conditions.push(eq(competitiveReviews.competitor, opts.competitor));
  }

  let query = db
    .select()
    .from(competitiveReviews)
    .where(and(...conditions))
    .$dynamic();

  if (opts?.limit) {
    query = query.limit(opts.limit);
  }

  return query;
}

/** Search reviews by keyword in title or body */
export function searchReviews(keyword: string, opts?: { competitor?: string; limit?: number }) {
  const pattern = `%${keyword}%`;
  const conditions = [
    sql`(${competitiveReviews.title} LIKE ${pattern} OR ${competitiveReviews.body} LIKE ${pattern})`,
  ];

  if (opts?.competitor) {
    conditions.push(eq(competitiveReviews.competitor, opts.competitor));
  }

  let query = db
    .select()
    .from(competitiveReviews)
    .where(and(...conditions))
    .$dynamic();

  if (opts?.limit) {
    query = query.limit(opts.limit);
  }

  return query;
}

/** Update enrichment fields (sentiment, themes) for a review */
export function updateReviewEnrichment(
  reviewId: string,
  enrichment: { sentimentScore?: number; themes?: string[] }
) {
  return db
    .update(competitiveReviews)
    .set({
      sentimentScore: enrichment.sentimentScore,
      themes: enrichment.themes ? JSON.stringify(enrichment.themes) : undefined,
    })
    .where(eq(competitiveReviews.reviewId, reviewId));
}

/** Insert a new review (used when scraping new data via Node.js) */
export function insertReview(review: {
  competitor: string;
  product: string;
  sourcePlatform: string;
  reviewId: string;
  date?: string;
  rating?: number;
  title?: string;
  body?: string;
  reviewerName?: string;
  isVerified?: boolean;
  isRecommended?: boolean;
  helpfulCount?: number;
  reviewerAttributes?: string;
}) {
  return db.insert(competitiveReviews).values({
    ...review,
    scrapedAt: new Date().toISOString(),
  });
}
