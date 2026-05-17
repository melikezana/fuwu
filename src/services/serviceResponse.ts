export type ServiceResponse<T> = {
  data: T | null;
  error: string | null;
};

export function createServiceSuccess<T>(data: T): ServiceResponse<T> {
  return {
    data,
    error: null,
  };
}

export function createServiceFailure<T>(error: string): ServiceResponse<T> {
  return {
    data: null,
    error,
  };
}
