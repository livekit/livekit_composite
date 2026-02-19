#!/usr/bin/env bash

# from https://media.xiph.org/video/derf/

mkdir -p source_videos
cd source_videos

mkdir -p conferencing_720p
pushd conferencing_720p
curl --compressed https://media.xiph.org/video/derf/webm/FourPeople_1280x720_60.webm --output FourPeople_1280x720_60.webm
curl --compressed https://media.xiph.org/video/derf/webm/Johnny_1280x720_60.webm --output Johnny_1280x720_60.webm
curl --compressed https://media.xiph.org/video/derf/webm/KristenAndSara_1280x720_60.webm --output KristenAndSara_1280x720_60.webm
curl --compressed https://media.xiph.org/video/derf/webm/vidyo4_720p_60fps.webm --output vidyo4_720p_60fps.webm
popd

mkdir -p natural_1080p
pushd natural_1080p
curl --compressed https://media.xiph.org/video/derf/y4m/in_to_tree_1080p50.y4m --output in_to_tree_1080p50.y4m
curl --compressed https://media.xiph.org/video/derf/y4m/aspen_1080p.y4m --output aspen_1080p.y4m
curl --compressed https://media.xiph.org/video/derf/y4m/rush_hour_1080p25.y4m --output rush_hour_1080p25.y4m
popd

mkdir -p gaming_1080p
pushd gaming_1080p
curl --compressed https://media.xiph.org/video/derf/twitch/y4m/MINECRAFT.y4m --output MINECRAFT.y4m
curl --compressed https://media.xiph.org/video/derf/twitch/y4m/WITCHER3.y4m --output WITCHER3.y4m
curl --compressed https://media.xiph.org/video/derf/twitch/y4m/GTAV.y4m --output GTAV.y4m
popd

mkdir -p sports_1080p
pushd sports_1080p
curl https://media.xiph.org/video/derf/y4m/rush_field_cuts_1080p.y4m --output rush_field_cuts_1080p.y4m
echo 'additionally uses the following clips that are not public domain. please acquire a license to download the files'
echo '  https://www.storyblocks.com/video/stock/professional-soccer-match-hcd8vkodlk8rlj1vk'
echo '  https://www.storyblocks.com/video/stock/aldridge-offensive-rebound-and-score-rqbattivuk8rlwcug'
popd
