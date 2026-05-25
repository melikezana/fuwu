export type ServiceResponse<T> = {
  data: T | null;
  error: string | null;
  success: boolean;
};

export function createServiceSuccess<T>(data: T): ServiceResponse<T> {
  return {
    data,
    error: null,
    success: true,
  };
}

export function createServiceFailure<T>(error: string): ServiceResponse<T> {
  return {
    data: null,
    error,
    success: false,
  };
}
