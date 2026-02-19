#!/usr/bin/env python3

import argparse
import json
import math
import os
import re
import subprocess
import sys
import time
from os import path


def main():
    parser = argparse.ArgumentParser(
        prog='webrtc-vmaf',
    )
    parser.add_argument('input', nargs='+')
    parser.add_argument('--codec', default='h264')
    parser.add_argument('--framerate', default=30, type=int)
    parser.add_argument('--width', type=int)
    parser.add_argument('--height', type=int)
    parser.add_argument('--bitrate', action="append", type=int, required=True)
    args = parser.parse_args()

    for bitrate in args.bitrate:
        print(f"computing VMAF for {args.codec} at {bitrate}")
        # scores between different files
        score_total = 0
        fps_total = 0
        bitrate_total = 0
        for input in args.input:
            score, fps, out_bitrate = vmaf_for_input(input,
                                        codec=args.codec,
                                        bitrate=bitrate,
                                        framerate=args.framerate,
                                        width=args.width,
                                        height=args.height,
                                        )
            print(f"  {path.basename(input)}: {score} \tfps: {math.floor(fps)}\t bitrate: {out_bitrate/1000}kb/s")
            score_total += score
            fps_total += fps
            bitrate_total += out_bitrate
        num_inputs = len(args.input)
        avg_fps = 0
        if num_inputs > 0:
            avg_fps = math.floor(fps_total / num_inputs)
        if num_inputs > 1:
            print(f"average VMAF: {score_total / num_inputs} \tfps: {avg_fps}\t bitrate: {bitrate_total / num_inputs}")
        else:
            print(f"VMAF: {score_total} \tfps: {avg_fps}\t bitrate: {bitrate_total/1000}kb/s")


def vmaf_for_input(input, codec, bitrate, framerate, width=None, height=None):
    """encodes a version of input with specified encoding and bitrate, returning its VMAF score"""
    width, height, duration, _ = get_video_info(input, width, height)

    os.makedirs('tmp_vmaf', exist_ok=True)
    basename = path.basename(input)
    file_name, _ = path.splitext(basename)
    video_output = path.join(
        'tmp_vmaf', f'{file_name}_{codec}_{width}x{height}_{bitrate}.mkv')
    image_output = path.join(
        'tmp_vmaf', f'{file_name}_{codec}_{width}x{height}_{bitrate}.jpeg')

    start_time = time.time()
    encode_file(input, video_output,
                codec=codec,
                width=width,
                height=height,
                bitrate=bitrate,
                framerate=framerate,
                )
    time_spent = time.time() - start_time

    capture_snapshot(video_output, image_output)

    score = compute_vmaf(input, video_output,
                         width=width,
                         height=height,
                         framerate=framerate,
                         )

    _, _, _, bitrate = get_video_info(video_output, None, None)
    return (score, (duration * framerate) / time_spent, bitrate)


def get_video_info(input, width, height):
    command = [
        'ffprobe',
        '-v', 'error',
        '-show_format',
        '-show_streams',
        '-select_streams', 'v:0',
        '-of', 'json',
        input
    ]

    output = subprocess.run(command, capture_output=True, text=True)

    if output.returncode != 0:
        raise Exception(
            f"Error running ffprobe (exit {output.returncode}): {output.stderr or output.stdout}"
        )

    output_json = json.loads(output.stdout)
    if not width:
        width = output_json['streams'][0]['width']
    if not height:
        height = output_json['streams'][0]['height']
    duration = '0'
    bitrate = '0'
    if 'duration' in output_json['streams'][0]:
        duration = output_json['streams'][0]['duration']
    elif 'duration' in output_json['format']:
        duration = output_json['format']['duration']

    if 'bit_rate' in output_json['format']:
        bitrate = output_json['format']['bit_rate']
    return width, height, float(duration), int(bitrate)


def encode_file(input, output, codec, width, height, bitrate, framerate):
    bitrate_str = f'{bitrate}K'
    filters = f'fps={framerate},scale={width}x{height}:flags=bicubic,format=yuv420p'

    threads = int((width * height + 640*480-1) / (640*480))

    command = [
        'ffmpeg',
        '-i', input,
        '-filter:v', filters,
        '-threads', f'{threads}',
        '-an',  # This option tells FFmpeg to discard any audio
        '-y',
        '-loglevel', 'error',
        '-c:v',  # codec will follow
    ]

    # match encoding settings to what libwebrtc uses
    # these flags are obtained from libwebrtc source code:
    # https://github.com/webrtc-sdk/webrtc/tree/m104_release/modules/video_coding/codecs
    if codec == 'h264':
        # libwebrtc bundles OpenH264, which isn't available with FFmpeg
        # using libx264 as a substitute
        command.extend([
            'libx264',
            '-preset', 'veryfast',
            '-rc-lookahead', '0',
            '-profile:v', 'baseline',
            '-maxrate', bitrate_str,
            '-bufsize', f'{bitrate}K',
        ])
    elif codec == 'h264_zerolatency':
        # libwebrtc bundles OpenH264, which isn't available with FFmpeg
        # using libx264 as a substitute
        command.extend([
            'libx264',
            '-preset', 'veryfast',
            '-tune', 'zerolatency',
            '-profile:v', 'baseline',
            '-maxrate', bitrate_str,
            '-bufsize', f'{bitrate}K',
        ])
    elif codec == 'h265':
        command.extend([
            'libx265',
            '-preset', 'veryfast',
            '-b:v', bitrate_str,
            '-maxrate', bitrate_str,
            '-bufsize', f'{bitrate}K',
            '-x265-params', f'bframes=0:rc-lookahead=0:vbv-maxrate={bitrate}:vbv-bufsize={bitrate}:repeat-headers=1',
        ])
    elif codec == 'vp8':
        command.extend([
            'libvpx',
            '-b:v', bitrate_str,
            '-minrate', bitrate_str,
            '-maxrate', bitrate_str,
            '-deadline', 'realtime',
            # default complexity speed
            # https://github.com/webrtc-sdk/webrtc/blob/m104_release/modules/video_coding/codecs/vp8/libvpx_vp8_encoder.cc#L593C8-L593C25
            '-cpu-used', '-6',
            '-qmax', '52',
            '-qmin', '2',
            '-bufsize', f'{bitrate}K',
        ])
    elif codec == 'vp9':
        command.extend([
            'libvpx-vp9',
            '-b:v', bitrate_str,
            '-minrate', bitrate_str,
            '-maxrate', bitrate_str,
            '-deadline', 'realtime',
            # Chrome's performance settings varies, but most resolutions, it
            # uses 7: https://github.com/webrtc-sdk/webrtc/blob/m104_release/modules/video_coding/codecs/vp9/libvpx_vp9_encoder.cc#L2013
            '-speed', '7',
            '-row-mt', '1',
            '-tile-columns', '3',
            '-tile-rows', '1',
            '-frame-parallel', '1',
            '-qmax', '52',
            '-qmin', '2',
        ])
    elif codec == 'av1':
        command.extend([
            'libaom-av1',
            '-b:v', bitrate_str,
            '-usage', 'realtime',
            '-minrate', bitrate_str,
            '-maxrate', bitrate_str,
            '-cpu-used', '8',
            '-row-mt', '1',
            '-qmax', '52',
            '-qmin', '10',
            '-aq-mode', '3',
            '-enable-global-motion', '0',
            '-enable-intrabc', '0',
            '-enable-restoration', '0',
            '-enable-interintra-comp', '0',
            '-enable-interintra-wedge', '0',
            '-refs', '3',
        ])
        if height >= 360:
            command.extend(['-tile-columns', '3'])
    else:
        raise Exception(
            "Unsupported codec. Please use one of these: 'h264', 'h265', 'vp8', 'vp9', 'av1'")

    command.append(output)

    output = subprocess.run(command, capture_output=True, text=True)

    # Some codecs/libraries (notably x265) write informational logs to stderr.
    # Treat only non-zero exit codes as failures.
    if output.returncode != 0:
        raise Exception(
            f"Error running ffmpeg to encode (exit {output.returncode}): {output.stderr or output.stdout}"
        )


def compute_vmaf(input, output, width, height, framerate):
    command = [
        'ffmpeg',
        '-i', input,
        '-i', output,
        '-filter_complex', f'[0:v]fps={framerate},scale={width}x{height}:flags=bicubic,settb=AVTB,setpts=PTS-STARTPTS[ref];[1:v]fps={framerate},settb=AVTB,setpts=PTS-STARTPTS[distorted];[distorted][ref]libvmaf=n_threads=8',
        '-f', 'null',
        '-',
    ]

    # print(f'running command {" ".join(command)}')
    output = subprocess.run(command, capture_output=True, text=True)
    match = re.search(r"VMAF score: (\d+\.\d+)", output.stderr)
    if match:
        score = float(match.group(1))
        return score
    else:
        raise Exception(f"No score found in the string: {output.stderr}")


def capture_snapshot(input, output):
    command = [
        'ffmpeg',
        '-ss', '00:00:05.000',
        '-i', input,
        '-vframes', '1',
        '-y',
        '-loglevel', 'error',
        output,
    ]

    output = subprocess.run(command, capture_output=True, text=True)

    if output.returncode != 0:
        raise Exception(
            f"Error running ffmpeg to create snapshot (exit {output.returncode}): {output.stderr or output.stdout}"
        )


main()
