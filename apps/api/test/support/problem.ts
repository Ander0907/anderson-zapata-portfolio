export interface Problem {
  type: string;
  title: string;
  status: number;
  code: string;
  traceId: string;
  detail?: string;
  errors?: { pointer: string; code: string }[];
}

/** Types a response body as a Problem Details document (supertest bodies are `any`). */
export const problemOf = (response: { body: unknown }): Problem => response.body as Problem;
