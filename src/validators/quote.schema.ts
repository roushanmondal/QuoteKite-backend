import { z } from "zod";

export const generateQuoteSchema = z.object({
  body: z.object({
    jobDescription: z.string().nonempty("Job description cannot be empty"),
  }),
});
