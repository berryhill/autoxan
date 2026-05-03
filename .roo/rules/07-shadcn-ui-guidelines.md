# shadcn/ui Component Guidelines

## Overview

This project uses **shadcn/ui** for all UI components. shadcn/ui provides accessible, customizable components built on Radix UI primitives with Tailwind CSS styling.

## CRITICAL: Use shadcn/ui Components

**ALWAYS use shadcn/ui components instead of creating custom primitives.** This ensures consistency, accessibility, and maintainability across the codebase.

## Finding Documentation

### Using Context7 MCP

When you need shadcn/ui documentation, use the Context7 MCP:

```xml
<use_mcp_tool>
<server_name>context7</server_name>
<tool_name>resolve-library-id</tool_name>
<arguments>
{
  "libraryName": "shadcn-ui"
}
</arguments>
</use_mcp_tool>
```

Then fetch docs for specific topics:

```xml
<use_mcp_tool>
<server_name>context7</server_name>
<tool_name>get-library-docs</tool_name>
<arguments>
{
  "context7CompatibleLibraryID": "/shadcn-ui/ui",
  "topic": "button"
}
</arguments>
</use_mcp_tool>
```

### Using DuckDuckGo Search MCP

For latest updates or examples:

```xml
<use_mcp_tool>
<server_name>ddg-search</server_name>
<tool_name>search</tool_name>
<arguments>
{
  "query": "shadcn/ui dialog component Next.js",
  "max_results": 5
}
</arguments>
</use_mcp_tool>
```

## Component Location

All UI primitives are located in: `app/src/components/ui/`

## Adding New Components

When a shadcn/ui component is needed but not installed:

```bash
cd app && npx shadcn@latest add <component-name>
```

### Examples

```bash
# Add a single component
npx shadcn@latest add button

# Add multiple components
npx shadcn@latest add dialog input label

# Add form components (includes react-hook-form + zod)
npx shadcn@latest add form
```

## Required Usage Pattern

### ❌ DON'T Create Custom Primitives

```tsx
// BAD - custom button
<button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
  Click me
</button>

// BAD - custom input
<input className="w-full px-3 py-2 border rounded-lg focus:ring-2" />

// BAD - custom modal
<div className="fixed inset-0 bg-black/50">
  <div className="bg-white rounded-lg p-6">...</div>
</div>

// BAD - custom alert
<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
  Error message
</div>
```

### ✅ DO Use shadcn/ui Components

```tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

// GOOD - Button with variants
<Button>Click me</Button>
<Button variant="outline" size="sm">Secondary</Button>
<Button variant="destructive">Delete</Button>

// GOOD - Input
<Input placeholder="Enter text" />

// GOOD - Dialog
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Modal Title</DialogTitle>
    </DialogHeader>
    {/* content */}
  </DialogContent>
</Dialog>

// GOOD - Alert
<Alert variant="destructive">
  <AlertDescription>Error message</AlertDescription>
</Alert>
```

## Currently Installed Components

| UI Element | Component | Import Path |
|------------|-----------|-------------|
| Button | `<Button />` | `@/components/ui/button` |

> **Note**: Check `app/src/components/ui/` for the current list of installed components.

## Components to Install When Needed

| UI Element | Command | Use Case |
|------------|---------|----------|
| Input | `npx shadcn@latest add input` | Text inputs |
| Label | `npx shadcn@latest add label` | Form labels |
| Select | `npx shadcn@latest add select` | Dropdown selects |
| Checkbox | `npx shadcn@latest add checkbox` | Checkboxes |
| Alert | `npx shadcn@latest add alert` | Alerts/notifications |
| Card | `npx shadcn@latest add card` | Card containers |
| Dialog | `npx shadcn@latest add dialog` | Modals/dialogs |
| Table | `npx shadcn@latest add table` | Data tables |
| Badge | `npx shadcn@latest add badge` | Status badges |
| Avatar | `npx shadcn@latest add avatar` | User avatars |
| Progress | `npx shadcn@latest add progress` | Progress bars |
| Separator | `npx shadcn@latest add separator` | Visual separators |
| DropdownMenu | `npx shadcn@latest add dropdown-menu` | Dropdown menus |
| Form | `npx shadcn@latest add form` | Form with validation |
| Sonner | `npx shadcn@latest add sonner` | Toast notifications |

## Using the `cn()` Utility

Always use the `cn()` utility for merging class names:

```tsx
import { cn } from "@/lib/utils";

// Merge base classes with conditional classes
<Button className={cn("w-full", isActive && "bg-green-500")}>
  Submit
</Button>

// Override component defaults
<div className={cn(
  "rounded-lg border p-4",
  variant === "error" && "border-destructive bg-destructive/10"
)}>
  Content
</div>

// Conditional styling
<span className={cn(
  "text-sm",
  status === "active" ? "text-green-600" : "text-muted-foreground"
)}>
  {status}
</span>
```

## CSS Variables for Theming

Colors are defined in `globals.css` using HSL values. Use these semantic colors:

| Variable | Tailwind Class | Usage |
|----------|----------------|-------|
| `--primary` | `bg-primary`, `text-primary` | Primary brand color |
| `--primary-foreground` | `text-primary-foreground` | Text on primary |
| `--secondary` | `bg-secondary`, `text-secondary` | Secondary color |
| `--destructive` | `bg-destructive`, `text-destructive` | Error/danger states |
| `--muted` | `bg-muted`, `text-muted-foreground` | Muted/subtle content |
| `--accent` | `bg-accent`, `text-accent-foreground` | Accent highlights |
| `--background` | `bg-background` | Page background |
| `--foreground` | `text-foreground` | Default text |
| `--border` | `border-border` | Border color |
| `--input` | `border-input` | Input borders |
| `--ring` | `ring-ring` | Focus rings |

### Example Usage

```tsx
// Use semantic colors instead of arbitrary colors
// ❌ BAD
<div className="bg-gray-100 text-gray-900">

// ✅ GOOD
<div className="bg-muted text-foreground">

// ❌ BAD
<button className="bg-blue-600 hover:bg-blue-700">

// ✅ GOOD
<Button variant="default">
```

## Icon Library (lucide-react)

Use **lucide-react** for icons. Do NOT use other icon libraries.

```tsx
import { Loader2, Check, X, Mail, Lock, AlertCircle } from "lucide-react";

// Loading spinner in button
<Button disabled={loading}>
  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  Submit
</Button>

// Status icons
<Check className="h-4 w-4 text-green-500" />
<X className="h-4 w-4 text-destructive" />

// With alerts
<AlertCircle className="h-4 w-4" />
```

### Icon Sizing Convention

| Size | Class | Usage |
|------|-------|-------|
| Small | `h-4 w-4` | Inside buttons, inline text |
| Medium | `h-5 w-5` | Standard standalone |
| Large | `h-6 w-6` | Headers, prominent icons |

## Form Handling

For forms with validation, use shadcn/ui Form with react-hook-form and zod:

```bash
cd app && npx shadcn@latest add form
```

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const formSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

function LoginForm() {
  const form = useForm({
    resolver: zodResolver(formSchema),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
```

## Accessibility

All shadcn/ui components built on Radix UI include:

- ✅ Keyboard navigation
- ✅ ARIA attributes
- ✅ Focus management
- ✅ Screen reader support

**DO NOT** override accessibility features unless absolutely necessary.

## Button Variants Quick Reference

| Variant | Usage |
|---------|-------|
| `default` | Primary actions |
| `destructive` | Delete, dangerous actions |
| `outline` | Secondary actions |
| `secondary` | Less prominent actions |
| `ghost` | Subtle actions, toolbars |
| `link` | Navigation links |

| Size | Usage |
|------|-------|
| `default` | Standard buttons |
| `sm` | Compact/dense UIs |
| `lg` | Prominent actions |
| `icon` | Icon-only buttons |

## Summary: Do's and Don'ts

| ❌ DON'T | ✅ DO |
|----------|-------|
| Create custom button components | Use `<Button />` from shadcn/ui |
| Create custom input components | Use `<Input />` from shadcn/ui |
| Create custom modal components | Use `<Dialog />` from shadcn/ui |
| Use arbitrary Tailwind colors | Use CSS variable-based colors |
| Use random icon libraries | Use lucide-react icons |
| Manually handle class conflicts | Use `cn()` utility function |
| Override accessibility features | Keep Radix UI defaults |

## Documentation Reference

- [UI Library Documentation](../../docs/components/ui-library.md) - Detailed component documentation
- [shadcn/ui Official Docs](https://ui.shadcn.com/docs) - Official documentation
- [Radix UI Primitives](https://www.radix-ui.com/primitives) - Underlying primitives
- [Lucide Icons](https://lucide.dev/icons/) - Icon browser
