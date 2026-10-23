/**
 * Provider interface for a future, genuine AI integration (e.g. a backend you control).
 * Never place API keys in the browser or VITE_ env variables.
 * The AI must only explain figures computed by ./compute.ts — never do arithmetic itself.
 */
export interface AIProvider {
  readonly name: string;
  isConnected(): boolean;
  ask(question: string, context: { month: string; summaryJson: string }): Promise<string>;
}

export const notConnectedProvider: AIProvider = {
  name: "None",
  isConnected: () => false,
  ask: async () => { throw new Error("AI not connected"); },
};

export const aiProvider: AIProvider = notConnectedProvider;

