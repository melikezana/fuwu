const router = { push: (url: string) => { window.location.hash = url; }, refresh: () => { window.dispatchEvent(new Event("commerce-test-refresh")); } };
export const useRouter = () => router;
