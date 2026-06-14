"use client";

import { useEffect, useState } from "react";

/**
 * Returns true once we've confirmed (client-side) that a WebGL context can be
 * created. Lets the 3D components render nothing instead of throwing in
 * environments without GPU/WebGL (headless, locked-down browsers, etc.).
 */
export function useHasWebGL(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl");
      setOk(!!gl);
    } catch {
      setOk(false);
    }
  }, []);
  return ok;
}
