import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = ({ setHeaders }) => {
  setHeaders({
    "cache-control": "public, max-age=86400",
  });
};
