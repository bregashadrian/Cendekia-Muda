export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function notFound(req, res, next) {
  next(new HttpError(404, 'NOT_FOUND', 'Alamat yang diminta tidak ditemukan.'));
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Server belum dapat memproses permintaan.';

  if (error instanceof HttpError) {
    status = error.status;
    code = error.code;
    message = error.message;
  } else if (error.type === 'entity.parse.failed') {
    status = 400;
    code = 'INVALID_JSON';
    message = 'Format JSON tidak valid.';
  } else if (error.type === 'entity.too.large') {
    status = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'Ukuran data permintaan melebihi batas 100 KB.';
  } else if ([400, 403, 404, 405, 415, 416].includes(error.status)) {
    status = error.status;
    code = 'REQUEST_REJECTED';
    message = 'Permintaan atau berkas tidak dapat diakses.';
  }

  if (status >= 500) console.error('Kesalahan server:', error);
  res.status(status).json({ error: { code, message } });
}
