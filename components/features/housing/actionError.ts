type ActionFailure = {
  success?: boolean;
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
  DATABASE_ERROR: "Unable to save your changes. Please try again.",
  EXTERNAL_SERVICE_ERROR:
    "An external service dependency failed. Please retry shortly.",
  UNKNOWN_ERROR: "Something unexpected failed. Please retry.",
};

export function getHousingActionErrorMessage(failure: ActionFailure): string {
  if (failure.success === false || !!failure.error) {
    const isDev = process.env.NODE_ENV !== "production";
    if (isDev) {
      console.error("[HousingAction] action failed", failure);
    } else {
      console.error("[HousingAction] action failed", {
        success: failure.success,
        errorCode: failure.errorCode,
      });
    }
  }

  if (failure.errorCode && ERROR_MESSAGE_BY_CODE[failure.errorCode]) {
    return ERROR_MESSAGE_BY_CODE[failure.errorCode];
  }

  return ERROR_MESSAGE_BY_CODE.UNKNOWN_ERROR;
}
