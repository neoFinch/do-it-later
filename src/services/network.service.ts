export const OFFLINE_ERROR_MESSAGE = "You're offline. Connect to the internet and try again.";

export const isNetworkOnline = (): boolean => {
  if (typeof navigator === 'undefined') {
    return true;
  }
  return navigator.onLine;
};

export const assertNetworkOnline = (): void => {
  if (!isNetworkOnline()) {
    throw new Error(OFFLINE_ERROR_MESSAGE);
  }
};
