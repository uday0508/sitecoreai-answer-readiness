import type { ClientSDK } from "@sitecore-marketplace-sdk/client";

/**
 * Optional SitecoreAI Brand Review integration.
 *
 * Runs through the Marketplace client so the host handles the authenticated
 * AI Skills API call. The deterministic AEO/GEO scoring engine does not depend
 * on this feature. AI analysis is additive and failure-tolerant.
 */
export async function runBrandReview(
  client: ClientSDK,
  sitecoreContextId: string,
  brandkitId: string,
  text: string
) {
  return client.mutate("ai.skills.generateBrandReview", {
    params: {
      query: {
        sitecoreContextId,
      },
      body: {
        brandkitId,
        input: {
          content: text,
        },
      },
    },
  });
}