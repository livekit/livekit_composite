# Media Samples

This repository contains media samples for testing purposes.

To use them in docker:
```dockerfile
RUN apt-get update && apt-get install -y git-lfs
RUN git clone --depth 1 https://github.com/livekit/media-samples.git
RUN cd media-samples && git lfs pull
```

## Attribution

This repository contains material originally created by [Netflix](https://opencontent.netflix.com/), 
used under [Creative Commons Attribution 4.0 International License](https://creativecommons.org/licenses/by/4.0/). 
Modifications were made to the original material.
