<a href="https://livekit.io/">
  <img src="./.github/assets/livekit-mark.png" alt="LiveKit logo" width="100" height="100">
</a>

# LiveKit Examples Renovate Config

This is a shared [renovate](https://github.com/renovatebot/renovate) configuration for all LiveKit example repositories. It enables automatic dependency management as follows:

- **LiveKit dependencies**: `minor` and `patch` updates are automerged, `major` updates will trigger a PR at any time
- **Production dependencies**: `minor` and `patch` updates are grouped in a weekly PR, `major` updates will trigger a PR at any time
- **Development dependencies**: `minor` and `patch` updates are grouped in a monthly PR, `major` updates will trigger a PR at any time

## Repository Setup

Add a `renovate.json` file to the root of your repository with the following content:

```json
{
  "extends": ["github>livekit-examples/renovate-config"]
}
```
