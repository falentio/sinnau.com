import { goto } from "$app/navigation";
import { resolve } from "$app/paths";
import { page } from "$app/state";
import { client } from "$lib/orpc";
import type { CreateQuizInput } from "$lib/schemas/quiz";
import { createQuizInputSchema } from "$lib/schemas/quiz";
import { ORPCError } from "@orpc/client";
import { toast } from "svelte-sonner";
import { defaults, superForm } from "sveltekit-superforms";
import { valibotClient } from "sveltekit-superforms/adapters";

export const getDefaultOptions = (
  type: CreateQuizInput["type"]
): CreateQuizInput["options"] => {
  switch (type) {
    case "MULTIPLE_CHOICE": {
      return [
        { explanation: "", isCorrect: true, optionText: "" },
        { explanation: "", isCorrect: false, optionText: "" },
        { explanation: "", isCorrect: false, optionText: "" },
        { explanation: "", isCorrect: false, optionText: "" },
      ];
    }
    case "MULTIPLE_SELECT": {
      return [
        { explanation: "", isCorrect: false, optionText: "" },
        { explanation: "", isCorrect: false, optionText: "" },
        { explanation: "", isCorrect: false, optionText: "" },
      ];
    }
    default: {
      return [
        { explanation: "", isCorrect: true, optionText: "" },
        { explanation: "", isCorrect: false, optionText: "" },
        { explanation: "", isCorrect: false, optionText: "" },
        { explanation: "", isCorrect: false, optionText: "" },
      ];
    }
  }
};

export const createQuizForm = () => {
  const studySetId = page.params.studySetId ?? "";
  const quizListHref = resolve("/(app)/study/[studySetId]/quiz", {
    studySetId,
  });

  const submitQuiz = async (data: CreateQuizInput) => {
    try {
      await client.quiz.create(data);
      toast.success("Quiz berhasil dibuat.", { position: "top-right" });
      await goto(quizListHref);
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
        toast.error("Quiz belum bisa dibuat. Coba lagi sebentar.", {
          position: "top-right",
        });
      }
    }
  };

  const superFormResult = superForm(
    defaults<CreateQuizInput>(
      {
        chapterId: undefined,
        options: getDefaultOptions("MULTIPLE_CHOICE"),
        questionText: "",
        studySetId: page.params.studySetId ?? "",
        type: "MULTIPLE_CHOICE",
      },
      valibotClient(createQuizInputSchema)
    ),
    {
      SPA: true,
      dataType: "json",
      onUpdate: async ({ form: submittedForm }) => {
        if (!submittedForm.valid) {
          return;
        }
        await submitQuiz(submittedForm.data);
      },
      resetForm: false,
      validators: valibotClient(createQuizInputSchema),
    }
  );

  return {
    form: superFormResult,
    quizListHref,
  };
};

export type CreateQuiz = ReturnType<typeof createQuizForm>;
export type CreateQuizForm = CreateQuiz["form"];
export type CreateQuizFormData = CreateQuiz["form"]["form"];
