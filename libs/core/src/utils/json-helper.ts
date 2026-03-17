export const parseJson = <T = unknown, F = null>(json: string, returnOnError: F) : T | F => {
  try {
    return JSON.parse(json) as T;
  } catch {
    return returnOnError;
  }
}
