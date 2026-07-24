import { goto, invalidate } from "$app/navigation";
import { resolve } from "$app/paths";
import { client } from "$lib/orpc";
import type {
  ApplyAffiliateInput,
  AffiliateApplication,
} from "$lib/schemas/affiliate";
import { applyAffiliateInputSchema } from "$lib/schemas/affiliate";
import { ORPCError } from "@orpc/client";
import { untrack } from "svelte";
import { toast } from "svelte-sonner";
import { defaults, superForm } from "sveltekit-superforms";
import { valibotClient } from "sveltekit-superforms/adapters";

const submitApplication = async (input: ApplyAffiliateInput) => {
  try {
    await client.affiliate.apply(input);
    toast.success("Aplikasi terkirim. Tunggu kabar dari kami!", {
      position: "top-right",
    });
    await invalidate("affiliate:summary");
  } catch (error) {
    if (error instanceof ORPCError) {
      if (error.code === "UNAUTHORIZED") {
        await goto(resolve("/(auth)/login"));
        return;
      }
      toast.error(error.message, { position: "top-right" });
    } else if (error instanceof Error) {
      toast.error(error.message, { position: "top-right" });
    } else {
      toast.error("Aplikasi belum bisa dikirim. Coba lagi sebentar.", {
        position: "top-right",
      });
    }
  }
};

export const createApplyForm = (application: AffiliateApplication | null) => {
  const initialApplication = untrack(() => application);

  const form = superForm(
    defaults<ApplyAffiliateInput>(
      {
        advantage: initialApplication?.advantage ?? "",
        instagramHandle: initialApplication?.instagramHandle ?? "",
        tiktokHandle: initialApplication?.tiktokHandle ?? "",
        youtubeHandle: initialApplication?.youtubeHandle ?? "",
      },
      valibotClient(applyAffiliateInputSchema)
    ),
    {
      SPA: true,
      dataType: "json",
      onUpdate: async ({ form: submittedForm }) => {
        if (!submittedForm.valid) {
          return;
        }
        await submitApplication(submittedForm.data);
      },
      resetForm: false,
      validators: valibotClient(applyAffiliateInputSchema),
    }
  );

  const { form: formData, enhance, submitting } = form;

  return { enhance, form, formData, submitting };
};

export type AffiliateApplyForm = ReturnType<typeof createApplyForm>;
export type AffiliateApplyFormObject = AffiliateApplyForm["form"];
export type AffiliateApplyFormData = AffiliateApplyFormObject["form"];
