# League of Splatties Boss Art Notes

Use these requirements when creating boss art for the Stream Dock Boss Library.

- Portrait canvas: 1200x1800.
- PNG or WebP.
- Transparent or clean background.
- Full boss visible with safe margins.
- Do not crop head, arms, weapons, props, or silhouette.
- Do not bake in text, rank labels, HP bars, card UI, usernames, or stats.
- The overlay renders the boss/card UI separately.
- Boss art should fit cleanly with `object-fit: contain`.

Large uploaded images can make localStorage or Gist payloads too large. If GitHub rejects the sync payload, host the art as a repo asset and paste the URL/path into the Boss Art field instead.
