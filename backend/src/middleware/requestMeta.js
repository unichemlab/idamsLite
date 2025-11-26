/**
 * Middleware to capture request metadata and attach to req._meta
 */
const requestMetadata = (req, res, next) => {
  // Get IP address, handling proxies
  const ip =
    (req.headers["x-forwarded-for"] || "").split(",").pop() ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.connection.socket?.remoteAddress;

  // Get user agent
  const userAgent = req.headers["user-agent"];

  // Get referrer
  const referrer = req.headers.referer || req.headers.referrer;

  // Get device info from user agent
  const isMobile = /mobile/i.test(userAgent);
  const isTablet = /tablet/i.test(userAgent);
  const isDesktop = !isMobile && !isTablet;

  // Get browser info from user agent
  const browser = {
    chrome: /chrome/i.test(userAgent),
    firefox: /firefox/i.test(userAgent),
    safari: /safari/i.test(userAgent),
    edge: /edge/i.test(userAgent),
    ie: /msie|trident/i.test(userAgent),
    opera: /opera|opr/i.test(userAgent),
  };

  // Attach metadata to request object
  req._meta = {
    ip,
    userAgent,
    referrer,
    device: {
      isMobile,
      isTablet,
      isDesktop,
    },
    browser,
    timestamp: new Date().toISOString(),
    url: req.originalUrl || req.url,
    method: req.method,
  };

  next();
};

module.exports = requestMetadata;
