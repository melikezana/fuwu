export function createClient() {
  return {
    auth: {
      async getUser() {
        return {
          data: {
            user: {
              id: "storybook-user",
            },
          },
          error: null,
        };
      },
    },
    channel() {
      return {
        on() {
          return this;
        },
        subscribe() {
          return this;
        },
      };
    },
    async removeChannel() {
      return "ok";
    },
  };
}

export function createSupabaseBrowserClient() {
  return createClient();
}
