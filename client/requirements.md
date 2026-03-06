## Packages
react-hook-form | Core form handling
@hookform/resolvers | Zod validation for forms
lucide-react | Icons
framer-motion | Page transitions and list animations
recharts | Statistics visualization
clsx | Utility for constructing className strings
tailwind-merge | Utility for merging tailwind classes

## Notes
Tailwind Config - extend fontFamily:
fontFamily: {
  display: ["var(--font-display)"],
  sans: ["var(--font-sans)"],
}
The app assumes standard Shadcn UI components are available (Button, Input, Card, Dialog, Form, etc.) per the provided environment.
Forms use z.coerce.number() heavily to ensure mobile numeric inputs parse correctly before hitting the API.
