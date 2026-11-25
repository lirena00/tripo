export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly message: string,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof Error) return new ApiError(500, error.message)
  return new ApiError(500, 'Unknown error')
}

export function errorResponse(error: unknown): Response {
  const apiError = toApiError(error)
  return Response.json(
    { error: apiError.message, details: apiError.details },
    { status: apiError.status }
  )
}