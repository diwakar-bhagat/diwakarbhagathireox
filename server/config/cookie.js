const isProd = process.env.NODE_ENV === "production";

export const getCookieOptions = () => {
  const options = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  };

  if (isProd && process.env.COOKIE_DOMAIN) {
    options.domain = process.env.COOKIE_DOMAIN;
  }

  return options;
};

export const getClearCookieOptions = () => {
  const { maxAge, ...options } = getCookieOptions();
  return options;
};
