import { getSmsProvider, MockSmsProvider } from "../src/lib/sms";

async function main() {
  process.env.SMS_PROVIDER = "mock";

  const provider = getSmsProvider();

  if (!(provider instanceof MockSmsProvider)) {
    throw new Error("SMS factory did not return MockSmsProvider.");
  }

  const result = await provider.sendOtp("+905550000000", "123456");

  if (!result.ok) {
    throw new Error(result.error ?? "Mock SMS provider returned a failure.");
  }

  console.log("Mock SMS provider test passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
