import { ClientSDK } from "@sitecore-marketplace-sdk/client";
import { XMC } from "@sitecore-marketplace-sdk/xmc";
import { AI } from "@sitecore-marketplace-sdk/ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface MarketplaceClientState {
  client: ClientSDK | null;
  error: Error | null;
  isLoading: boolean;
  isInitialized: boolean;
}

let sharedClient: ClientSDK | undefined;

async function getMarketplaceClient() {
  if (sharedClient) return sharedClient;

  sharedClient = await ClientSDK.init({
    target: window.parent,
    modules: [XMC, AI],
  });

  return sharedClient;
}

export function useMarketplaceClient() {
  const [state, setState] = useState<MarketplaceClientState>({
    client: null,
    error: null,
    isLoading: true,
    isInitialized: false,
  });
  const initializing = useRef(false);

  const initialize = useCallback(async () => {
    if (initializing.current || state.isInitialized) return;
    initializing.current = true;
    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      const client = await getMarketplaceClient();
      setState({
        client,
        error: null,
        isLoading: false,
        isInitialized: true,
      });
    } catch (error) {
      setState({
        client: null,
        error: error instanceof Error ? error : new Error("Failed to initialize Marketplace SDK."),
        isLoading: false,
        isInitialized: false,
      });
    } finally {
      initializing.current = false;
    }
  }, [state.isInitialized]);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return useMemo(() => ({ ...state, initialize }), [state, initialize]);
}