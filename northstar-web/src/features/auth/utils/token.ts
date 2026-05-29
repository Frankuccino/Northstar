const TOKEN_KEY = "northstar_token";

export const setToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

// getToken

// setToken

// removeToken
