# OpenClawd Obsidian Theme

An offline-safe Obsidian theme for OpenClawd notes and agent runbooks.

The theme follows Obsidian community theme rules:

- Uses CSS variables where possible.
- Keeps selectors low specificity.
- Does not load remote fonts, images, or CSS.
- Embeds its icon as a local CSS data URL.
- Avoids `!important` so users can override styles with snippets.

## Install Locally

Copy `manifest.json` and `theme.css` into an Obsidian vault theme folder:

```bash
mkdir -p "/path/to/vault/.obsidian/themes/OpenClawd"
cp manifest.json theme.css "/path/to/vault/.obsidian/themes/OpenClawd/"
```

Then enable `OpenClawd` from Obsidian Settings > Appearance > Themes.

## Release

The repository workflow creates a draft release when a tag is pushed. The tag
should match the version in `manifest.json`.

```bash
git tag -a 1.0.0 -m "1.0.0"
git push origin 1.0.0
```
