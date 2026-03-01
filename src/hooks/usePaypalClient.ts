"use client";

import { useCallback, useEffect, useState } from "react";
import { DISPATCH_ACTION, usePayPalScriptReducer } from "@paypal/react-paypal-js";

let sdkLoadedOnce = false;

export function usePaypalClient(shouldPrefetch: boolean = false) {
  const [{ isPending, isResolved, isRejected, options }, dispatch] = usePayPalScriptReducer();
  const [hasRequestedLoad, setHasRequestedLoad] = useState(sdkLoadedOnce);

  const ensureReady = useCallback(() => {
    if (sdkLoadedOnce) {
      return;
    }

    setHasRequestedLoad(true);
    dispatch({ type: DISPATCH_ACTION.RESET_OPTIONS, value: options });
  }, [dispatch, options]);

  useEffect(() => {
    if (shouldPrefetch) {
      ensureReady();
    }
  }, [ensureReady, shouldPrefetch]);

  useEffect(() => {
    if (isResolved) {
      sdkLoadedOnce = true;
      setHasRequestedLoad(true);
    }
  }, [isResolved]);

  return {
    ensureReady,
    ready: sdkLoadedOnce || isResolved,
    loading: !sdkLoadedOnce && hasRequestedLoad && isPending,
    failed: isRejected,
  };
}
