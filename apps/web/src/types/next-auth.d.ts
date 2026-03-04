import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isHuman?: boolean;
      isAgent?: boolean;
      isAdmin?: boolean;
    };
  }

  interface User {
    isHuman?: boolean;
    isAgent?: boolean;
    isAdmin?: boolean;
  }
}
