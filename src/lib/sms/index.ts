import { MockSmsProvider } from "./MockSmsProvider";
import { NetgsmSmsProvider } from "./NetgsmSmsProvider";
import type { SmsProvider } from "./types";

export type SmsProviderName = "mock" | "netgsm";

function getRequiredNetgsmEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required when SMS_PROVIDER=netgsm.`);
  }

  return value;
}

export function getSmsProvider(): SmsProvider {
  const provider = (process.env.SMS_PROVIDER ?? "mock")
    .trim()
    .toLocaleLowerCase("tr") as SmsProviderName;

  if (provider === "mock") {
    return new MockSmsProvider();
  }

  if (provider === "netgsm") {
    return new NetgsmSmsProvider({
      header: getRequiredNetgsmEnv("NETGSM_HEADER"),
      password: getRequiredNetgsmEnv("NETGSM_PASSWORD"),
      usercode: getRequiredNetgsmEnv("NETGSM_USERCODE"),
    });
  }

  throw new Error(`Unsupported SMS_PROVIDER value: ${provider}`);
}

export type { SmsProvider, SmsSendResult } from "./types";
export { MockSmsProvider } from "./MockSmsProvider";
export { NetgsmSmsProvider } from "./NetgsmSmsProvider";
