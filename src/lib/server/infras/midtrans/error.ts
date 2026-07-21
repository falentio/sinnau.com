export class MidtransError extends Error {
  statusCode: string;
  statusMessage: string;

  constructor(statusCode: string, statusMessage: string) {
    super(`Midtrans API error (${statusCode}): ${statusMessage}`);
    this.name = "MidtransError";
    this.statusCode = statusCode;
    this.statusMessage = statusMessage;
  }
}
