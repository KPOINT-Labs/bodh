"use client";

import { useCallback, useLayoutEffect, useRef } from "react";

export function useEvent<T extends (...args: unknown[]) => unknown>(
  handler: T
): T {
  const handlerRef = useRef(handler);

  useLayoutEffect(() => {
    handlerRef.current = handler;
  });

  return useCallback(
    ((...args: unknown[]) => handlerRef.current(...args)) as T,
    []
  );
}
