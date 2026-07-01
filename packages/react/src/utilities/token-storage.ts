//The key the token is stored under in the browser.
const TOKEN_KEY = 'veneer.token';

//Reads the saved token, or returns null when there is none.
//Returns null on the server where there is no localStorage.
export const readStoredToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(TOKEN_KEY);
};

//Saves the token, or clears it when given null.
export const writeStoredToken = (token: string | null): void => {
  if (typeof window === 'undefined') {
    return;
  }

  if (token === null) {
    window.localStorage.removeItem(TOKEN_KEY);
  } else {
    window.localStorage.setItem(TOKEN_KEY, token);
  }
};
