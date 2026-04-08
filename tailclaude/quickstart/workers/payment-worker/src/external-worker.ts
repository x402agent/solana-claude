// This is an example external worker, its endpoints are being defined
// so that other workers connected to iii can use them.

import { registerWorker } from "iii-sdk";
const iii = registerWorker(
  process.env.III_BRIDGE_URL ?? "ws://localhost:49134",
);

iii.registerFunction({ id: "payment-worker::record" }, async (payload) => {
  // A real worker would be defined like this.
  // const result = await fetch("https://example.com/v1/payments/record", {
  //   method: "POST",
  //   body: JSON.stringify(payload),
  // });
  return {
    status: 200,
    body: { message: "Payment recorded" },
    source: "payment-worker",
  };
});

console.log("Payment worker started - listening for calls");
