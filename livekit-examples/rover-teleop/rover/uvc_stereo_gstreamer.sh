gst-launch-1.0 -v v4l2src device=/dev/video2 io-mode=2 ! \
    video/x-raw,format=YUY2,width=1600,height=600,framerate=30/1,colorimetry=2:4:16:1 !  \
    videoconvert ! video/x-raw,format=NV12 ! \
    v4l2h264enc extra-controls="controls,repeat_sequence_header=1" ! \
    "video/x-h264,profile=baseline,level=(string)4" ! \
    h264parse config-interval=1 ! \
    queue max-size-buffers=1 max-size-bytes=0 max-size-time=0 ! \
    tcpserversink host=0.0.0.0 port=5004 sync=false async=false