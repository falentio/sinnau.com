import { createServerClient } from "$lib/orpc.server";
import { redirect } from "@sveltejs/kit";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, params }) => {
  const client = createServerClient();

  let initialCheck;
  try {
    initialCheck = await client.generate.check({ id: params.genId });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "NOT_FOUND"
    ) {
      redirect(307, "/home");
    }
    throw error;
  }

  if (initialCheck.status === "COMPLETED") {
    redirect(307, `/study/${initialCheck.studySetId}`);
  }
  console.log("initialCheck", initialCheck);
  return {
    generateId: params.genId,
    initialCheck,
    studySetId: initialCheck.studySetId,
  };
};
