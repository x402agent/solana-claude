# Settings Plugin Template

A template demonstrating plugin settings for user configuration (API keys, preferences, etc.).

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Server runs at http://localhost:3400

## Features

- ✅ Settings schema in manifest
- ✅ API key authentication example
- ✅ Server-side settings retrieval
- ✅ Settings validation
- ✅ Error handling for missing settings

## Structure

```
settings/
├── api/
│   ├── gateway.ts           # Plugin gateway
│   └── search.ts            # API with settings
├── public/
│   ├── manifest-dev.json    # Manifest with settings schema
│   └── manifest.json        # Production manifest
├── package.json
├── tsconfig.json
├── vercel.json
└── README.md
```

## How Settings Work

### 1. Define Settings Schema in Manifest

```json
{
  "settings": {
    "type": "object",
    "required": ["API_KEY"],
    "properties": {
      "API_KEY": {
        "title": "API Key",
        "description": "Your service API key",
        "type": "string",
        "format": "password",
        "minLength": 32
      },
      "PREFERENCE": {
        "title": "Default Language",
        "type": "string",
        "enum": ["en", "es", "fr"],
        "default": "en"
      }
    }
  }
}
```

### 2. Retrieve Settings on Server

```typescript
import { getPluginSettingsFromRequest, createErrorResponse, PluginErrorType } from '@solana-clawd/plugin-sdk';

export default async (req: Request) => {
  const settings = getPluginSettingsFromRequest<Settings>(req);
  
  if (!settings?.API_KEY) {
    // Triggers the settings configuration UI
    return createErrorResponse(PluginErrorType.PluginSettingsInvalid, {
      message: 'API key is required',
    });
  }
  
  // Use settings.API_KEY in your API call
};
```

### 3. User Configures Settings

When the user installs the plugin, solana-clawd shows a settings form based on your schema.

## Settings Schema Properties

| Property | Description |
|----------|-------------|
| `type` | Always "object" |
| `required` | Array of required field names |
| `properties` | Object defining each setting field |

### Field Properties

| Property | Description | Example |
|----------|-------------|---------|
| `title` | Display label | "API Key" |
| `description` | Help text | "Get your key at..." |
| `type` | Data type | "string", "number", "boolean" |
| `format` | Input format | "password" (masks input) |
| `enum` | Dropdown options | ["option1", "option2"] |
| `default` | Default value | "en" |
| `minLength` | Min string length | 32 |
| `maxLength` | Max string length | 64 |

## Error Handling

When settings are invalid or missing:

```typescript
return createErrorResponse(PluginErrorType.PluginSettingsInvalid, {
  message: 'Please configure your API key in plugin settings',
});
```

This displays an error card prompting the user to configure settings.

## Security Notes

- Settings are passed via HTTP headers (`X-solana-clawd-Plugin-Settings`)
- Use `format: "password"` for sensitive values
- Never log or expose settings in responses
- Validate settings server-side before use

