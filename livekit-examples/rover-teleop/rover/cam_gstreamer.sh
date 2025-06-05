# create a gstreamer pipeline to publish the camera stream to a tcp sink server on port 5004
gst-launch-1.0 -v libcamerasrc ! \
    capsfilter caps=video/x-raw,width=640,height=480,format=NV12,interlace-mode=progressive ! \
    v4l2h264enc extra-controls="controls,repeat_sequence_header=1" ! 'video/x-h264,level=(string)4,profile=baseline' ! \
    h264parse config-interval=1 ! \
    queue max-size-buffers=1 max-size-time=0 max-size-bytes=0 ! \
    tcpserversink host=0.0.0.0 port=5004 sync=false async=false
