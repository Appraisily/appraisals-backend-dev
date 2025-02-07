function requestLogger(req, res, next) {
  const start = Date.now();
  const { method, url, body, headers } = req;

  // Log request
  console.log(`[${new Date().toISOString()}] ${method} ${url}`);
  
  // Log request body if present
  if (Object.keys(body).length > 0) {
    console.log('Request body:', JSON.stringify(body));
  }

  // Capture response
  const oldSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - start;
    
    console.log(`Response sent in ${duration}ms:`, {
      method,
      url,
      status: res.statusCode,
      duration
    });

    res.send = oldSend;
    return res.send(data);
  };

  next();
}

module.exports = requestLogger;