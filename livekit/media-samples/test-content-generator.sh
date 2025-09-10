# Copyright 2025 LiveKit, Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

#!/bin/bash

echo "Generating h264 test file..."
ffmpeg -y \
  -f lavfi -r 25 -t 120 -i "color=black:size=1920x1080:rate=25" \
  -loop 1 -t 120 -i livekit-logo.png \
  -filter_complex "\
[0:v]drawtext=fontfile=/Library/Fonts/Arial.ttf:text='%{eif\\:t\\:d}':x=(w-tw)/2:y=(h-th)/2:fontsize=220:fontcolor=white:box=1:boxcolor=0x000000bb,\
drawtext=fontfile=/Library/Fonts/Arial.ttf:text='%{pts\\:hms}':x=w-tw-20:y=20:fontsize=28:fontcolor=white:box=1:boxcolor=0x00000099,\
drawbox=enable='lt(mod(t,1),0.05)':x=0:y=0:w=iw:h=8:color=white@0.85:t=fill[basev];\
[1:v]scale=-1:100[logo];\
[basev][logo]overlay=shortest=1:x=20:y=main_h-overlay_h-20,format=yuv420p[v]" \
  -map "[v]" -an \
  -c:v libx264 -pix_fmt yuv420p -profile:v baseline -level 4.0 -bf 0 \
  -colorspace bt2020nc -color_primaries bt2020 -color_trc smpte2084 -color_range tv \
  -x264-params "keyint=50:min-keyint=50:scenecut=0:ref=1:8x8dct=0:cabac=0:weightp=0" \
  -f h264 avsync_minmotion_livekit_video_1080p25_120s.h264


echo "Generating ogg/opus test file..."
ffmpeg -y \
  -f lavfi -t 120 \
  -i "aevalsrc=exprs='0.12*if(lt(mod(t,1),0.01),(1-cos(2*PI*mod(t,1)/0.01))/2*sin(2*PI*(600+20*floor(t))*t),0) | 0.12*if(lt(mod(t,1),0.01),(1-cos(2*PI*mod(t,1)/0.01))/2*sin(2*PI*(600+20*floor(t))*t),0)':s=48000:channel_layout=stereo" \
  -f lavfi -t 120 \
  -i "aevalsrc=exprs='0.02*sin(2*PI*440*t) | 0.02*sin(2*PI*440*t)':s=48000:channel_layout=stereo" \
  -filter_complex "[0:a][1:a]amix=inputs=2:normalize=0, aformat=channel_layouts=stereo:sample_rates=48000[a]" \
  -map "[a]" -c:a libopus -b:a 128k -ar 48000 -ac 2 \
  avsync_minmotion_livekit_audio_48k_120s.ogg

echo "Generating vp8 file..."
ffmpeg -y \
  -f lavfi -r 24 -t 120 -i "color=black:size=1920x1080:rate=24" \
  -loop 1 -t 120 -i livekit-logo.png \
  -filter_complex "\
[0:v]drawtext=fontfile=/Library/Fonts/Arial.ttf:text='%{eif\\:t\\:d}':x=(w-tw)/2:y=(h-th)/2:fontsize=220:fontcolor=white:box=1:boxcolor=0x000000bb,\
drawtext=fontfile=/Library/Fonts/Arial.ttf:text='%{pts\\:hms}':x=w-tw-20:y=20:fontsize=28:fontcolor=white:box=1:boxcolor=0x00000099,\
drawbox=enable='lt(mod(t,1),0.05)':x=0:y=0:w=iw:h=8:color=white@0.85:t=fill,format=yuv420p[basev];\
[1:v]scale=-1:100[logo];\
[basev][logo]overlay=shortest=1:x=20:y=main_h-overlay_h-20[v]" \
  -map "[v]" -an \
  -c:v libvpx -pix_fmt yuv420p -r 24 -g 48 -deadline good -speed 4 -threads 4 \
  -f ivf avsync_minmotion_livekit_1080p24_vp8.ivf


echo "Generating vp9 file..."
ffmpeg -y \
  -f lavfi -r 24 -t 120 -i "color=black:size=1920x1080:rate=24" \
  -loop 1 -t 120 -i livekit-logo.png \
  -filter_complex "\
[0:v]drawtext=fontfile=/Library/Fonts/Arial.ttf:text='%{eif\\:t\\:d}':x=(w-tw)/2:y=(h-th)/2:fontsize=220:fontcolor=white:box=1:boxcolor=0x000000bb,\
drawtext=fontfile=/Library/Fonts/Arial.ttf:text='%{pts\\:hms}':x=w-tw-20:y=20:fontsize=28:fontcolor=white:box=1:boxcolor=0x00000099,\
drawbox=enable='lt(mod(t,1),0.05)':x=0:y=0:w=iw:h=8:color=white@0.85:t=fill,format=yuv444p12le[basev];\
[1:v]scale=-1:100[logo];\
[basev][logo]overlay=shortest=1:x=20:y=main_h-overlay_h-20[v]" \
  -map "[v]" -an \
  -c:v libvpx-vp9 -pix_fmt yuv444p12le -profile:v 3 -r 24 -g 48 -row-mt 1 -deadline good -threads 4 \
  -colorspace bt2020nc -color_primaries bt2020 -color_trc smpte2084 -color_range tv \
  -f ivf avsync_minmotion_livekit_1080p24_vp9.ivf

echo "Generating wav file..."
ffmpeg -y \
  -f lavfi -t 120 \
  -i "aevalsrc=exprs='0.12*if(lt(mod(t,1),0.01),(1-cos(2*PI*mod(t,1)/0.01))/2*sin(2*PI*(600+20*floor(t))*t),0) | 0.12*if(lt(mod(t,1),0.01),(1-cos(2*PI*mod(t,1)/0.01))/2*sin(2*PI*(600+20*floor(t))*t),0)':s=48000:channel_layout=stereo" \
  -f lavfi -t 120 \
  -i "aevalsrc=exprs='0.02*sin(2*PI*440*t) | 0.02*sin(2*PI*440*t)':s=48000:channel_layout=stereo" \
  -filter_complex "[0:a][1:a]amix=inputs=2:normalize=0, aformat=sample_fmts=s16:channel_layouts=stereo:sample_rates=48000[a]" \
  -map "[a]" -c:a pcm_s16le \
  avsync_minmotion_livekit_audio_48k_120s.wav