declare module "@opencode-ai/plugin" {
  export type Plugin = (context: any) => Promise<Record<string, any>> | Record<string, any>;

  export const tool: {
    (definition: {
      description: string;
      args: Record<string, any>;
      execute: (args: any, context: any) => Promise<string> | string;
    }): any;
    schema: any;
  };
}
