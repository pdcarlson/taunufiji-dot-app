export const RECURRING_MUTATION_SCOPES = [
  "this_instance",
  "this_and_future",
  "entire_series",
] as const;

export type RecurringMutationScope = (typeof RECURRING_MUTATION_SCOPES)[number];

export interface RecurringMutationOptions {
  scope: RecurringMutationScope;
  effectiveFromDueAt?: string;
}
