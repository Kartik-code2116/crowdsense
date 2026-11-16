const errorHandler = (err, req, res, next) => {
  console.error('[API Gateway Error]', err.stack || err.message);

  const statusCode = err.code === 'LIMIT_FILE_SIZE' ? 413 : (err.statusCode || err.status || (res.statusCode === 200 ? 500 : res.statusCode));
  res.status(statusCode).json({
    success: false,
    message: statusCode === 413 ? 'Upload is too large. The maximum image size is 10 MB.' : (err.message || 'Internal Server Error'),
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
};

module.exports = errorHandler;
