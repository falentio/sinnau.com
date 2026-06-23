import { goto } from "$app/navigation";
import { resolve } from "$app/paths";
import { page } from "$app/state";
import { client } from "$lib/orpc";
import { createQuizSessionInputSchema } from "$lib/schemas/quiz-session";
import { ORPCError } from "@orpc/client";
import { toast } from "svelte-sonner";
import { defaults, superForm } from "sveltekit-superforms";
import { valibotClient } from "sveltekit-superforms/adapters";
import * as v from "valibot";

export const newSessionForm = () => {
  const studySetId = page.params.studySetId ?? "";

  const formSchema = v.omit(createQuizSessionInputSchema, ["studySetId"]);

  const submitSession = async (data: v.InferInput<typeof formSchema>) => {
    const studySetIdForHref = page.params.studySetId ?? "";
    try {
      const session = await client.quizSession.create({
        ...data,
        studySetId,
      });
      toast.success("Sesi baru dibuat.", { position: "top-right" });
      await goto(
        resolve("/(app)/session/[studySetId]/quiz/[sessionId]", {
          sessionId: session.id,
          studySetId: studySetIdForHref,
        })
      );
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
        toast.error("Sesi belum bisa dibuat. Coba lagi sebentar.", {
          position: "top-right",
        });
      }
    }
  };

  const superFormResult = superForm(
    defaults<v.InferInput<typeof formSchema>>(
      { chapterId: "" },
      valibotClient(formSchema)
    ),
    {
      SPA: true,
      onUpdate: async ({ form: submittedForm }) => {
        if (!submittedForm.valid) {
          return;
        }
        const { chapterId } = submittedForm.data;
        await submitSession({
          chapterId:
            chapterId !== undefined && chapterId.length > 0
              ? chapterId
              : undefined,
        });
      },
      resetForm: false,
      validators: valibotClient(formSchema),
    }
  );

  const realSubmit = superFormResult.submit;
  superFormResult.submit = async () => {
    superFormResult.form.update((form) => ({
      ...form,
      chapterId: form.chapterId === "" ? undefined : form.chapterId,
    }));
    await realSubmit();
  };

  return { form: superFormResult };
};

export type NewSession = ReturnType<typeof newSessionForm>;
export type NewSessionForm = NewSession["form"];
