import { goto, invalidate } from "$app/navigation";
import { resolve } from "$app/paths";
import { client } from "$lib/orpc";
import type {
  AffiliatePayoutAccount,
  SubmitPayoutAccountInput,
} from "$lib/schemas/affiliate";
import { submitPayoutAccountInputSchema } from "$lib/schemas/affiliate";
import { getErrorMessage } from "$lib/utils/error-messages";
import { ORPCError } from "@orpc/client";
import { untrack } from "svelte";
import { toast } from "svelte-sonner";
import { defaults, superForm } from "sveltekit-superforms";
import { valibotClient } from "sveltekit-superforms/adapters";

const submitPayoutAccount = async (input: SubmitPayoutAccountInput) => {
  try {
    await client.affiliate.submitPayoutAccount(input);
    toast.success("Data payout tersimpan.", { position: "top-right" });
    await invalidate("affiliate:summary");
  } catch (error) {
    if (error instanceof ORPCError) {
      if (error.code === "UNAUTHORIZED") {
        await goto(resolve("/(auth)/login"));
        return;
      }
      toast.error(getErrorMessage(error), { position: "top-right" });
    } else if (error instanceof Error) {
      toast.error(getErrorMessage(error), { position: "top-right" });
    } else {
      toast.error("Data payout belum bisa disimpan. Coba lagi sebentar.", {
        position: "top-right",
      });
    }
  }
};

export const createPayoutForm = (account: AffiliatePayoutAccount | null) => {
  const initialAccount = untrack(() => account);

  const form = superForm(
    defaults<SubmitPayoutAccountInput>(
      {
        accountHolderName: initialAccount?.accountHolderName ?? "",
        accountNumber: initialAccount?.accountNumber ?? "",
        bankName: initialAccount?.bankName ?? "",
        method: initialAccount?.method ?? "GOPAY",
        whatsappNumber: initialAccount?.whatsappNumber ?? "",
      },
      valibotClient(submitPayoutAccountInputSchema)
    ),
    {
      SPA: true,
      dataType: "json",
      onUpdate: async ({ form: submittedForm }) => {
        if (!submittedForm.valid) {
          return;
        }
        await submitPayoutAccount(submittedForm.data);
      },
      resetForm: false,
      validators: valibotClient(submitPayoutAccountInputSchema),
    }
  );

  const { form: formData, enhance, errors, submitting } = form;

  return { enhance, errors, form, formData, submitting };
};

export type AffiliatePayoutForm = ReturnType<typeof createPayoutForm>;
export type AffiliatePayoutFormObject = AffiliatePayoutForm["form"];
export type AffiliatePayoutFormData = AffiliatePayoutFormObject["form"];
