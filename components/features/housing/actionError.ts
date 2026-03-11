type ActionFailure = {
  error?: string;
  errorCode?: string;
};

const ERROR_MESSAGE_BY_CODE: Record<string, string> = {
  AUTHENTICATION_REQUIRED:
    "Your session expired. Please log in again and retry.",
  INSUFFICIENT_ROLE:
    "You do not have housing admin permissions for this action.",
  VALIDATION_ERROR:
    "Some task details are invalid. Please review the form and retry.",
  DATABASE_ERROR:
    "Unable to save task data to Appwrite. Run `npm run diagnose:staging` and verify environment settings.",
  EXTERNAL_SERVICE_ERROR:
    "An external service dependency failed. Please retry shortly.",
  UNKNOWN_ERROR: "Something unexpected failed. Please retry.",
};

export function getHousingActionErrorMessage(failure: ActionFailure): string {
  if (failure.errorCode && ERROR_MESSAGE_BY_CODE[failure.errorCode]) {
    return ERROR_MESSAGE_BY_CODE[failure.errorCode];
  }

  if (failure.error) {
    return failure.error;
  }

  return "Action failed. Please retry.";
}
