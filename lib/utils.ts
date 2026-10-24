export { cn } from "cn"

// "Harbourline Customs" → "Harbourline Customs'", "Northgate Freight" → "Northgate Freight's".
export const possessive = (name: string) => (name.endsWith("s") ? `${name}'` : `${name}'s`);
